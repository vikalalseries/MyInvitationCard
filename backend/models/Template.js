const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, default: "wedding" },
    thumbnail: { type: String },
    price: { type: Number, default: 0 },
    status: { type: String, default: "active" }, // "active", "draft", "hidden"
    files: [{ type: String }],
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", TemplateSchema);
