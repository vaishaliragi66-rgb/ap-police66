// models/Disease.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const DiseaseSchema = new Schema(
  {
    // 🔹 Reference to the institute that reported this disease
    Institute_ID: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },

    // 🔹 Employee linked to this disease
    Employee_ID: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // 🔹 True if this disease entry is for a family member
    IsFamilyMember: {
      type: Boolean,
      default: false,
    },

    // 🔹 Reference to FamilyMember (if applicable)
    FamilyMember_ID: {
      type: Schema.Types.ObjectId,
      ref: "FamilyMember",
      default: null,
    },

    // 🔹 Disease details
    Disease_Name: {
      type: String,
      required: true,
      trim: true,
    },
    Category: {
      type: String,
      enum: ["Communicable", "Non-Communicable"],
      required: true,
    },
    Description: {
      type: String,
      trim: true,
    },
    Symptoms: {
      type: [String],
      default: [],
    },
    Common_Medicines: {
      type: [String],
      default: [],
    },
    Severity_Level: {
      type: String,
      enum: ["Mild", "Moderate", "Severe", "Chronic"],
      default: "Mild",
    },

    // 🔹 Additional context
    Diagnosis: {
      type: String,
      trim: true,
      default: "",
    },

    Notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Disease", DiseaseSchema);
