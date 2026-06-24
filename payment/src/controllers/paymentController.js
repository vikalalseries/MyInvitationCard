const razorpayService = require("../services/razorpayService");

/**
 * Endpoint to create a Razorpay Order
 */
const createOrder = async (req, res) => {
  try {
    const { amount, receipt } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount. A positive number is required."
      });
    }

    const order = await razorpayService.createOrder(amount, receipt);

    res.status(201).json({
      success: true,
      key_id: process.env.RAZORPAY_KEY_ID || "YOUR_KEY_ID",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      }
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order: " + error.message
    });
  }
};

/**
 * Endpoint to verify Razorpay Payment Signature
 */
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required verification parameters."
      });
    }

    const isVerified = razorpayService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (isVerified) {
      return res.status(200).json({
        success: true,
        message: "Payment signature verified successfully."
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature. Verification failed."
      });
    }
  } catch (error) {
    console.error("Error verifying payment signature:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during verification: " + error.message
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment
};
