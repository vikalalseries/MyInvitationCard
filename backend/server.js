const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Resend } = require("resend");
const admin = require("firebase-admin");
const mongoose = require("mongoose");
const { connectDB } = require("./db");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const User = require("./models/User");

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("❌ CRITICAL ERROR: JWT_SECRET environment variable is missing!");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Connect to MongoDB and auto-seed templates if needed
connectDB()
  .then(async () => {
    console.log("MongoDB connected successfully");

    try {
      const Template = require("./models/Template");
      const count = await Template.countDocuments();
      if (count === 0) {
        console.log("Templates collection is empty. Seeding templates from templates.json...");
        const fs = require("fs");
        const path = require("path");
        const templatesJsonPath = path.join(__dirname, "../data/templates.json");
        if (fs.existsSync(templatesJsonPath)) {
          const templatesData = JSON.parse(fs.readFileSync(templatesJsonPath, "utf-8"));
          const templatesToInsert = templatesData.map(t => {
            const isPremium = t.category === "premium";
            return {
              templateId: String(t.id),
              name: t.title,
              category: t.event || "wedding",
              thumbnail: t.thumbnail || "",
              price: 10,
              offerPrice: 8,
              offerLabel: "Order 150+ Get 20% OFF",
              offerStartDate: null,
              offerEndDate: null,
              isFeatured: !!t.featured,
              isPremium: isPremium,
              status: "active",
              files: []
            };
          });
          await Template.insertMany(templatesToInsert);
          console.log(`Successfully auto-seeded ${templatesToInsert.length} templates.`);
        } else {
          console.warn("templates.json file not found at " + templatesJsonPath);
        }
      }
    } catch (seedErr) {
      console.error("Failed to auto-seed templates:", seedErr);
    }
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    console.warn("Backend will continue running, but DB-dependent endpoints may fail until MongoDB becomes available.");
  });

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or file:// protocol)
    if (!origin || origin === "null") {
      return callback(null, true);
    }
    const allowed = [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "http://127.0.0.1:5501",
      "http://localhost:5501",
      "https://myinvitationcard.vercel.app"
    ];
    if (process.env.ALLOWED_ORIGINS) {
      const extraOrigins = process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim());
      allowed.push(...extraOrigins);
    }
    if (allowed.indexOf(origin) !== -1 || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(helmet());
app.use(mongoSanitize());
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

const adminOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many verification attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

const adminResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many password recovery attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const resend = new Resend(process.env.RESEND_API_KEY);

let serviceAccount;
if (process.env.FIREBASE_ADMIN_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_JSON);
  } catch (err) {
    console.error("Failed to parse FIREBASE_ADMIN_JSON env variable:", err.message);
  }
} else {
  try {
    serviceAccount = require("./config/firebase-admin.json");
  } catch (err) {
    console.error("Firebase admin JSON not found. Please set FIREBASE_ADMIN_JSON env variable.");
  }
}

if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin initialized successfully");
  } catch (err) {
    console.error("❌ Failed to initialize Firebase Admin:", err.message);
  }
} else {
  console.warn("⚠️ Firebase Admin credentials not found. Authentication/verification endpoints will fail.");
}

const otpStore = new Map();
const OTP_EXPIRY_MS = 5 * 60 * 1000;

const otpRateLimitStore = new Map();
const MAX_OTP_REQUESTS = 5;
const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;

