const mongoose = require("mongoose");
const { Schema } = mongoose;

const DiagnosisRecordSchema = new Schema(
{
  Institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
  Employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },

  IsFamilyMember: { type: Boolean, default: false },
  FamilyMember: { type: Schema.Types.ObjectId, ref: "FamilyMember", default: null },

  Visit: { type: Schema.Types.ObjectId, ref: "DailyVisit", default: null },

  Tests: [
    {
      Test_ID: { type: Schema.Types.ObjectId, ref: "MasterValue" },

      Test_Name: { type: String, required: true },

      Group: String,

      Result_Value: { type: String, required: true },

      Reference_Range: String,

      Units: String,

      Remarks: String,

      Timestamp: {
        type: Date,
        default: Date.now
      },

      // ✅ REPORT FILES FOR THIS TEST
      Reports: [
        {
          filename: String,
          originalname: String,
          url: String,
          uploadedBy: String,
          uploadedAt: {
            type: Date,
            default: Date.now
          }
        }
      ]
    }
  ],

  Diagnosis_Notes: String

},
{
  timestamps: true
}
);

module.exports = mongoose.model("DiagnosisRecord", DiagnosisRecordSchema);
