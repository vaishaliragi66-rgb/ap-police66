const mongoose = require('mongoose');
const { Schema } = mongoose;

const FamilyMemberSchema = new Schema({
  Family_ID: { type: Number, unique: true },
  Employee_ABS_NO: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  Name: { type: String, required: true },
  Relationship: { type: String, required: true },
  DOB: { type: Date },
  Medical_History: { type: String }
});

module.exports = mongoose.model('FamilyMember', FamilyMemberSchema);