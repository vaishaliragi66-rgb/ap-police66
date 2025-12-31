const mongoose = require('mongoose');
const { Schema } = mongoose;

const MedicineSchema = new Schema({
  Medicine_Code: { type: String, required: true },
  Manufacturer_ID: { type: Schema.Types.ObjectId, ref: 'Manufacturer', required: true },
  Medicine_Name: { type: String, required: true },
  Type: { type: String },
  Category: { type: String },
  Quantity: { type: Number, required: true },
  Threshold_Qty: { type: Number, required: true },
  Expiry_Date: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(value) {
        // Expiry date should be in the future
        return value > new Date();
      },
      message: 'Expiry date must be in the future'
    }
  }
}, {
  timestamps: true
});

// ✅ Make (Manufacturer_ID + Medicine_Code) unique together
MedicineSchema.index({ Manufacturer_ID: 1, Medicine_Code: 1 }, { unique: true });

module.exports = mongoose.model('Medicine', MedicineSchema);