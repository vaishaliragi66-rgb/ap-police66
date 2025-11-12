const mongoose = require('mongoose');
const { Schema } = mongoose;

const EmployeeSchema = new Schema({
  ABS_NO: { type: String, required: true, unique: true },
  Name: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  Password: { type: String, required: true },
  Designation: { type: String },
  DOB: { type: Date },
  Address: {
    Street: String,
    District: String,
    State: String,
    Pincode: String
  },
  Blood_Group: String,
  FamilyMembers: [{ type: Schema.Types.ObjectId, ref: "FamilyMember" }],
  Medical_History: [
  {
    Date: { type: Date, default: Date.now },
    Diagnosis: String,
    Medicines: [
      {
        Medicine_Name: String,
        Quantity: Number
      }
    ],
    Notes: String
  }
]
  
});

module.exports = mongoose.model("Employee", EmployeeSchema);