const express = require("express");
const router = express.Router();
const axios = require("axios");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const PasswordResetOtp = require("../models/passwordResetOtp");
const Admin = require("../models/admin");
const Institute = require("../models/master_institute");
const Employee = require("../models/employee");

const ALLOWED_ROLES = ["admin", "institute", "employee"];
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RATE_LIMIT_MS = 60 * 1000;
const EMAIL_REGEX = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.ADMIN_EMAIL_PASS,
    },
  });

const generateOtp = () => {
  const bytes = crypto.randomBytes(3);
  const num = (bytes.readUIntBE(0, 3) % 900000) + 100000;
  return String(num);
};

const normalizeEmployeePhone = (value = "") => {
  const digits = String(value).replace(/\D/g, "");

  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);

  return digits;
};

const normalizeIdentifier = (identifier, role) => {
  if (role === "employee") {
    return normalizeEmployeePhone(identifier);
  }

  return String(identifier).toLowerCase().trim();
};

const isValidIdentifier = (identifier, role) => {
  if (role === "employee") {
    return PHONE_REGEX.test(identifier);
  }

  return EMAIL_REGEX.test(identifier);
};

const maskPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || phoneNumber.length < 4) {
    return "your registered phone number";
  }

  return `XXXXXX${phoneNumber.slice(-4)}`;
};

const formatIndianPhoneForSms = (phoneNumber) => `+91${phoneNumber}`;

const sendOtpEmail = async ({ role, user, otp }) => {
  const emailUser = process.env.ADMIN_EMAIL;
  const emailPass = process.env.ADMIN_EMAIL_PASS;

  if (!emailUser || !emailPass) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email OTP configuration is missing.");
    }

    console.warn(
      `[password-reset] Email credentials are missing. OTP for ${role}: ${otp}`
    );

    return {
      deliveryMessage: "Email sender is not configured. OTP generated for local testing.",
      debugOtp: otp,
    };
  }

  let displayName = "User";

  if (role === "admin") displayName = user.name || "Admin";
  if (role === "institute") displayName = user.Institute_Name || "Institute";
  if (role === "employee") displayName = user.Name || "Employee";

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"AP Police Medical System" <${process.env.ADMIN_EMAIL}>`,
    to: role === "employee" ? user.Email : role === "institute" ? user.Email_ID : user.email,
    subject: "Password Reset OTP - AP Police Medical System",
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
          AP Police Medical System - Secure Access Portal
        </p>
      </div>
    `,
  });

  return {
    deliveryMessage: "OTP sent to your registered email address.",
  };
};

const sendOtpSms = async ({ phoneNumber, otp }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Twilio SMS configuration is missing.");
    }

    console.warn(
      `[password-reset] Twilio credentials are missing. OTP for ${phoneNumber}: ${otp}`
    );

    return {
      deliveryMessage: `OTP generated for ${maskPhoneNumber(phoneNumber)}.`,
      debugOtp: otp,
    };
  }

  const params = new URLSearchParams({
    To: formatIndianPhoneForSms(phoneNumber),
    From: fromNumber,
    Body: `AP Police Medical System OTP: ${otp}. Valid for 5 minutes. Do not share it with anyone.`,
  });

  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    params.toString(),
    {
      auth: {
        username: accountSid,
        password: authToken,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return {
    deliveryMessage: `OTP sent to ${maskPhoneNumber(phoneNumber)}.`,
  };
};

const sendOtpForUser = async ({ role, user, otp }) => {
  if (role === "employee") {
    const normalizedPhone = normalizeEmployeePhone(user.Phone_No || "");

    if (!PHONE_REGEX.test(normalizedPhone)) {
      throw new Error("Employee does not have a valid registered phone number.");
    }

    return sendOtpSms({ phoneNumber: normalizedPhone, otp });
  }

  return sendOtpEmail({ role, user, otp });
};

const findUserByIdentifier = async (identifier, role) => {
  const id = normalizeIdentifier(identifier, role);

  if (role === "admin") {
    return Admin.findOne({ email: id });
  }

  if (role === "institute") {
    return Institute.findOne({ Email_ID: id });
  }

  if (role === "employee") {
    return Employee.findOne({
      $or: [
        { Phone_No: id },
        { Phone_No: `+91${id}` },
        { Phone_No: `91${id}` },
      ],
    });
  }

  return null;
};

router.post("/request-password-reset", async (req, res) => {
  try {
    const { identifier, role } = req.body;

    if (!identifier || !role) {
      return res.status(400).json({
        success: false,
        message: "Identifier and role are required.",
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Password reset is not available for this role.",
      });
    }

    const normalizedId = normalizeIdentifier(identifier, role);

    if (!isValidIdentifier(normalizedId, role)) {
      return res.status(400).json({
        success: false,
        message:
          role === "employee"
            ? "Please enter a valid 10-digit phone number."
            : "Please enter a valid email address.",
      });
    }

    const user = await findUserByIdentifier(normalizedId, role);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          role === "employee"
            ? "No account found with this phone number."
            : "No account found with this email address.",
      });
    }

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

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await PasswordResetOtp.findOneAndUpdate(
      { identifier: normalizedId, role },
      { otp, expiresAt, createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const deliveryResult = await sendOtpForUser({ role, user, otp });
    const payload = {
      success: true,
      message: deliveryResult.deliveryMessage,
    };

    if (deliveryResult.debugOtp) {
      payload.debugOtp = deliveryResult.debugOtp;
    }

    return res.json(payload);
  } catch (err) {
    console.error("request-password-reset error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error. Please try again.",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { identifier, role, otp, newPassword } = req.body;

    if (!identifier || !role || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
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
      return res.status(400).json({
        success: false,
        message: "OTP must be exactly 6 digits.",
      });
    }

    const normalizedId = normalizeIdentifier(identifier, role);

    if (!isValidIdentifier(normalizedId, role)) {
      return res.status(400).json({
        success: false,
        message:
          role === "employee"
            ? "Please enter a valid 10-digit phone number."
            : "Please enter a valid email address.",
      });
    }

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

    if (new Date() > otpRecord.expiresAt) {
      await PasswordResetOtp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (otpRecord.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    const user = await findUserByIdentifier(normalizedId, role);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    if (role === "admin") {
      await Admin.findByIdAndUpdate(user._id, { $set: { password: hashedPassword } });
    } else if (role === "institute") {
      await Institute.findByIdAndUpdate(user._id, { $set: { password: hashedPassword } });
    } else if (role === "employee") {
      await Employee.findByIdAndUpdate(user._id, { $set: { Password: hashedPassword } });
    }

    await PasswordResetOtp.deleteOne({ _id: otpRecord._id });

    return res.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("reset-password error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error. Please try again.",
    });
  }
});

module.exports = router;
