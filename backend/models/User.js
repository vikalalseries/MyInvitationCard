const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  emergencyPhone: { type: String },
  pincode: { type: String, required: true },
  address: { type: String, required: true },
  address2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
});

const UserSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    gender: { type: String },
    dob: { type: String },
    language: { type: String, default: "english" },
    profileImage: { type: String },
    addresses: [AddressSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
