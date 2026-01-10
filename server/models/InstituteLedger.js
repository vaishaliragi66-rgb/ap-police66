const mongoose = require("mongoose");
const { Schema } = mongoose;

const InstituteLedgerSchema = new Schema(
  {
    Institute_ID: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },

    // What kind of stock movement this entry represents
    Transaction_Type: {
      type: String,
      enum: ["MAINSTORE_ADD","STORE_TRANSFER", "PRESCRIPTION_ISSUE"],
      required: true
    },

    // Reference ID:
    // - Prescription _id for PRESCRIPTION_ISSUE
    // - NULL for STORE_TRANSFER
    Reference_ID: {
      type: Schema.Types.ObjectId,
      required: false
    },

    Medicine_ID: {
      type: Schema.Types.ObjectId,
      ref: "Medicine",
      required: true
    },

    Medicine_Name: {
      type: String,
      required: true
    },

    Expiry_Date: {
      type: Date,
      required: true
    },

    // IN  -> Stock coming in (Main Store → Sub Store)
    // OUT -> Stock going out (Pharmacy Prescription)
    Direction: {
      type: String,
      enum: ["IN", "OUT"],
      required: true
    },

    Quantity: {
      type: Number,
      required: true
    },

    // Balance of medicine AFTER this transaction
    Balance_After: {
      type: Number,
      required: true
    },

    Timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

module.exports = mongoose.model("InstituteLedger", InstituteLedgerSchema);
