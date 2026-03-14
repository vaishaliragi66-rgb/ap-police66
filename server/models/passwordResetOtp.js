const mongoose = require("mongoose");

const passwordResetOtpSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  role: {
    type: String,
    required: true,
    enum: ["admin", "institute", "employee"],
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// One active OTP per identifier+role combination
passwordResetOtpSchema.index({ identifier: 1, role: 1 }, { unique: true });

// MongoDB TTL index — auto-deletes expired documents
passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PasswordResetOtp", passwordResetOtpSchema);
