const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables before importing routes or services
dotenv.config();

const paymentRoutes = require("./src/routes/paymentRoutes");

const app = express();

// Configure CORS to match allowed origins and allow localhost development
app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://myinvitationcard.vercel.app",
    "http://127.0.0.1:3000",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// Mount payment routes
app.use("/api/payment", paymentRoutes);

// Health check / API information route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MyInvitationCard Payment API is active"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Payment server running on port ${PORT}`);
});
