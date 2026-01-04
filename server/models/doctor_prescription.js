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

    FamilyMember: {
      type: Schema.Types.ObjectId,
      ref: "FamilyMember",
      default: null
    },

    Medicines: [
      {
        Medicine_Name: { type: String, required: true },
        Dosage: { type: String },          // optional (1-0-1 etc.)
        Duration: { type: String },        // optional (5 days)
        Quantity: { type: Number, min: 1 } // advisory quantity
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
