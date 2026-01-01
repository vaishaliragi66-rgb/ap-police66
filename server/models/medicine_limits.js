// models/medicineLimit.js
const mongoose = require("mongoose");

const MedicineLimitSchema = new mongoose.Schema({
  medicine_name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  max_quantity_per_patient: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    default: "units" // bottles / tablets / sachets
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("MedicineLimit", MedicineLimitSchema);
