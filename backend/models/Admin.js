const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: "Staff" }, // e.g. "Master Owner", "Template Manager", "Pricing Manager", "Order Manager", "Payment Manager", "Customer Support"
    permissions: [{ type: String }],
    status: { type: String, default: "active" }, // "active", "suspended"
    lastLogin: { type: Date },
    failedLoginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", AdminSchema);
