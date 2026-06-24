const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "YOUR_KEY_ID",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "YOUR_SECRET",
});

/**
 * Creates an order in Razorpay
 * @param {number} amountInRupees - The amount to pay in INR (e.g. 2360.00)
 * @param {string} receiptId - A unique receipt identifier
 * @returns {Promise<object>} Razorpay Order Object
 */
const createOrder = async (amountInRupees, receiptId) => {
  // Razorpay amount is in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(amountInRupees * 100);

  const options = {
    amount: amountInPaise,
    currency: "INR",
    receipt: receiptId || `receipt_${Date.now()}`,
  };

  return await razorpayInstance.orders.create(options);
};

/**
 * Verifies Razorpay payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean} Whether signature is valid
 */
const verifySignature = (orderId, paymentId, signature) => {
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "YOUR_SECRET")
    .update(orderId + "|" + paymentId)
    .digest("hex");

  return generatedSignature === signature;
};

module.exports = {
  createOrder,
  verifySignature,
};
