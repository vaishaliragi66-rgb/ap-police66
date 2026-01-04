const mongoose = require("mongoose");

const DailyVisitSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
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
