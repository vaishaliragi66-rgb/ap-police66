const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;


const ManufacturerSchema = new mongoose.Schema({
  Manufacturer_ID: {
    type: Number,
    unique: true
  },
  Manufacturer_Name: {
    type: String,
    required: true
  },
  Contact_No: {
    type: String,
    required: true,
    match: /^[0-9]{10}$/
  },
  Email_ID: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  Address: {
    Street: { type: String, required: true },
    District: { type: String, required: true },
    State: { type: String, required: true },
    Pincode: { type: String, required: true }
  },
  Orders: {
    type: [
      {
        Institute_ID: {
          type: Schema.Types.ObjectId, ref: 'Institute', required: true 
        },
        Medicine_ID: {
          type: Schema.Types.ObjectId, ref: 'Medicine', required: true
        },
        Quantity: {
          type: Number,
          default: 0,
          min: 0
        },
        Order_Date: {
          type: Date,
          default: Date.now
        },
        Delivery_Status: {
          type: String,
          enum: ["Pending", "Dispatched", "Delivered", "Cancelled"],
          default: "Pending"
        },
        Remarks: {
          type: String,
          default: "No remarks"
        }
      }
    ]
  }
});

// Auto increment Manufacturer_ID
ManufacturerSchema.plugin(AutoIncrement, { inc_field: "Manufacturer_ID" });

module.exports = mongoose.model("Manufacturer", ManufacturerSchema);