import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaUserShield } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        `${BACKEND_URL}/admin-api/login`,
        { 
          email: email.trim().toLowerCase(), 
          password: password 
        }
      );

      if (res.data.success) {
        // ✅ Save Admin Data to localStorage
        console.log("ADMIN LOGIN RESPONSE:", res.data);
        
        localStorage.setItem("adminToken", res.data.token);
        localStorage.setItem("adminId", res.data.admin._id);
        localStorage.setItem("adminName", res.data.admin.name);
        localStorage.setItem("adminEmail", res.data.admin.email);
        localStorage.setItem("adminRole", res.data.admin.role);
        localStorage.setItem("adminPermissions", JSON.stringify(res.data.admin.permissions));
        
        // Clear any existing employee data (optional)
        localStorage.removeItem("employeeToken");
        localStorage.removeItem("employeeId");
        localStorage.removeItem("employeeName");

        // Navigate to admin dashboard
        navigate("/admin/dashboard");
      } else {
        setError(res.data.message || "Login failed");
      }

    } catch (error) {
      console.error("Admin login error:", error);
      
      // Handle different error types
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.response?.status === 401) {
        setError("Invalid email or password");
      } else if (error.response?.status === 403) {
        setError("Account is deactivated. Please contact super admin.");
      } else if (error.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear error when user starts typing
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(191,219,254,0.65), transparent 28%), radial-gradient(circle at right center, rgba(224,242,254,0.7), transparent 30%), linear-gradient(180deg, #F5FAFF, #EEF6FF)",
        fontFamily: "Inter, sans-serif",
        padding: "30px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "-70px",
            width: "240px",
            height: "240px",
            borderRadius: "999px",
            background: "rgba(147,197,253,0.35)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "-90px",
            bottom: "12%",
            width: "280px",
            height: "280px",
            borderRadius: "999px",
            background: "rgba(186,230,253,0.4)",
            filter: "blur(70px)",
          }}
        />
      </div>

      {/* Header */}
      <div className="text-center mb-4 position-relative" style={{ zIndex: 1 }}>
        <div
          className="mx-auto d-flex align-items-center justify-content-center mb-3"
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, #DBEAFE, #FFFFFF)",
            color: "#2563EB",
            border: "1px solid rgba(255,255,255,0.8)",
            boxShadow: "0 18px 34px rgba(147,197,253,0.28)",
            backdropFilter: "blur(14px)",
          }}
        >
          <FaUserShield size={32} />
        </div>
  
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 14px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(255,255,255,0.85)",
            color: "#2563EB",
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            marginBottom: "14px",
            boxShadow: "0 12px 26px rgba(147,197,253,0.18)",
          }}
        >
          Secure Access
        </div>

        <h2 className="fw-semibold text-dark mb-2" style={{ letterSpacing: "-0.03em" }}>Admin Login</h2>
  
        <div
          style={{
            width: "70px",
            height: "3px",
            background: "linear-gradient(90deg, #60A5FA, #BFDBFE)",
            opacity: 0.7,
            borderRadius: "3px",
            margin: "0 auto 14px auto",
          }}
        />
  
        <p className="text-muted" style={{ fontSize: "0.95rem" }}>
          Secure access to administrator dashboard
        </p>
      </div>
  
      {/* Error */}
      {error && (
        <div
          className="alert alert-danger w-100 mb-3"
          style={{ maxWidth: "420px", zIndex: 1, borderRadius: "18px", border: "1px solid rgba(248,113,113,0.25)" }}
        >
          {error}
        </div>
      )}
  
      {/* Login Card */}
      <div
        className="w-100"
        style={{
          maxWidth: "420px",
          background: "rgba(255,255,255,0.72)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.85)",
          boxShadow: "0 24px 44px rgba(148,184,255,0.18)",
          backdropFilter: "blur(18px)",
          padding: "36px 32px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <form onSubmit={handleLogin}>
          {/* Email */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold">
              Email Address
            </label>
            <input
              type="email"
              className="form-control border-0 shadow-sm"
              placeholder="admin@example.com"
              value={email}
              onChange={handleEmailChange}
              disabled={loading}
              required
              style={{
                backgroundColor: "rgba(248,250,252,0.96)",
                borderRadius: "14px",
                height: "46px",
                boxShadow: "0 8px 18px rgba(148,163,184,0.12)",
              }}
            />
          </div>
  
          {/* Password */}
          <div className="mb-4">
            <label className="form-label text-muted small fw-semibold">
              Password
            </label>
            <div className="input-group shadow-sm">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control border-0"
                placeholder="Enter your password"
                value={password}
                onChange={handlePasswordChange}
                disabled={loading}
                required
                style={{
                  backgroundColor: "rgba(248,250,252,0.96)",
                  borderRadius: "14px 0 0 14px",
                  height: "46px",
                  boxShadow: "0 8px 18px rgba(148,163,184,0.12)",
                }}
              />
              <button
                type="button"
                className="btn border-0"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  backgroundColor: "rgba(248,250,252,0.96)",
                  borderRadius: "0 14px 14px 0",
                  color: "#2563EB",
                  boxShadow: "0 8px 18px rgba(148,163,184,0.12)",
                }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
  
          {/* Forgot Password */}
          <div className="text-end mb-4">
            <Link
              to="/admin/forgot-password"
              className="small text-muted text-decoration-none"
            >
              Forgot Password?
            </Link>
          </div>
  
          {/* Button */}
          <button
            type="submit"
            className="btn w-100 fw-semibold"
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #2563EB, #38BDF8)",
              color: "#fff",
              borderRadius: "16px",
              height: "48px",
              fontSize: "0.95rem",
              letterSpacing: "0.4px",
              boxShadow: "0 14px 28px rgba(96,165,250,0.34)",
              border: "none",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px) scale(1.01)";
              e.target.style.boxShadow = "0 18px 30px rgba(96,165,250,0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 14px 28px rgba(96,165,250,0.34)";
            }}
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </button>
        </form>
      </div>
  
      {/* Security Note */}
      <div
        className="text-center mt-4"
        style={{
          backgroundColor: "rgba(255,255,255,0.7)",
          border: "1px solid rgba(255,255,255,0.85)",
          borderRadius: "18px",
          padding: "12px 16px",
          maxWidth: "420px",
          boxShadow: "0 16px 30px rgba(191,219,254,0.18)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <p className="text-muted small mb-0">
          🔒 Secure administrator access • All actions are logged
        </p>
      </div>
    </div>
  );
  
};

export default AdminLogin;
