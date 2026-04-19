import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaUserLock } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import HealthShield from "../../assets/Employee_login.svg";

const Employeelogin = () => {
  const [absNo, setAbsNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:6100';

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // Validate ABS Number
    if (!absNo.trim()) {
      setMessage("❌ ABS Number is required");
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setMessage("❌ Password is required");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        `${BACKEND_URL}/employee-api/login`,
        { ABS_NO: absNo.trim(), Password: password.trim() }
      );

      /* SAVE EMPLOYEE DATA */
      console.log("LOGIN RESPONSE PAYLOAD:", res.data.payload);

      localStorage.setItem("employeeToken", res.data.payload.token);
      localStorage.setItem("employeeId", res.data.payload.id);
      localStorage.setItem("employeeName", res.data.payload.Name);
      localStorage.setItem("employeeDesignation", res.data.payload.Designation);
      localStorage.setItem("employeeABS", res.data.payload.ABS_NO);
      localStorage.setItem("employeeObjectId", res.data.payload._id);

      setMessage("✅ Login successful");

      setTimeout(() => {
        navigate("/employee/home");
      }, 1000);
    } catch (error) {
      setMessage(
        "❌ " + (error.response?.data?.message || "Invalid credentials")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(191,219,254,0.62), transparent 24%), radial-gradient(circle at right center, rgba(224,242,254,0.74), transparent 28%), linear-gradient(180deg, #F5FAFF, #EEF6FF)",
        fontFamily: "Inter, sans-serif"
      }}
    >
      {/* LEFT SIDE */}
      <div
        className="d-none d-md-flex flex-column justify-content-center align-items-center text-center"
        style={{
          width: "50%",
          background: "linear-gradient(135deg, rgba(219,234,254,0.92), rgba(255,255,255,0.68))",
          padding: "60px",
          borderRight: "1px solid rgba(255,255,255,0.82)",
        }}
      >
        <div
          className="d-flex align-items-center justify-content-center mb-4"
          style={{
            width: "140px",
            height: "140px",
            borderRadius: "36px",
            background: "rgba(255,255,255,0.62)",
            border: "1px solid rgba(255,255,255,0.82)",
            boxShadow: "0 24px 44px rgba(148,184,255,0.16)",
            backdropFilter: "blur(16px)",
          }}
        >
          <img
            src={HealthShield}
            alt="Health & Safety"
            style={{
              width: "400px",
              height: "400px",
            }}
          />
        </div>

        <h2 style={{ color: "#1F2933", fontWeight: 600 }}>
          AP Police Medical System
        </h2>

        <p
          style={{
            color: "#6B7280",
            fontSize: "15px",
            maxWidth: "360px",
            marginTop: "12px",
          }}
        >
          Secure access for employees to manage medical inventory, records,
          and internal operations.
        </p>
      </div>

      {/* RIGHT SIDE */}
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{
          width: "100%",
          maxWidth: "500px",
          margin: "0 auto",
          padding: "40px 24px",
        }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div
            className="mx-auto d-flex align-items-center justify-content-center mb-3"
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #DBEAFE, #FFFFFF)",
              color: "#2563EB",
              border: "1px solid rgba(255,255,255,0.84)",
              boxShadow: "0 16px 30px rgba(147,197,253,0.2)",
            }}
          >
            <FaUserLock size={28} />
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "7px 14px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.74)",
              border: "1px solid rgba(255,255,255,0.86)",
              color: "#2563EB",
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              marginBottom: "14px",
              boxShadow: "0 12px 26px rgba(147,197,253,0.18)",
            }}
          >
            Employee Access
          </div>

          <h3 style={{ fontWeight: 600, color: "#1F2933", letterSpacing: "-0.03em" }}>
            Employee Login
          </h3>
          <p style={{ color: "#6B7280", fontSize: "14px" }}>
            Login using your ABS number and password
          </p>
        </div>

        {/* Login Card */}
        <div
          className="w-100"
          style={{
            background: "rgba(255,255,255,0.78)",
            borderRadius: "24px",
            padding: "32px",
            border: "1px solid rgba(255,255,255,0.86)",
            boxShadow: "0 24px 44px rgba(148,184,255,0.18)",
            backdropFilter: "blur(18px)",
          }}
        >
          <form onSubmit={handleLogin}>
            {/* ABS Number */}
            <div className="mb-3">
              <label className="form-label">ABS Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter ABS Number"
                value={absNo}
                onChange={(e) => setAbsNo(e.target.value)}
                minLength="6"
                required
                style={{
                  minHeight: "46px",
                  borderRadius: "14px",
                  border: "1px solid rgba(191,219,254,0.75)",
                  background: "rgba(248,250,252,0.96)",
                  boxShadow: "0 10px 20px rgba(148,163,184,0.08)",
                }}
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="form-label">Password</label>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    minHeight: "46px",
                    borderRadius: "14px 0 0 14px",
                    border: "1px solid rgba(191,219,254,0.75)",
                    background: "rgba(248,250,252,0.96)",
                    boxShadow: "0 10px 20px rgba(148,163,184,0.08)",
                  }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    borderRadius: "0 14px 14px 0",
                    border: "1px solid rgba(191,219,254,0.75)",
                    borderLeft: "none",
                    background: "rgba(248,250,252,0.96)",
                    color: "#2563EB",
                    boxShadow: "0 10px 20px rgba(148,163,184,0.08)",
                  }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-end mb-3" style={{ marginTop: "-8px" }}>
              <Link
                to="/employee/forgot-password"
                style={{
                  fontSize: "13px",
                  color: "#4A70A9",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Forgot Password?
              </Link>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-100"
              style={{
                background: "linear-gradient(135deg, #2563EB, #38BDF8)",
                color: "#fff",
                border: "none",
                borderRadius: "16px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: 600,
                boxShadow: "0 14px 28px rgba(96,165,250,0.28)",
              }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* MESSAGE ALERT */}
          {message && (
            <div
              className={`alert mt-3 text-center ${
                message.startsWith("✅")
                  ? "alert-success"
                  : "alert-danger"
              }`}
              style={{ borderRadius: "18px" }}
            >
              {message}
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-3">
            <p style={{ fontSize: "13px", color: "#6B7280" }}>
              Don’t have an account?{" "}
              <Link
                to="/employee-register"
                style={{
                  color: "#4A70A9",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Employeelogin;
