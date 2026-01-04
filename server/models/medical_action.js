const mongoose = require("mongoose");

const MedicalActionSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },

  visit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DailyVisit",
    default: null   // visit optional
  },

  action_type: {
    type: String,
    enum: [
      "DOCTOR_PRESCRIPTION",
      "PHARMACY_ISSUE",
      "DIAGNOSIS_TEST",
      "DOCTOR_DIAGNOSIS",     
      "DIAGNOSIS_REPORT", 
    ],
    required: true
  },

  source: {
    type: String,
    enum: ["DOCTOR", "PHARMACY", "LAB"],
    required: true
  },

  data: {
    type: Object,
    required: true
    /*
      Example:
      {
        medicines: [{ name, qty, dosage }],
        tests: [{ name, remarks }],
        notes: ""
      }
    */
  },

  remarks: {
    type: String,
    default: ""
  },

  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("MedicalAction", MedicalActionSchema);
