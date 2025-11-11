const mongoose = require("mongoose");
const { Schema } = mongoose;

const OrderSchema = new Schema({
  Institute_ID: {
    type: Schema.Types.ObjectId,
    ref: "Institute",
    required: true
  },
  Manufacturer_ID: {
    type: Schema.Types.ObjectId,
    ref: "Manufacturer",
    required: true
  },
  Medicine_ID: {
    type: Schema.Types.ObjectId,
    ref: "Medicine",
    required: true
  },
  Quantity_Requested: {
    type: Number,
    required: true
  },
  manufacture_Status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED", "DELIVERED"],
    default: "PENDING"
  },
  institute_Status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED", "DELIVERED"],
    default: "PENDING"
  },
  Order_Date: {
    type: Date,
    default: Date.now
  },
  Delivery_Date: {
    type: Date
  },
  Remarks: {
    type: String,
    default: "No remarks"
  }
});

module.exports = mongoose.model("Order", OrderSchema);