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
  Orders: [{ type: Schema.Types.ObjectId, ref: "Order" }]
});
InstituteSchema.plugin(AutoIncrement, { inc_field: "Institute_ID" });
module.exports = mongoose.model('Institute', InstituteSchema);