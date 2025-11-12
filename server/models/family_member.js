const mongoose = require("mongoose");
const { Schema } = mongoose;

const FamilyMemberSchema = new Schema({
  Employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  Name: { type: String, required: true },
  Relationship: { type: String, required: true, enum: ["Father", "Mother", "Wife", "Child"] },
  DOB: { type: Date },
  Gender: { type: String, required: true, enum: ["Male", "Female"] },
  Medical_History: Object
});

module.exports = mongoose.model("FamilyMember", FamilyMemberSchema);