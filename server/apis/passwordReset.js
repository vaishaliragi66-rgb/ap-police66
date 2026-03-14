const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const PasswordResetOtp = require("../models/passwordResetOtp");
const Admin = require("../models/admin");
const Institute = require("../models/master_institute");
const Employee = require("../models/employee");

// Roles allowed to use forgot-password
const ALLOWED_ROLES = ["admin", "institute", "employee"];

// OTP valid for 5 minutes
const OTP_TTL_MS = 5 * 60 * 1000;

// Minimum gap between OTP requests (1 minute)
const OTP_RATE_LIMIT_MS = 60 * 1000;

// ─── Email transporter ────────────────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.ADMIN_EMAIL_PASS,
    },
  });

// ─── Generate a secure 6-digit numeric OTP ───────────────────────────────────
const generateOtp = () => {
  const bytes = crypto.randomBytes(3);
  const num = (bytes.readUIntBE(0, 3) % 900000) + 100000;
  return String(num);
};

// ─── Look up user by identifier and role ─────────────────────────────────────
const findUserByIdentifier = async (identifier, role) => {
  const id = identifier.toLowerCase().trim();

  if (role === "admin") {
    return Admin.findOne({ email: id });
  }

  if (role === "institute") {
    return Institute.findOne({ Email_ID: id });
  }

  if (role === "employee") {
    return Employee.findOne({ Email: id });
  }

  return null;
};

// ─── POST /auth/request-password-reset ───────────────────────────────────────
router.post("/request-password-reset", async (req, res) => {
  try {
    const { identifier, role } = req.body;

    if (!identifier || !role) {
      return res
        .status(400)
        .json({ success: false, message: "Email and role are required." });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Password reset is not available for this role.",
      });
    }

    const normalizedId = identifier.toLowerCase().trim();

    // Check if user exists
    const user = await findUserByIdentifier(normalizedId, role);
    if (!user) {
      // Generic message to avoid user enumeration
      return res.status(404).json({
        success: false,
        message: "No account found with this email address.",
      });
    }

    // Rate limiting — block if a recent OTP already exists
    const existing = await PasswordResetOtp.findOne({
      identifier: normalizedId,
      role,
    });

    if (existing) {
      const age = Date.now() - new Date(existing.createdAt).getTime();
      if (age < OTP_RATE_LIMIT_MS) {
        const waitSec = Math.ceil((OTP_RATE_LIMIT_MS - age) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSec} second(s) before requesting another OTP.`,
        });
      }
    }

    // Generate OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Upsert — replaces any previous OTP for this identifier+role
    await PasswordResetOtp.findOneAndUpdate(
      { identifier: normalizedId, role },
      { otp, expiresAt, createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Determine display name for email
    let displayName = "User";
    if (role === "admin") displayName = user.name || "Admin";
    else if (role === "institute") displayName = user.Institute_Name || "Institute";
    else if (role === "employee") displayName = user.Name || "Employee";

    // Send OTP email
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"AP Police Medical System" <${process.env.ADMIN_EMAIL}>`,
      to: role === "employee" ? user.Email : role === "institute" ? user.Email_ID : user.email,
      subject: "Password Reset OTP — AP Police Medical System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #4A70A9; margin-bottom: 8px;">Password Reset Request</h2>
          <p style="color: #374151;">Hello <strong>${displayName}</strong>,</p>
          <p style="color: #374151;">
            We received a request to reset your password for the
            <strong>AP Police Medical System</strong>.
          </p>
          <p style="color: #374151;">Your One-Time Password (OTP) is:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="
              display: inline-block;
              font-size: 36px;
              font-weight: 700;
              letter-spacing: 10px;
              color: #1F2933;
              background: #EAF2FF;
              padding: 16px 32px;
              border-radius: 10px;
            ">${otp}</span>
          </div>
          <p style="color: #6B7280; font-size: 14px;">
            This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.
          </p>
          <p style="color: #6B7280; font-size: 13px;">
            If you did not request a password reset, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            AP Police Medical System &bull; Secure Access Portal
          </p>
        </div>
      `,
    });

    return res.json({
      success: true,
      message: "OTP sent to your registered email address.",
    });
  } catch (err) {
    console.error("request-password-reset error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─── POST /auth/reset-password ────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { identifier, role, otp, newPassword } = req.body;

    if (!identifier || !role || !otp || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Password reset is not available for this role.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    if (!/^[0-9]{6}$/.test(otp.trim())) {
      return res
        .status(400)
        .json({ success: false, message: "OTP must be exactly 6 digits." });
    }

    const normalizedId = identifier.toLowerCase().trim();

    // Find OTP record
    const otpRecord = await PasswordResetOtp.findOne({
      identifier: normalizedId,
      role,
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    // Check expiry
    if (new Date() > otpRecord.expiresAt) {
      await PasswordResetOtp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP. Please try again." });
    }

    // Find user
    const user = await findUserByIdentifier(normalizedId, role);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password — use findByIdAndUpdate to skip pre-save hook (already hashed)
    if (role === "admin") {
      await Admin.findByIdAndUpdate(user._id, { $set: { password: hashedPassword } });
    } else if (role === "institute") {
      await Institute.findByIdAndUpdate(user._id, { $set: { password: hashedPassword } });
    } else if (role === "employee") {
      await Employee.findByIdAndUpdate(user._id, { $set: { Password: hashedPassword } });
    }

    // Invalidate OTP
    await PasswordResetOtp.deleteOne({ _id: otpRecord._id });

    return res.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("reset-password error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

module.exports = router;
