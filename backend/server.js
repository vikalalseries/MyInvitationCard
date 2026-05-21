const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Resend } = require("resend");
const admin = require("firebase-admin");

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_JSON);

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

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});