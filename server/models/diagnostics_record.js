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
      Remarks: { type: String },
      Timestamp: { type: Date, default: Date.now }
    }
  ],

  Diagnosis_Notes: { type: String }
},
{
    timestamps: true   // ✅ THIS MAKES IT CONSISTENT
  }
);

// Add reports metadata for uploaded diagnosis reports
DiagnosisRecordSchema.add({
  Reports: [
    {
      filename: { type: String },
      originalname: { type: String },
      url: { type: String },
      uploadedBy: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model("DiagnosisRecord", DiagnosisRecordSchema);
