const mongoose = require("mongoose");
const { Schema } = mongoose;

const FamilyMemberSchema = new Schema({
  Employee: {
    type: Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },

  Name: {
    type: String,
    required: true
  },

  Relationship: {
    type: String,
    required: true,
    enum: ["Father", "Mother", "Wife", "Child"]
  },

  Gender: {
    type: String,
    required: true,
    enum: ["Male", "Female"]
  },

  DOB: {
    type: Date
  },

  Medical_History: [
    {
      Date: { type: Date, default: Date.now },
      Diagnosis: String,
      Notes: String,
      Medicines: [
        {
          Medicine_Name: String,
          Quantity: Number
        }
      ],
      Disease: [{ type: Schema.Types.ObjectId, ref: "Disease" }]
    }
  ]
}, { 
  timestamps: true 
});

// Create a compound index to prevent duplicate family members for same employee
FamilyMemberSchema.index({ Employee: 1, Name: 1, Relationship: 1 }, { unique: true });

module.exports = mongoose.model("FamilyMember", FamilyMemberSchema);