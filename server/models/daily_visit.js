const mongoose = require("mongoose");

/* ===============================
   DAILY VISIT SCHEMA
=================================*/

const DailyVisitSchema = new mongoose.Schema({

  Institute_ID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Institute",
    required: true
  },

  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },

  // 👇 Needed for Prescription consistency
  IsFamilyMember: {
    type: Boolean,
    default: false
  },

  FamilyMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FamilyMember",
    default: null
  },

  abs_no: {
    type: String,
    required: true
  },

  name: {
    type: String,
    required: true
  },

  OP_No: {
    type: Number,
    required: true
  },

  symptoms: {
    type: String,
    trim: true,
    default: ""
  },

  Vitals: {
    Temperature: { type: Number, default: null },
    Sugar: { type: Number, default: null },
    Blood_Pressure: { type: String, default: null },
    Oxygen: { type: Number, default: null },
    Pulse: { type: Number, default: null },
    GRBS: { type: Number, default: null }
  },

  token_no: {
    type: Number,
    required: true
  },

  visit_date: {
    type: Date,
    default: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }
  },

  status: {
    type: String,
    enum: [
      "REGISTERED",
      "DOCTOR_DONE",
      "DIAGNOSIS_DONE",
      "PHARMACY_DONE",
      "COMPLETED"
    ],
    default: "REGISTERED"
  },

  created_at: {
    type: Date,
    default: Date.now
  }

});

DailyVisitSchema.index({ OP_No: 1 }, { unique: true });

module.exports = mongoose.model("DailyVisit", DailyVisitSchema);