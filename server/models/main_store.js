const mongoose = require("mongoose");
const { Schema } = mongoose;

const MainStoreMedicineSchema = new Schema({
   Institute_ID: {
    type: Schema.Types.ObjectId,
    ref: "Institute",
    required: true
  },
  Medicine_Code: { type: String, required: true },
  Medicine_Name: { type: String, required: true },

  Type: { type: String },
  Category: { type: String },

  Quantity: { type: Number, required: true },

  Threshold_Qty: { type: Number, required: true },

  Issued_By: {
    type: String,   // example: "DGP Head Office"
    required: true
  },

  Expiry_Date: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: "Expiry date must be in the future"
    }
  }

}, { timestamps: true });

// Prevent duplicate medicine codes in main store
MainStoreMedicineSchema.index({ Medicine_Code: 1 }, { unique: true });

module.exports = mongoose.model("MainStoreMedicine", MainStoreMedicineSchema);