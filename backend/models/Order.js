const mongoose = require("mongoose");

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
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Processing", "Dispatched", "Out for Delivery", "Delivered", "Cancelled"],
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
  }
});

module.exports = mongoose.model("Order", orderSchema);