/*
otpStore format:
email => {
  otp,
  fullName,
  password,
  expiresAt
}
*/

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post("/send-otp", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const now = Date.now();

    const rateRecord = otpRateLimitStore.get(email);

    if (rateRecord) {
      const withinWindow =
        now - rateRecord.firstRequestTime < OTP_RATE_WINDOW_MS;

      if (withinWindow && rateRecord.count >= MAX_OTP_REQUESTS) {
        return res.status(429).json({
          success: false,
          message: "Too many OTP requests. Please try again after 15 minutes."
        });
      }

      if (withinWindow) {
        rateRecord.count++;
      } else {
        otpRateLimitStore.set(email, {
          count: 1,
          firstRequestTime: now
        });
      }

    } else {
      otpRateLimitStore.set(email, {
        count: 1,
        firstRequestTime: now
      });
    }

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const existingUser = await admin.auth().getUserByEmail(email).catch(() => null);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    const otp = generateOTP();

    otpStore.set(email, {
      otp,
      fullName,
      password,
      createdAt: Date.now()
    });

    await resend.emails.send({
      from: "MyInvitationCard <onboarding@resend.dev>",
      to: email,
      subject: "Your Verification Code",
      html: `
        <div style="font-family:Arial;padding:20px;">
          <h2>Verify Your Email</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing:6px;">${otp}</h1>
          <p>This code expires in 5 minutes.</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: "OTP sent"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = otpStore.get(email);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "No verification code found. Please request a new code."
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);

      return res.status(400).json({
        success: false,
        message: "Verification code expired. Please request a new code."
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code."
      });
    }

    const user = await admin.auth().createUser({
      email,
      password: record.password,
      displayName: record.fullName,
      emailVerified: true
    });

    otpStore.delete(email);

    res.json({
      success: true,
      message: "Account created",
      uid: user.uid
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// Get User Profile
app.get("/api/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    let user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create/Update User Profile
app.post("/api/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, email, phone, gender, dob, language, profileImage, addresses } = req.body;

    let user = await User.findOne({ uid });
    if (!user) {
      user = new User({ uid });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (gender !== undefined) user.gender = gender;
    if (dob !== undefined) user.dob = dob;
    if (language !== undefined) user.language = language;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (addresses !== undefined) user.addresses = addresses;

    await user.save();
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const Admin = require("./models/Admin");
const AuditLog = require("./models/AuditLog");
const Template = require("./models/Template");
const SystemSetting = require("./models/SystemSetting");
const Order = require("./models/Order");
const Payment = require("./models/Payment");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");

// Seed default Master Owner and settings
mongoose.connection.once("open", async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const passwordHash = await bcrypt.hash("admin123", 10);
      const defaultAdmin = new Admin({
        username: "admin",
        email: "admin@myinvitationcard.com",
        phone: "+919876543210",
        passwordHash,
        role: "Master Owner",
        permissions: [
          "template.create", "template.edit", "template.delete", "template.publish",
          "pricing.edit", "pricing.view", "payment.view", "payment.refund",
          "orders.update", "orders.view", "users.delete", "users.view",
          "admins.create", "admins.delete", "audit.view"
        ],
        status: "active"
      });
      await defaultAdmin.save();
      console.log("Default Master Owner seeded: admin / admin123");
    }

    const settingsCount = await SystemSetting.countDocuments();
    if (settingsCount === 0) {
      await SystemSetting.create([
        { key: "wedding_price", value: 149 },
        { key: "birthday_price", value: 79 },
        { key: "nikah_price", value: 99 },
        { key: "premium_export_price", value: 49 },
        { key: "printing_price_per_page", value: 20 },
        { key: "tax_rate", value: 18 },
        { key: "shipping_base", value: 40 },
        { key: "min_order_qty", value: 50 },
        { key: "volume_discount_tiers", value: [{upTo:50,discount:0},{upTo:100,discount:5},{upTo:200,discount:10},{upTo:500,discount:15},{upTo:1000,discount:20}] }
      ]);
      console.log("Default pricing settings seeded.");
    }

    const ordersCount = await Order.countDocuments();
    if (ordersCount === 0) {
      await Order.create([
        { orderId: "ORD-12568", uid: "uid_rahul98", templateId: "card101", templateName: "Royal Wedding #18", status: "Printing" },
        { orderId: "ORD-12569", uid: "uid_priya02", templateId: "card102", templateName: "Nikah Royal Gold", status: "Delivered" }
      ]);
      console.log("Default orders seeded.");
    }

    const paymentsCount = await Payment.countDocuments();
    if (paymentsCount === 0) {
      await Payment.create([
        { transactionId: "TXN-98274", razorpayPaymentId: "pay_NZsk892jkdks", uid: "uid_rahul98", amount: 149, status: "Paid" },
        { transactionId: "TXN-98275", razorpayPaymentId: "pay_NZsk892jlasf", uid: "uid_priya02", amount: 99, status: "Paid" }
      ]);
      console.log("Default payments seeded.");
    }
  } catch (err) {
    console.error("Error seeding default values:", err);
  }
});

// Multer ZIP Upload configuration
const storageUpload = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage: storageUpload });

const adminOtpStore = new Map();
const passwordResetStore = new Map();

// Admin Login
app.post("/api/admin/login", adminLoginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    const adminUser = await Admin.findOne({ username });
    if (!adminUser) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    if (adminUser.status !== "active") {
      return res.status(403).json({ success: false, message: "This account has been suspended" });
    }

    // Check account lockout status
    if (adminUser.lockUntil && adminUser.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((adminUser.lockUntil - Date.now()) / (60 * 1000));
      return res.status(403).json({
        success: false,
        message: `This account is temporarily locked. Please try again in ${remainingTime} minutes.`
      });
    }

    const isMatch = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isMatch) {
      adminUser.failedLoginAttempts = (adminUser.failedLoginAttempts || 0) + 1;
      let msg = "Invalid credentials";
      if (adminUser.failedLoginAttempts >= 5) {
        adminUser.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 mins lock
        adminUser.failedLoginAttempts = 0; // Reset counter for next cycle
        msg = "Invalid credentials. This account has been locked for 30 minutes due to consecutive failed attempts.";
      } else {
        const remaining = 5 - adminUser.failedLoginAttempts;
        msg = `Invalid credentials. You have ${remaining} attempts remaining before account lockout.`;
      }
      await adminUser.save();
      return res.status(400).json({ success: false, message: msg });
    }

    // Reset failed counter
    if (adminUser.failedLoginAttempts > 0 || adminUser.lockUntil) {
      adminUser.failedLoginAttempts = 0;
      adminUser.lockUntil = null;
      await adminUser.save();
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    adminOtpStore.set(username, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    console.log(`[ADMIN OTP CODE] for ${username} is ${otp}`);

    try {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Admin Security Verification Code</title>
</head>
<body style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb; overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%); padding: 32px 24px;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 10px;">
                    <span style="font-size: 28px; line-height: 1;">✉️</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px;">
                    <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">MyInvitationCard</h1>
                    <p style="color: #c084fc; font-size: 11px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0 0; letter-spacing: 1px;">Admin Security Portal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px 32px; color: #1f2937;">
              <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 12px; color: #111827; text-align: center;">One-Time Verification Code</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px; text-align: center;">
                A sign-in attempt was detected for your administrator account. Please use the verification code below to authorize this login.
              </p>
              
              <!-- OTP Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="background-color: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 12px; padding: 18px 24px; display: inline-block;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827; margin-left: 8px;">${otp}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; line-height: 1.5; color: #ef4444; font-weight: 600; text-align: center; margin-bottom: 24px;">
                ⚠️ This code will expire in 5 minutes.
              </p>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 13px; line-height: 1.6; color: #6b7280;">
                <p style="margin: 0 0 8px 0; font-weight: 600;">Security Notice:</p>
                <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                  <li>Only share this code with authorized administrators.</li>
                  <li>Our support team will never ask you for this code.</li>
                  <li>If you did not attempt to log in, please secure your password immediately.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 11px; line-height: 1.5; color: #9ca3af; margin: 0 0 8px 0;">
                This is an automated notification from the MyInvitationCard identity verification system.
              </p>
              <p style="font-size: 11px; line-height: 1.5; color: #9ca3af; margin: 0;">
                &copy; 2026 MyInvitationCard. All rights reserved. <br>
                Mumbai, Maharashtra, India.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      await resend.emails.send({
        from: "MyInvitationCard <onboarding@resend.dev>",
        to: adminUser.email,
        subject: "Your Admin Portal OTP Code",
        html: emailHtml
      });
    } catch (e) {
      console.warn("Resend email failed, OTP logged to console instead:", e.message);
    }

    res.json({
      success: true,
      message: "OTP sent to registered email",
      otpRequired: true
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin OTP Verification
app.post("/api/admin/verify-otp", adminOtpLimiter, async (req, res) => {
  try {
    const { username, otp } = req.body;
    const record = adminOtpStore.get(username);

    if (!record) {
      return res.status(400).json({ success: false, message: "No active OTP found. Please request a new login." });
    }

    if (Date.now() > record.expiresAt) {
      adminOtpStore.delete(username);
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP code" });
    }

    adminOtpStore.delete(username);

    const adminUser = await Admin.findOne({ username });
    adminUser.lastLogin = new Date();
    await adminUser.save();

    const audit = new AuditLog({
      username,
      action: "admin.login",
      details: "Admin successfully logged in through 2FA verification"
    });
    await audit.save();

    const token = jwt.sign(
      {
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        permissions: adminUser.permissions
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    // Set secure HttpOnly cookie for session token
    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.json({
      success: true,
      admin: {
        username: adminUser.username,
        email: adminUser.email,
        phone: adminUser.phone,
        role: adminUser.role,
        permissions: adminUser.permissions
      }
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Logout
app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("admin_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });
  res.json({ success: true, message: "Logged out successfully" });
});

// Admin Authentication Middleware
const authenticateAdmin = (req, res, next) => {
  const fullPath = req.originalUrl.split("?")[0];
  const publicPaths = [
    "/api/admin/login",
    "/api/admin/verify-otp",
    "/api/admin/logout",
    "/api/admin/reset-password/request",
    "/api/admin/reset-password/verify",
    "/api/admin/reset-password/complete"
  ];
  if (publicPaths.includes(fullPath)) {
    return next();
  }

  try {
    let token = req.cookies && req.cookies.admin_token;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Access denied. No authentication token provided." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    console.error("JWT Verification failed:", error.message);
    return res.status(401).json({ success: false, message: "Session expired or invalid token. Please log in again." });
  }
};
app.use("/api/admin", authenticateAdmin);

// Password Reset Request
app.post("/api/admin/reset-password/request", adminResetLimiter, async (req, res) => {
  try {
    const { username } = req.body;
    const adminUser = await Admin.findOne({ username });
    if (!adminUser) {
      return res.status(404).json({ success: false, message: "Admin account not found" });
    }

    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const phoneOtp = Math.floor(100000 + Math.random() * 900000).toString();

    passwordResetStore.set(username, {
      emailOtp,
      phoneOtp,
      verifiedEmail: false,
      verifiedPhone: false,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    console.log(`[PASSWORD RESET OTP] Email OTP: ${emailOtp}, Phone OTP: ${phoneOtp}`);

    res.json({
      success: true,
      message: "Reset OTP codes sent.",
      devEmailOtp: emailOtp,
      devPhoneOtp: phoneOtp
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify Password Reset OTPs
app.post("/api/admin/reset-password/verify", async (req, res) => {
  try {
    const { username, emailOtp, phoneOtp } = req.body;
    const record = passwordResetStore.get(username);

    if (!record) {
      return res.status(400).json({ success: false, message: "Reset request expired or not found" });
    }

    if (emailOtp === record.emailOtp) record.verifiedEmail = true;
    if (phoneOtp === record.phoneOtp) record.verifiedPhone = true;

    if (!record.verifiedEmail || !record.verifiedPhone) {
      return res.status(400).json({
        success: false,
        message: `Verification incomplete. Email: ${record.verifiedEmail ? "Verified" : "Pending"}, Phone: ${record.verifiedPhone ? "Verified" : "Pending"}`
      });
    }

    res.json({ success: true, message: "Both OTP codes verified successfully. Proceed to reset password." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete Password Reset
app.post("/api/admin/reset-password/complete", async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    const record = passwordResetStore.get(username);

    if (!record || !record.verifiedEmail || !record.verifiedPhone) {
      return res.status(400).json({ success: false, message: "Reset authorization has expired or not verified" });
    }

    const adminUser = await Admin.findOne({ username });
    adminUser.passwordHash = await bcrypt.hash(newPassword, 10);
    await adminUser.save();

    passwordResetStore.delete(username);

    const audit = new AuditLog({
      username,
      action: "admin.reset_password",
      details: "Admin password successfully reset via secure 2FA"
    });
    await audit.save();

    res.json({ success: true, message: "Password reset completed successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Dashboard Stats
app.get("/api/admin/dashboard-stats", async (req, res) => {
  try {
    const UserCollection = require("./models/User");
    const OrderCollection = require("./models/Order");
    const PaymentCollection = require("./models/Payment");

    // Real collections counts
    const totalUsers = await UserCollection.countDocuments();
    const templatesCount = await Template.countDocuments();
    const totalOrders = await OrderCollection.countDocuments();

    // Total revenue sum
    const payments = await PaymentCollection.find({ status: "Paid" });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Popular template aggregation
    const popular = await OrderCollection.aggregate([
      { $group: { _id: "$templateName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const popularTemplate = popular.length > 0 ? popular[0]._id : "None";

    // Conversion rate
    const conversionRate = totalUsers > 0 
      ? ((totalOrders / totalUsers) * 100).toFixed(1) + "%" 
      : "0%";

    // Get weekly sales for the last 7 days
    const weeklySales = [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayPayments = await PaymentCollection.find({
        status: "Paid",
        createdAt: { $gte: d, $lt: nextDay }
      });
      const revenue = dayPayments.reduce((sum, p) => sum + p.amount, 0);
      weeklySales.push({ day: days[d.getDay()], revenue });
    }

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalOrders: totalOrders || 0,
        totalRevenue: totalRevenue || 0,
        templatesCount: templatesCount || 0,
        popularTemplate,
        conversionRate,
        weeklySales
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Template Upload & ZIP Extraction
app.post("/api/admin/templates/upload", upload.single("templateZip"), async (req, res) => {
  try {
    const { templateId, name, category, price, adminUser } = req.body;
    const zipFile = req.file;

    if (!templateId || !name || !zipFile) {
      return res.status(400).json({ success: false, message: "Missing template details or ZIP file" });
    }

    const storageDir = path.join(__dirname, "../storage/templates", templateId);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const zip = new AdmZip(zipFile.path);
    zip.extractAllTo(storageDir, true);

    const requiredFiles = ["index.html"];
    const missing = requiredFiles.filter(f => !fs.existsSync(path.join(storageDir, f)));

    if (missing.length > 0) {
      fs.rmSync(storageDir, { recursive: true, force: true });
      fs.unlinkSync(zipFile.path);
      return res.status(400).json({ success: false, message: `Invalid template structure. Missing: ${missing.join(", ")}` });
    }

    const getFilesRecursively = (dir, fileList = []) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          getFilesRecursively(filePath, fileList);
        } else {
          fileList.push(path.relative(storageDir, filePath));
        }
      });
      return fileList;
    };
    const extractedFilesList = getFilesRecursively(storageDir);

    let thumbnailPath = "";
    const possibleThumbnails = ["thumbnail.jpg", "thumbnail.png", "thumbnail.jpeg"];
    const foundThumb = possibleThumbnails.find(t => fs.existsSync(path.join(storageDir, t)));
    if (foundThumb) {
      thumbnailPath = `storage/templates/${templateId}/${foundThumb}`;
    } else {
      thumbnailPath = "assets/images/template-placeholder.jpg";
    }

    let template = await Template.findOne({ templateId });
    if (!template) {
      template = new Template({ templateId });
    }
    template.name = name;
    template.category = category || "wedding";
    template.price = Number(price) || 0;
    template.thumbnail = thumbnailPath;
    template.files = extractedFilesList.map(f => `storage/templates/${templateId}/${f}`);
    template.status = "active";

    await template.save();
    fs.unlinkSync(zipFile.path);

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "template.create",
      details: `Uploaded template ${name} (ID: ${templateId})`
    });
    await audit.save();

    res.json({ success: true, message: "Template uploaded and extracted successfully", data: template });
  } catch (error) {
    console.error("Error uploading template:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Audit Logs
app.get("/api/admin/audit-logs", async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/admin/audit-logs", async (req, res) => {
  try {
    const { username, action, details } = req.body;
    const log = new AuditLog({ username, action, details });
    await log.save();
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fetch Users List (Includes Status and Order Count)
app.get("/api/admin/users", async (req, res) => {
  try {
    const UserCollection = require("./models/User");
    const OrderCollection = require("./models/Order");

    // 1. Fetch all users from Firebase Auth
    let firebaseUsers = [];
    try {
      const listUsersResult = await admin.auth().listUsers(100);
      firebaseUsers = listUsersResult.users || [];
    } catch (fbErr) {
      console.error("Failed to list Firebase users:", fbErr);
    }

    // 2. Synchronize Firebase users to MongoDB User collection if they are missing
    for (const fbUser of firebaseUsers) {
      let mongoUser = await UserCollection.findOne({ uid: fbUser.uid });
      if (!mongoUser) {
        mongoUser = new UserCollection({
          uid: fbUser.uid,
          name: fbUser.displayName || "",
          email: fbUser.email || "",
          phone: fbUser.phoneNumber || "",
          createdAt: fbUser.metadata.creationTime ? new Date(fbUser.metadata.creationTime) : new Date()
        });
        await mongoUser.save();
      }
    }

    // 3. Query the MongoDB User collection
    const users = await UserCollection.find().limit(200);
    const usersData = [];

    for (const user of users) {
      // Get number of orders placed
      const ordersCount = await OrderCollection.countDocuments({ uid: user.uid });

      // Get user metadata from Firebase to check if user is active/disabled
      let status = "active";
      const fbUser = firebaseUsers.find(u => u.uid === user.uid);
      if (fbUser) {
        status = fbUser.disabled ? "disabled" : "active";
      } else {
        try {
          const fetchedFbUser = await admin.auth().getUser(user.uid);
          status = fetchedFbUser.disabled ? "disabled" : "active";
        } catch (err) {
          // Fallback if not found in Firebase auth
        }
      }

      usersData.push({
        ...user.toObject(),
        ordersCount,
        status
      });
    }

    res.json({ success: true, users: usersData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fetch User Credentials - Restricted to Master Owner only
app.get("/api/admin/users/credentials", async (req, res) => {
  try {
    const { adminUser } = req.query;
    if (!adminUser) {
      return res.status(400).json({ success: false, message: "Missing admin user parameter" });
    }

    // Authenticate that request is from Master Owner
    const adminAcc = await Admin.findOne({ username: adminUser });
    if (!adminAcc || adminAcc.role !== "Master Owner") {
      return res.status(403).json({ success: false, message: "Access denied. Only Master Owner can view credentials." });
    }

    const UserCollection = require("./models/User");
    const users = await UserCollection.find().select("uid name email phone").limit(200);
    const credentials = [];

    for (const u of users) {
      let firebaseUser = null;
      try {
        firebaseUser = await admin.auth().getUser(u.uid);
      } catch (err) { }

      // NOTE: Firebase Auth does not store raw passwords, but we can return password hash (passwordHash) or providers/metadata
      credentials.push({
        uid: u.uid,
        name: u.name || "N/A",
        email: u.email || "N/A",
        phone: u.phone || "N/A",
        passwordHash: firebaseUser ? (firebaseUser.passwordHash || "Encrypted (Firebase Auth)") : "N/A",
        disabled: firebaseUser ? firebaseUser.disabled : false,
        createdAt: firebaseUser ? firebaseUser.metadata.creationTime : "N/A"
      });
    }

    // Log this sensitive action
    const audit = new AuditLog({
      username: adminUser,
      action: "users.view_credentials",
      details: "Viewed user credentials database"
    });
    await audit.save();

    res.json({ success: true, credentials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle Customer Status (Deactivate / Activate Customer)
app.patch("/api/admin/users/:uid/status", async (req, res) => {
  try {
    const { uid } = req.params;
    const { disabled, adminUser } = req.body;

    // Check if customer exists
    const UserCollection = require("./models/User");
    const customer = await UserCollection.findOne({ uid });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Toggle status in Firebase Auth
    await admin.auth().updateUser(uid, {
      disabled: disabled // true to disable, false to enable
    });

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: disabled ? "users.disable" : "users.enable",
      details: `${disabled ? "Disabled" : "Enabled"} customer account: ${customer.name || customer.email} (UID: ${uid})`
    });
    await audit.save();

    res.json({ success: true, message: `Customer account status updated successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Impersonate Customer (Generate custom token) - Restricted to Master Owner only
app.post("/api/admin/users/:uid/impersonate", async (req, res) => {
  try {
    const { uid } = req.params;
    const { adminUser } = req.body;
    if (!adminUser) {
      return res.status(400).json({ success: false, message: "Missing admin user parameter" });
    }

    // Authenticate that request is from Master Owner
    const adminAcc = await Admin.findOne({ username: adminUser });
    if (!adminAcc || adminAcc.role !== "Master Owner") {
      return res.status(403).json({ success: false, message: "Access denied. Only Master Owner can impersonate users." });
    }

    // Check if customer exists in local DB
    const UserCollection = require("./models/User");
    const customer = await UserCollection.findOne({ uid });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer profile not found" });
    }

    // Generate Firebase Custom Token
    const customToken = await admin.auth().createCustomToken(uid);

    // Log the sensitive action
    const audit = new AuditLog({
      username: adminUser,
      action: "users.impersonate",
      details: `Generated impersonation token for customer: ${customer.name || customer.email} (UID: ${uid})`
    });
    await audit.save();

    res.json({ success: true, token: customToken });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// Fetch Admin Accounts
app.get("/api/admin/accounts", async (req, res) => {
  try {
    const accounts = await Admin.find().select("-passwordHash");
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Admin Account
app.post("/api/admin/accounts", async (req, res) => {
  try {
    const { username, email, phone, password, role, permissions, adminUser } = req.body;
    if (!username || !email || !phone || !password || !role) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existing = await Admin.findOne({ $or: [{ username }, { email }, { phone }] });
    if (existing) {
      return res.status(400).json({ success: false, message: "Username, Email or Phone already registered as admin" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({
      username,
      email,
      phone,
      passwordHash,
      role,
      permissions: permissions || [],
      status: "active"
    });
    await newAdmin.save();

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "admins.create",
      details: `Created admin account: ${username} with role ${role}`
    });
    await audit.save();

    res.json({ success: true, message: "Admin account created successfully", data: newAdmin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Pricing Configurations
app.get("/api/admin/pricing", async (req, res) => {
  try {
    const settings = await SystemSetting.find();
    const config = {};
    settings.forEach(s => {
      config[s.key] = s.value;
    });
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save Pricing Configurations
app.post("/api/admin/pricing", async (req, res) => {
  try {
    const { config, adminUser } = req.body;
    if (!config) {
      return res.status(400).json({ success: false, message: "Missing config object" });
    }

    for (const [key, val] of Object.entries(config)) {
      await SystemSetting.findOneAndUpdate(
        { key },
        { value: val },
        { upsert: true }
      );
    }

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "pricing.edit",
      details: `Updated pricing configurations: ${JSON.stringify(config)}`
    });
    await audit.save();

    res.json({ success: true, message: "Pricing configuration updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fetch all templates
app.get("/api/admin/templates", async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete template
app.delete("/api/admin/templates/:templateId", async (req, res) => {
  try {
    const { templateId } = req.params;
    const { adminUser } = req.query;
    const template = await Template.findOne({ templateId });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    const storageDir = path.join(__dirname, "../storage/templates", templateId);
    if (fs.existsSync(storageDir)) {
      fs.rmSync(storageDir, { recursive: true, force: true });
    }

    await Template.deleteOne({ templateId });

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "template.delete",
      details: `Deleted template ${template.name} (ID: ${templateId})`
    });
    await audit.save();

    res.json({ success: true, message: "Template deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fetch individual template by ID (public endpoint)
app.get("/api/templates/:templateId", async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await Template.findOne({ templateId });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }
    res.json({ success: true, template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Public: Fetch global pricing settings (min qty, volume tiers, tax rate)
app.get("/api/pricing/global", async (req, res) => {
  try {
    const settings = await SystemSetting.find({
      key: { $in: ["min_order_qty", "volume_discount_tiers", "tax_rate", "shipping_base"] }
    });
    const config = {};
    settings.forEach(s => { config[s.key] = s.value; });
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update individual template pricing & offers
app.patch("/api/admin/templates/:templateId/pricing", async (req, res) => {
  try {
    const { templateId } = req.params;
    const {
      price,
      offerPrice,
      offerLabel,
      offerStartDate,
      offerEndDate,
      isFeatured,
      isPremium,
      expressDeliveryAvailable,
      taxFree,
      availableStates,
      availableDistricts,
      hasEnvelope,
      hasPremiumPages,
      allowedCardStocks,
      premiumCardStocks,
      uploadedImagePrice,
      adminUser
    } = req.body;

    const template = await Template.findOne({ templateId });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    const parseArrayField = (value) => {
      if (Array.isArray(value)) {
        return value.map(s => s.trim()).filter(Boolean);
      }
      if (typeof value === "string") {
        return value.split(",").map(s => s.trim()).filter(Boolean);
      }
      return [];
    };

    // Build update object with only provided fields
    const updateFields = {};
    if (price !== undefined) updateFields.price = Number(price);
    if (offerPrice !== undefined) updateFields.offerPrice = offerPrice === "" || offerPrice === null ? null : Number(offerPrice);
    if (offerLabel !== undefined) updateFields.offerLabel = offerLabel;
    if (offerStartDate !== undefined) updateFields.offerStartDate = offerStartDate || null;
    if (offerEndDate !== undefined) updateFields.offerEndDate = offerEndDate || null;
    if (isFeatured !== undefined) updateFields.isFeatured = Boolean(isFeatured);
    if (isPremium !== undefined) updateFields.isPremium = Boolean(isPremium);
    if (expressDeliveryAvailable !== undefined) updateFields.expressDeliveryAvailable = Boolean(expressDeliveryAvailable);
    if (taxFree !== undefined) updateFields.taxFree = Boolean(taxFree);
    if (availableStates !== undefined) updateFields.availableStates = parseArrayField(availableStates);
    if (availableDistricts !== undefined) updateFields.availableDistricts = parseArrayField(availableDistricts);
    if (hasEnvelope !== undefined) updateFields.hasEnvelope = Boolean(hasEnvelope);
    if (hasPremiumPages !== undefined) updateFields.hasPremiumPages = Boolean(hasPremiumPages);
    if (allowedCardStocks !== undefined) updateFields.allowedCardStocks = parseArrayField(allowedCardStocks);
    if (premiumCardStocks !== undefined) updateFields.premiumCardStocks = parseArrayField(premiumCardStocks);
    if (uploadedImagePrice !== undefined) updateFields.uploadedImagePrice = Number(uploadedImagePrice);

    await Template.findOneAndUpdate({ templateId }, updateFields);

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "pricing.template.edit",
      details: `Updated pricing & configs for template ${template.name} (ID: ${templateId}): ${JSON.stringify(updateFields)}`
    });
    await audit.save();

    res.json({ success: true, message: `Pricing and configurations updated for "${template.name}"` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fetch print & shipping orders (extended with customer details & payment status)
app.get("/api/admin/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    const ordersData = [];

    for (const order of orders) {
      // Find customer info
      const customer = await User.findOne({ uid: order.uid });
      // Find matching payment if any
      const payment = await Payment.findOne({ uid: order.uid }).sort({ createdAt: -1 });
      const paymentStatus = payment ? payment.status : (order.paymentId ? "Paid" : "Pending");
      const amountPaid = payment ? payment.amount : (order.paymentId ? (order.pricing?.total || 0) : 0);

      ordersData.push({
        ...order.toObject(),
        customerName: customer ? customer.name : "Not filled",
        customerEmail: customer ? customer.email : "N/A",
        customerPhone: customer ? customer.phone : "N/A",
        shippingAddress: order.shippingAddress && order.shippingAddress.fullName
          ? order.shippingAddress
          : (customer && customer.addresses && customer.addresses.length > 0
            ? customer.addresses.find(a => a.isDefault) || customer.addresses[0]
            : null),
        paymentStatus,
        amountPaid
      });
    }

    res.json({ success: true, orders: ordersData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fetch single order details
app.get("/api/admin/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Find customer info
    const customer = await User.findOne({ uid: order.uid });
    // Find matching payment if any
    const payment = await Payment.findOne({ uid: order.uid }).sort({ createdAt: -1 });
    const paymentStatus = payment ? payment.status : (order.paymentId ? "Paid" : "Pending");
    const amountPaid = payment ? payment.amount : (order.paymentId ? (order.pricing?.total || 0) : 0);

    const orderData = {
      ...order.toObject(),
      customerName: customer ? customer.name : "Not filled",
      customerEmail: customer ? customer.email : "N/A",
      customerPhone: customer ? customer.phone : "N/A",
      shippingAddress: order.shippingAddress && order.shippingAddress.fullName
        ? order.shippingAddress
        : (customer && customer.addresses && customer.addresses.length > 0
          ? customer.addresses.find(a => a.isDefault) || customer.addresses[0]
          : null),
      paymentStatus,
      amountPaid
    };

    res.json({ success: true, order: orderData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Order (called from frontend after checkout / payment)
app.post("/api/orders/create", async (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData.orderId || !orderData.uid) {
      return res.status(400).json({ success: false, message: "Missing orderId or uid" });
    }

    // Check if order already exists
    let order = await Order.findOne({ orderId: orderData.orderId });
    if (order) {
      return res.status(200).json({ success: true, message: "Order already exists", data: order });
    }

    // Set initial status and tracking history
    const initialStatus = orderData.status || "Confirmed";
    const initialTracking = [{
      status: initialStatus,
      location: "Warehouse",
      description: "Order placed successfully. Payment verified.",
      timestamp: new Date(),
      updatedBy: "system"
    }];

    order = new Order({
      ...orderData,
      status: initialStatus,
      trackingHistory: initialTracking,
      createdAt: new Date()
    });

    await order.save();

    const audit = new AuditLog({
      username: "customer",
      action: "orders.create",
      details: `Customer placed order ${orderData.orderId} for template ${orderData.templateName || orderData.templateId}`
    });
    await audit.save();

    res.status(201).json({ success: true, message: "Order created successfully", data: order });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update order status & delivery details (Standard route updated to sync trackingHistory)
app.post("/api/admin/orders/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, carrier, trackingId, estimatedDelivery, notes, adminUser, location, description } = req.body;
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const oldStatus = order.status;
    let statusChanged = false;

    if (status !== undefined && status !== order.status) {
      order.status = status;
      statusChanged = true;
    }
    if (carrier !== undefined) order.carrier = carrier;
    if (trackingId !== undefined) order.trackingId = trackingId;
    if (estimatedDelivery !== undefined) order.estimatedDelivery = estimatedDelivery;
    if (notes !== undefined) order.notes = notes;

    // If status changed, push to tracking history
    if (statusChanged) {
      order.trackingHistory.push({
        status: status,
        location: location || "Processing Center",
        description: description || `Order status updated to ${status}`,
        timestamp: new Date(),
        updatedBy: adminUser || "admin"
      });
    }

    await order.save();

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "orders.update",
      details: `Updated order ${orderId} details: status ${oldStatus}->${order.status}, tracking ID: ${order.trackingId || 'N/A'}`
    });
    await audit.save();

    res.json({ success: true, message: "Order details updated successfully", data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add tracking checkpoint manually
app.post("/api/admin/orders/:orderId/tracking", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, location, description, adminUser } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (status) {
      order.status = status;
    }

    order.trackingHistory.push({
      status: status || order.status,
      location: location || "In Transit",
      description: description || "Package location updated",
      timestamp: new Date(),
      updatedBy: adminUser || "admin"
    });

    await order.save();

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "orders.tracking.update",
      details: `Added tracking checkpoint for order ${orderId}: status ${order.status}, location ${location}`
    });
    await audit.save();

    res.json({ success: true, message: "Tracking update added successfully", data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add admin comment
app.post("/api/admin/orders/:orderId/comment", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { comment, adminUser } = req.body;

    if (!comment || !adminUser) {
      return res.status(400).json({ success: false, message: "Comment and adminUser are required" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.adminComments.push({
      comment,
      adminUser,
      createdAt: new Date()
    });

    await order.save();

    const audit = new AuditLog({
      username: adminUser,
      action: "orders.comment.add",
      details: `Added admin comment on order ${orderId}`
    });
    await audit.save();

    res.json({ success: true, message: "Comment added successfully", data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add/update order problems
app.post("/api/admin/orders/:orderId/problem", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, problemId, type, description, adminUser } = req.body; // action: "report" or "resolve"

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (action === "report") {
      if (!type || !description) {
        return res.status(400).json({ success: false, message: "Type and description are required to report a problem" });
      }

      order.problems.push({
        type,
        description,
        status: "Open",
        reportedBy: adminUser || "admin",
        createdAt: new Date()
      });

      // Optionally add a tracking update about the problem
      order.trackingHistory.push({
        status: order.status,
        location: "Support Center",
        description: `⚠️ Problem Reported: ${type} - ${description}`,
        timestamp: new Date(),
        updatedBy: adminUser || "admin"
      });

    } else if (action === "resolve") {
      if (!problemId) {
        return res.status(400).json({ success: false, message: "problemId is required to resolve a problem" });
      }

      const problem = order.problems.id(problemId);
      if (!problem) {
        return res.status(404).json({ success: false, message: "Problem not found" });
      }

      problem.status = "Resolved";
      problem.resolvedBy = adminUser || "admin";
      problem.resolvedAt = new Date();

      order.trackingHistory.push({
        status: order.status,
        location: "Support Center",
        description: `✅ Resolved Problem: ${problem.type}`,
        timestamp: new Date(),
        updatedBy: adminUser || "admin"
      });
    } else {
      return res.status(400).json({ success: false, message: "Invalid action. Must be 'report' or 'resolve'" });
    }

    await order.save();

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: `orders.problem.${action}`,
      details: `${action === "report" ? "Reported" : "Resolved"} problem on order ${orderId}`
    });
    await audit.save();

    res.json({ success: true, message: `Problem ${action === "report" ? "reported" : "resolved"} successfully", data: order` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update customer review/rating
app.post("/api/orders/:orderId/review", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;

    if (rating === undefined) {
      return res.status(400).json({ success: false, message: "Rating is required" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.review = {
      rating: Number(rating),
      comment: comment || "",
      createdAt: new Date()
    };

    await order.save();

    const audit = new AuditLog({
      username: "customer",
      action: "orders.review.submit",
      details: `Customer submitted a review for order ${orderId}: rating ${rating}`
    });
    await audit.save();

    res.json({ success: true, message: "Feedback submitted successfully", data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign/update delivery partner
app.patch("/api/admin/orders/:orderId/delivery-partner", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { name, phone, vehicleNumber, photo, adminUser } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.deliveryPartner = {
      name: name || "",
      phone: phone || "",
      vehicleNumber: vehicleNumber || "",
      photo: photo || ""
    };

    // Push tracking history entry if delivery partner assigned
    if (name) {
      order.trackingHistory.push({
        status: order.status,
        location: "Dispatch Hub",
        description: `Delivery partner ${name} assigned (${vehicleNumber || 'No vehicle info'})`,
        timestamp: new Date(),
        updatedBy: adminUser || "admin"
      });
    }

    await order.save();

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "orders.delivery_partner.assign",
      details: `Assigned delivery partner ${name} to order ${orderId}`
    });
    await audit.save();

    res.json({ success: true, message: "Delivery partner details updated successfully", data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark print slip as printed
app.patch("/api/admin/orders/:orderId/slip-printed", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { adminUser } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.slipPrinted = true;
    order.slipPrintedAt = new Date();
    order.slipPrintedBy = adminUser || "admin";

    await order.save();

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "orders.slip.print",
      details: `Printed packaging slip for order ${orderId}`
    });
    await audit.save();

    res.json({ success: true, message: "Slip print state updated", data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fetch transaction history
app.get("/api/admin/payments", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Refund payment
app.post("/api/admin/payments/refund", async (req, res) => {
  try {
    const { razorpayPaymentId, adminUser } = req.body;
    const payment = await Payment.findOne({ razorpayPaymentId });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment transaction not found" });
    }

    payment.status = "Refunded";
    await payment.save();

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "payment.refund",
      details: `Refunded payment of ₹${payment.amount} (ID: ${razorpayPaymentId})`
    });
    await audit.save();

    res.json({ success: true, message: "Refund processed successfully", data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete customer
app.delete("/api/admin/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { adminUser } = req.query;
    const UserCollection = require("./models/User");
    const user = await UserCollection.findOne({ uid });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await UserCollection.deleteOne({ uid });

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "users.delete",
      details: `Deleted customer account: ${user.name || user.email} (UID: ${uid})`
    });
    await audit.save();

    res.json({ success: true, message: "Customer account deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Edit admin account
app.put("/api/admin/accounts/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { newUsername, email, phone, role, password, permissions, adminUser } = req.body;

    const targetAdmin = await Admin.findOne({ username });
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: "Admin account not found" });
    }

    // Support updating username
    if (newUsername && newUsername.trim() !== username) {
      const duplicate = await Admin.findOne({ username: newUsername.trim() });
      if (duplicate) {
        return res.status(400).json({ success: false, message: "New username is already taken by another administrator" });
      }
      targetAdmin.username = newUsername.trim();
    }

    // Update fields if provided
    if (email) targetAdmin.email = email;
    if (phone) targetAdmin.phone = phone;

    // Role protection (Master Owner role and permissions are locked and cannot be changed)
    if (targetAdmin.role !== "Master Owner") {
      if (role) targetAdmin.role = role;
      if (permissions) targetAdmin.permissions = permissions;
    }

    if (password) {
      targetAdmin.passwordHash = await bcrypt.hash(password, 10);
    }

    await targetAdmin.save();

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "admins.edit",
      details: `Updated admin account: ${username}${newUsername && newUsername !== username ? ` (New username: ${newUsername})` : ""}`
    });
    await audit.save();

    // Prepare updated user object for the response
    const updatedAdmin = {
      username: targetAdmin.username,
      email: targetAdmin.email,
      phone: targetAdmin.phone,
      role: targetAdmin.role,
      permissions: targetAdmin.permissions
    };

    res.json({ success: true, message: "Admin account updated successfully", admin: updatedAdmin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle admin status (deactivate/activate)
app.patch("/api/admin/accounts/:username/status", async (req, res) => {
  try {
    const { username } = req.params;
    const { status, adminUser } = req.body;

    const targetAdmin = await Admin.findOne({ username });
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: "Admin account not found" });
    }

    if (targetAdmin.role === "Master Owner") {
      return res.status(400).json({ success: false, message: "Cannot change the status of a Master Owner account" });
    }
    if (targetAdmin.username === adminUser) {
      return res.status(400).json({ success: false, message: "Cannot deactivate your own admin account" });
    }

    targetAdmin.status = status; // "active" or "inactive"
    await targetAdmin.save();

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: status === "active" ? "admins.activate" : "admins.deactivate",
      details: `${status === "active" ? "Activated" : "Deactivated"} admin account: ${username}`
    });
    await audit.save();

    res.json({ success: true, message: `Admin account status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete admin account
app.delete("/api/admin/accounts/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { adminUser } = req.query;

    const targetAdmin = await Admin.findOne({ username });
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: "Admin account not found" });
    }

    if (targetAdmin.role === "Master Owner") {
      return res.status(400).json({ success: false, message: "Cannot delete a Master Owner admin account" });
    }
    if (targetAdmin.username === adminUser) {
      return res.status(400).json({ success: false, message: "Cannot delete your own admin account" });
    }

    await Admin.deleteOne({ username });

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "admins.delete",
      details: `Deleted admin account: ${username}`
    });
    await audit.save();

    res.json({ success: true, message: "Admin account deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function startServer() {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

if (mongoose.connection.readyState >= 1) {
  startServer();
} else {
  mongoose.connection.once("connected", startServer);
}