import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { FaLock, FaEnvelope, FaShieldAlt, FaCheckCircle } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

const BACKEND_API = import.meta.env.VITE_BACKEND_API


const ROLE_CONFIG = {
  admin: {
    label: "Admin",
    loginPath: "/admin/login",
    color: "#4A70A9",
    placeholder: "Enter your admin email address",
  },
  employee: {
    label: "Employee",
    loginPath: "/employee-login",
    color: "#4A70A9",
    placeholder: "Enter your registered email address",
  },
  institute: {
    label: "Institute",
    loginPath: "/institutes/login",
    color: "#4A70A9",
    placeholder: "Enter your institute email address",
  },
};

// Derive role from URL path
const getRoleFromPath = (pathname) => {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/employee")) return "employee";
  if (pathname.startsWith("/institutes")) return "institute";
  return null;
};

const ForgotPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const role = getRoleFromPath(location.pathname);
  const config = ROLE_CONFIG[role];

  const [step, setStep] = useState(1); // 1 = request OTP, 2 = reset password
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resetDone, setResetDone] = useState(false);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Redirect if invalid role
  useEffect(() => {
    if (!role || !config) {
      navigate("/");
    }
  }, [role, config, navigate]);

  if (!role || !config) return null;

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  // ── Step 1: Request OTP ──────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;
    if (!emailRegex.test(trimmedId)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_API}/auth/request-password-reset`, {
        identifier: trimmedId,
        role,
      });

      if (res.data.success) {
        setSuccess("OTP sent to your registered email. Please check your inbox.");
        setStep(2);
        setCountdown(60);
      } else {
        setError(res.data.message || "Failed to send OTP.");
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 429) {
        setError(msg || "Too many requests. Please wait before trying again.");
        const match = msg?.match(/(\d+) second/);
        if (match) setCountdown(parseInt(match[1]));
      } else {
        setError(msg || "Failed to send OTP. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Reset Password ────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    const trimmedOtp = otp.trim();
    const trimmedPwd = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedOtp) {
      setError("Please enter the OTP.");
      return;
    }

    if (!/^[0-9]{6}$/.test(trimmedOtp)) {
      setError("OTP must be exactly 6 digits.");
      return;
    }

    if (!trimmedPwd) {
      setError("Please enter a new password.");
      return;
    }

    if (trimmedPwd.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (trimmedPwd !== trimmedConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_API}/auth/reset-password`, {
        identifier: identifier.trim(),
        role,
        otp: trimmedOtp,
        newPassword: trimmedPwd,
      });

      if (res.data.success) {
        setSuccess(res.data.message);
        setResetDone(true);
      } else {
        setError(res.data.message || "Failed to reset password.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    clearMessages();
    setOtp("");
    setLoading(true);

    try {
      const res = await axios.post(`${BACKEND_API}/auth/request-password-reset`, {
        identifier: identifier.trim(),
        role,
      });

      if (res.data.success) {
        setSuccess("A new OTP has been sent to your email.");
        setCountdown(60);
      } else {
        setError(res.data.message || "Failed to resend OTP.");
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 429) {
        setError(msg || "Please wait before requesting another OTP.");
        const match = msg?.match(/(\d+) second/);
        if (match) setCountdown(parseInt(match[1]));
      } else {
        setError(msg || "Failed to resend OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100"
      style={{
        background: "linear-gradient(180deg, #F8FAFC, #EEF2F7)",
        fontFamily: "Inter, sans-serif",
        padding: "30px 20px",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <div
          className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
          style={{
            width: "72px",
            height: "72px",
            backgroundColor: config.color,
            color: "#fff",
          }}
        >
          <FaLock size={28} />
        </div>

        <h3 className="fw-bold text-dark mb-1">
          {config.label} — Forgot Password
        </h3>

        <div
          style={{
            width: "60px",
            height: "3px",
            backgroundColor: config.color,
            opacity: 0.7,
            borderRadius: "3px",
            margin: "8px auto 12px auto",
          }}
        />

        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
          {step === 1
            ? "Enter your registered email to receive an OTP"
            : "Enter the OTP and your new password"}
        </p>
      </div>

      {/* Step indicator */}
      <div className="d-flex align-items-center gap-2 mb-4">
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div
              className="d-flex align-items-center justify-content-center rounded-circle fw-semibold"
              style={{
                width: "32px",
                height: "32px",
                fontSize: "13px",
                backgroundColor:
                  step >= s ? config.color : "#E2E8F0",
                color: step >= s ? "#fff" : "#94A3B8",
                transition: "all 0.3s ease",
              }}
            >
              {step > s ? <FaCheckCircle size={14} /> : s}
            </div>
            {s < 2 && (
              <div
                style={{
                  width: "48px",
                  height: "2px",
                  backgroundColor: step > s ? config.color : "#E2E8F0",
                  transition: "all 0.3s ease",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div
          className="alert alert-danger w-100 mb-3 d-flex align-items-center gap-2"
          style={{ maxWidth: "420px", borderRadius: "10px", fontSize: "14px" }}
        >
          <span>⚠️</span> {error}
        </div>
      )}

      {success && !resetDone && (
        <div
          className="alert alert-success w-100 mb-3 d-flex align-items-center gap-2"
          style={{ maxWidth: "420px", borderRadius: "10px", fontSize: "14px" }}
        >
          <span>✅</span> {success}
        </div>
      )}

      {/* ── Success screen ─────────────────────────────────────────────────── */}
      {resetDone ? (
        <div
          className="bg-white w-100 text-center"
          style={{
            maxWidth: "420px",
            borderRadius: "16px",
            padding: "40px 32px",
            border: "1px solid #D6E0F0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.07)",
          }}
        >
          <div
            className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-4"
            style={{
              width: "72px",
              height: "72px",
              backgroundColor: "#D1FAE5",
              color: "#059669",
            }}
          >
            <FaCheckCircle size={34} />
          </div>

          <h5 className="fw-bold text-dark mb-2">Password Reset Successful</h5>
          <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
            Your password has been updated. You can now log in with your new
            password.
          </p>

          <Link
            to={config.loginPath}
            className="btn fw-semibold w-100"
            style={{
              backgroundColor: config.color,
              color: "#fff",
              borderRadius: "999px",
              padding: "10px",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            Go to Login
          </Link>
        </div>
      ) : (
        /* ── Main card ──────────────────────────────────────────────────── */
        <div
          className="bg-white w-100"
          style={{
            maxWidth: "420px",
            borderRadius: "16px",
            padding: "32px",
            border: "1px solid #D6E0F0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.07)",
          }}
        >
          {/* ─── STEP 1: Request OTP ─── */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp}>
              <div className="mb-4">
                <label
                  className="form-label text-muted"
                  style={{ fontSize: "13px", fontWeight: 600 }}
                >
                  <FaEnvelope className="me-1" /> Email Address
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder={config.placeholder}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    clearMessages();
                  }}
                  disabled={loading}
                  required
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: "10px",
                    height: "44px",
                    border: "1px solid #D6E0F0",
                    fontSize: "14px",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn w-100 fw-semibold"
                style={{
                  backgroundColor: config.color,
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "10px",
                  fontSize: "14px",
                  border: "none",
                }}
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* ─── STEP 2: Reset Password ─── */}
          {step === 2 && (
            <form onSubmit={handleResetPassword}>
              {/* Email display (readonly) */}
              <div className="mb-3">
                <label
                  className="form-label text-muted"
                  style={{ fontSize: "13px", fontWeight: 600 }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={identifier}
                  readOnly
                  style={{
                    backgroundColor: "#F1F5F9",
                    borderRadius: "10px",
                    height: "44px",
                    border: "1px solid #D6E0F0",
                    fontSize: "14px",
                    color: "#64748B",
                  }}
                />
              </div>

              {/* OTP */}
              <div className="mb-3">
                <label
                  className="form-label text-muted"
                  style={{ fontSize: "13px", fontWeight: 600 }}
                >
                  <FaShieldAlt className="me-1" /> One-Time Password (OTP)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(val);
                    clearMessages();
                  }}
                  disabled={loading}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: "10px",
                    height: "44px",
                    border: "1px solid #D6E0F0",
                    fontSize: "20px",
                    letterSpacing: "8px",
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                />
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                    OTP expires in 5 minutes
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || loading}
                    className="btn btn-link p-0"
                    style={{
                      fontSize: "12px",
                      color: countdown > 0 ? "#94A3B8" : config.color,
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="mb-3">
                <label
                  className="form-label text-muted"
                  style={{ fontSize: "13px", fontWeight: 600 }}
                >
                  <FaLock className="me-1" /> New Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    clearMessages();
                  }}
                  disabled={loading}
                  minLength={8}
                  required
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: "10px",
                    height: "44px",
                    border: "1px solid #D6E0F0",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Confirm Password */}
              <div className="mb-4">
                <label
                  className="form-label text-muted"
                  style={{ fontSize: "13px", fontWeight: 600 }}
                >
                  <FaLock className="me-1" /> Confirm New Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearMessages();
                  }}
                  disabled={loading}
                  required
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: "10px",
                    height: "44px",
                    border:
                      confirmPassword && newPassword !== confirmPassword
                        ? "1px solid #EF4444"
                        : "1px solid #D6E0F0",
                    fontSize: "14px",
                  }}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <div style={{ fontSize: "12px", color: "#EF4444", marginTop: "4px" }}>
                    Passwords do not match
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn w-100 fw-semibold"
                style={{
                  backgroundColor: config.color,
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "10px",
                  fontSize: "14px",
                  border: "none",
                }}
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>
            </form>
          )}

          {/* Back to login link */}
          <div className="text-center mt-4">
            <Link
              to={config.loginPath}
              style={{
                fontSize: "13px",
                color: "#64748B",
                textDecoration: "none",
              }}
            >
              ← Back to {config.label} Login
            </Link>
          </div>
        </div>
      )}

      {/* Security note */}
      <div
        className="text-center mt-4"
        style={{
          backgroundColor: "#F3F7FF",
          border: "1px solid #D6E0F0",
          borderRadius: "10px",
          padding: "10px 16px",
          maxWidth: "420px",
        }}
      >
        <p className="text-muted mb-0" style={{ fontSize: "12px" }}>
          🔒 OTP is valid for 5 minutes and can only be used once
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
