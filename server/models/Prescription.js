const mongoose = require("mongoose");
const { Schema } = mongoose;

const PrescriptionSchema = new Schema({
  Institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true }, // matches Institute collection _id
  Employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  IsFamilyMember: { type: Boolean, default: false },
  FamilyMember: { type: Schema.Types.ObjectId, ref: "FamilyMember" },
  Medicines: [
    {
      Medicine_ID: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
      Medicine_Name: { type: String, required: true },
      Quantity: { type: Number, required: true, min: 1 }
    }
  ],
  Notes: { type: String },
  Timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Prescription", PrescriptionSchema);