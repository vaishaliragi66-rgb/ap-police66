const mongoose = require("mongoose");

const InstitutionCredentialSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },

    role: {
      type: String,
      enum: ["doctor", "pharmacist", "diagnosis", "xray","front_desk"],
      required: true,
    },

    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate role per institute
InstitutionCredentialSchema.index({ instituteId: 1, role: 1 }, { unique: true });

module.exports = mongoose.model(
  "InstitutionCredential",
  InstitutionCredentialSchema
);