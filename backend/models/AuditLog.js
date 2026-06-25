const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    username: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String }
  }
);

module.exports = mongoose.model("AuditLog", AuditLogSchema);
