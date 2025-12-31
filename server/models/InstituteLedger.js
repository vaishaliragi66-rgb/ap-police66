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

    Transaction_Type: {
      type: String,
      enum: ["ORDER_DELIVERY", "PRESCRIPTION_ISSUE"],
      required: true
    },

    Reference_ID: {
      type: Schema.Types.ObjectId,
      // ref: "Prescription",
      required: true
      // Order _id OR Prescription _id
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

    Manufacturer_Name: {
      type: String,
      default: ""
    },

    Expiry_Date: {
      type: Date,
      required: true
    },

    Direction: {
      type: String,
      enum: ["IN", "OUT"],
      required: true
    },

    Quantity: {
      type: Number,
      required: true
    },

    Balance_After: {
      type: Number,
      required: true
    },

    Timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

module.exports = mongoose.model("InstituteLedger", InstituteLedgerSchema);
