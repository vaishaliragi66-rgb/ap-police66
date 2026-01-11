const mongoose = require("mongoose");

const PatientSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["EMPLOYEE", "FAMILY"],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    relation: String,
    age: Number,
    symptoms: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);


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

  abs_no: {
    type: String,
    required: true
  },

  patient: {
    type: PatientSchema,
    required: true
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

module.exports = mongoose.model("DailyVisit", DailyVisitSchema);
