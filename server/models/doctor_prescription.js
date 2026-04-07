const mongoose = require("mongoose");
const { Schema } = mongoose;

const DoctorPrescriptionSchema = new Schema(
  {
    Institute: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true
    },

    Employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },

    IsFamilyMember: {
      type: Boolean,
      default: false
    },

    InPatient: {
      type: Boolean,
      default: false
    },

    FamilyMember: {
      type: Schema.Types.ObjectId,
      ref: "FamilyMember",
      default: null
    },

    Medicines: [
      {
        Medicine_Name: { type: String, required: true },
        Type: { type: String },            // Tablet, Syrup, Injection
        FoodTiming: { type: String },      // Before Food, After Food
        Strength: { type: String, trim: true },
        Morning: { type: Number, default: 0 },     // Morning dosage
        Afternoon: { type: Number, default: 0 },   // Afternoon dosage
        Night: { type: Number, default: 0 },       // Night dosage
        Duration: { type: String },        // optional (5 days)
        Remarks: { type: String },         // Doctor remarks for this medicine
        Quantity: { type: Number, default: 0 }
      }
    ],

    Notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoctorPrescription", DoctorPrescriptionSchema);