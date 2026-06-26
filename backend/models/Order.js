const mongoose = require("mongoose");

const trackingSchema = new mongoose.Schema({
  status: { type: String, required: true },
  location: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
  description: { type: String, default: "" },
  updatedBy: { type: String, default: "system" }
});

const adminCommentSchema = new mongoose.Schema({
  comment: { type: String, required: true },
  adminUser: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const problemSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., "Delayed", "Wrong Address", "Damaged", "Other"
  description: { type: String, required: true },
  status: { type: String, enum: ["Open", "Resolved"], default: "Open" },
  reportedBy: { type: String, required: true },
  resolvedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  uid: {
    type: String,
    required: true
  },
  templateId: {
    type: String,
    required: true
  },
  templateName: {
    type: String,
    required: true
  },
  orderType: {
    type: String,
    enum: ["normal", "express"],
    default: "normal"
  },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Processing", "Printing", "Dispatched", "Out for Delivery", "Delivered", "Cancelled", "Returned"],
    default: "Pending"
  },
  carrier: {
    type: String,
    default: ""
  },
  trackingId: {
    type: String,
    default: ""
  },
  estimatedDelivery: {
    type: String,
    default: ""
  },
  notes: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

  // Print Configuration Details
  stockOption: { type: String, default: "matte" },
  premiumPaperStock: { type: String, default: null },
  envelopeOption: { type: String, default: "standard" },
  quantity: { type: Number, default: 100 },
  deliveryMethod: { type: String, default: "standard" },
  templatePreviewUrl: { type: String, default: "" },
  templateEditData: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Detailed Pricing
  pricing: {
    baseRate: { type: Number, default: 0 },
    stockPrice: { type: Number, default: 0 },
    premiumStockPrice: { type: Number, default: 0 },
    envelopePrice: { type: Number, default: 0 },
    deliveryPrice: { type: Number, default: 0 },
    baseTotal: { type: Number, default: 0 },
    addonsTotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },

  // Shipping Address
  shippingAddress: {
    fullName: { type: String },
    phone: { type: String },
    emergencyPhone: { type: String },
    pincode: { type: String },
    address: { type: String },
    address2: { type: String },
    city: { type: String },
    state: { type: String }
  },

  // Payment Details
  paymentId: { type: String, default: "" },

  // Real-time tracking history
  trackingHistory: [trackingSchema],

  // Delivery Partner
  deliveryPartner: {
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    vehicleNumber: { type: String, default: "" },
    photo: { type: String, default: "" }
  },

  // Customer Review & Feedback
  review: {
    rating: { type: Number, default: 0 },
    comment: { type: String, default: "" },
    createdAt: { type: Date }
  },

  // Comments & Problems
  adminComments: [adminCommentSchema],
  problems: [problemSchema],

  // Print Slip Track
  slipPrinted: { type: Boolean, default: false },
  slipPrintedAt: { type: Date },
  slipPrintedBy: { type: String, default: "" }
});

module.exports = mongoose.model("Order", orderSchema);

