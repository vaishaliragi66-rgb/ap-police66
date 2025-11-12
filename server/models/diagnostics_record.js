const mongoose = require("mongoose");
const { Schema } = mongoose;

const DiagnosisRecordSchema = new Schema({
  Institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
  Employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  IsFamilyMember: { type: Boolean, default: false },
  FamilyMember: { type: Schema.Types.ObjectId, ref: "FamilyMember", default: null },

  Tests: [
    {
      Test_ID: { type: Schema.Types.ObjectId, ref: "DiagnosisTest" }, // optional link
      Test_Name: { type: String, required: true },
      Group: { type: String },
      Result_Value: { type: String, required: true },
      Reference_Range: { type: String },
      Units: { type: String },
      Remarks: { type: String }
    }
  ],

  Diagnosis_Notes: { type: String },
  Timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("DiagnosisRecord", DiagnosisRecordSchema);