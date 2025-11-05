const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;
const InstituteSchema = new Schema({
  Institute_ID: { type: Number, unique: true },
  Institute_Name: { type: String, required: true, unique: true },
  Address: {
    Street: { type: String, required: true },
    District: { type: String, required: true },
    State: { type: String, required: true },
    Pincode: { type: String, required: true }
  },
  Email_ID: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  Contact_No: { type: String },

  // Medicines currently available in the institute
  Medicine_Inventory: [
    {
      Medicine_ID: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
      Quantity: { type: Number, required: true, default: 0 }
    }
  ],

  // Orders placed by the institute to manufacturers
  Orders: [
    {
      Manufacturer_ID: { type: Schema.Types.ObjectId, ref: 'Manufacturer', required: true },
      Medicine_ID: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
      Quantity_Requested: { type: Number, required: true },
      Status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'DELIVERED'],
        default: 'PENDING'
      },
      Order_Date: { type: Date, default: Date.now },
      Delivery_Date: { type: Date }
    }
  ]
});
InstituteSchema.plugin(AutoIncrement, { inc_field: "Institute_ID" });
module.exports = mongoose.model('Institute', InstituteSchema);