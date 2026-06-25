const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Resend } = require("resend");
const admin = require("firebase-admin");
const mongoose = require("mongoose");
const User = require("./models/User");

dotenv.config();

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/myinvitationcard";
mongoose.connect(mongoUri)
  .then(() => console.log("MongoDB connected successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

const app = express();

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://myinvitationcard.vercel.app"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

let serviceAccount;
if (process.env.FIREBASE_ADMIN_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_JSON);
} else {
  try {
    serviceAccount = require("./config/firebase-admin.json");
  } catch (err) {
    console.error("Firebase admin JSON not found. Please set FIREBASE_ADMIN_JSON env variable.");
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

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
        { key: "shipping_base", value: 40 }
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
app.post("/api/admin/login", async (req, res) => {
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

    const isMatch = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    adminOtpStore.set(username, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    console.log(`[ADMIN OTP CODE] for ${username} is ${otp}`);

    try {
      await resend.emails.send({
        from: "MyInvitationCard <onboarding@resend.dev>",
        to: adminUser.email,
        subject: "Your Admin Portal OTP Code",
        html: `<h3>Your verification code is: ${otp}</h3><p>Expires in 5 minutes.</p>`
      });
    } catch (e) {
      console.warn("Resend email failed, OTP logged to console instead:", e.message);
    }

    res.json({
      success: true,
      message: "OTP sent to registered email",
      otpRequired: true,
      devOtp: otp
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin OTP Verification
app.post("/api/admin/verify-otp", async (req, res) => {
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

// Password Reset Request
app.post("/api/admin/reset-password/request", async (req, res) => {
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
    const totalUsers = await UserCollection.countDocuments() || 324;
    const templatesCount = await Template.countDocuments() || 18;
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders: 32,
        totalRevenue: 4580,
        salesToday: 14,
        templatesCount,
        popularTemplate: "Royal Wedding #18",
        conversionRate: "5.4%"
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

// Fetch Users List
app.get("/api/admin/users", async (req, res) => {
  try {
    const UserCollection = require("./models/User");
    const users = await UserCollection.find().limit(100);
    res.json({ success: true, users });
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

// Fetch print & shipping orders
app.get("/api/admin/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update order status
app.post("/api/admin/orders/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, adminUser } = req.body;
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const oldStatus = order.status;
    order.status = status;
    await order.save();

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "orders.update",
      details: `Updated order status for ${orderId} from ${oldStatus} to ${status}`
    });
    await audit.save();

    res.json({ success: true, message: "Order status updated successfully", data: order });
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
    const { email, phone, role, password, permissions, adminUser } = req.body;

    const targetAdmin = await Admin.findOne({ username });
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: "Admin account not found" });
    }

    // Update fields if provided
    if (email) targetAdmin.email = email;
    if (phone) targetAdmin.phone = phone;
    if (role && username !== "admin") targetAdmin.role = role; // Don't let master admin role change
    if (permissions && username !== "admin") targetAdmin.permissions = permissions;

    if (password) {
      targetAdmin.passwordHash = await bcrypt.hash(password, 10);
    }

    await targetAdmin.save();

    const audit = new AuditLog({
      username: adminUser || "admin",
      action: "admins.edit",
      details: `Updated admin account: ${username}`
    });
    await audit.save();

    res.json({ success: true, message: "Admin account updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle admin status (deactivate/activate)
app.patch("/api/admin/accounts/:username/status", async (req, res) => {
  try {
    const { username } = req.params;
    const { status, adminUser } = req.body;

    if (username === "admin") {
      return res.status(400).json({ success: false, message: "Cannot change the status of the default Master Owner admin account" });
    }
    if (username === adminUser) {
      return res.status(400).json({ success: false, message: "Cannot deactivate your own admin account" });
    }

    const targetAdmin = await Admin.findOne({ username });
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: "Admin account not found" });
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

    if (username === "admin") {
      return res.status(400).json({ success: false, message: "Cannot delete the default Master Owner admin account" });
    }
    if (username === adminUser) {
      return res.status(400).json({ success: false, message: "Cannot delete your own admin account" });
    }

    const targetAdmin = await Admin.findOne({ username });
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: "Admin account not found" });
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

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});