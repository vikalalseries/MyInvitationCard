const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, default: "wedding" },
    thumbnail: { type: String },
    price: { type: Number, default: 0 },
    offerPrice: { type: Number, default: null },
    offerLabel: { type: String, default: "" },
    offerStartDate: { type: Date, default: null },
    offerEndDate: { type: Date, default: null },
    isFeatured: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    status: { type: String, default: "active" }, // "active", "draft", "hidden"
    files: [{ type: String }],
    version: { type: Number, default: 1 },
    expressDeliveryAvailable: { type: Boolean, default: true },
    taxFree: { type: Boolean, default: false },
    availableStates: [{ type: String }],
    availableDistricts: [{ type: String }],
    hasEnvelope: { type: Boolean, default: true },
    hasPremiumPages: { type: Boolean, default: false },
    allowedCardStocks: [{ type: String }],
    premiumCardStocks: [{ type: String }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", TemplateSchema);
