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

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});