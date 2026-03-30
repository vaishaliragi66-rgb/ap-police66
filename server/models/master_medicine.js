const mongoose = require("mongoose");
const { Schema } = mongoose;

const MedicineSchema = new Schema({

  // 🔑 VERY IMPORTANT: institute ownership
  Institute_ID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Institute",
    required: true
  },

  Medicine_Code: { type: String, required: true },
  Medicine_Name: { type: String, required: true },
  Strength: { type: String, trim: true },

  Type: { type: String },
  Category: { type: String },

  // 📦 This is SUBSTORE stock
  Quantity: { type: Number, required: true },
  Threshold_Qty: { type: Number, required: true },

  Expiry_Date: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value > new Date();
      },
      message: "Expiry date must be in the future"
    }
  },



}, { timestamps: true });

/**
 * ✅ SAME medicine can exist in multiple institutes
 * ❌ But NOT twice in the same institute
 */
MedicineSchema.index(
  { Institute_ID: 1, Medicine_Code: 1 },
  { unique: true }
);

module.exports = mongoose.model("Medicine", MedicineSchema);
