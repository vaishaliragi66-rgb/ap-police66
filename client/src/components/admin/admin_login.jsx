import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FaUserShield } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || 6100;

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
        `http://localhost:${BACKEND_PORT_NO}/admin-api/login`,
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
            width: "80px",
            height: "80px",
            backgroundColor: "#4A70A9",
            color: "#fff",
          }}
        >
          <FaUserShield size={32} />
        </div>
  
        <h2 className="fw-bold text-dark mb-2">Admin Login</h2>
  
        <div
          style={{
            width: "70px",
            height: "3px",
            backgroundColor: "#4A70A9",
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
          style={{ maxWidth: "400px" }}
        >
          {error}
        </div>
      )}
  
      {/* Login Card */}
      <div
        className="bg-white p-5 rounded-4 shadow-sm w-100"
        style={{
          maxWidth: "400px",
          border: "1px solid #E2E8F0",
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
                backgroundColor: "#F8FAFC",
                borderRadius: "10px",
                height: "42px",
              }}
            />
          </div>
  
          {/* Password */}
          <div className="mb-4">
            <label className="form-label text-muted small fw-semibold">
              Password
            </label>
            <input
              type="password"
              className="form-control border-0 shadow-sm"
              placeholder="Enter your password"
              value={password}
              onChange={handlePasswordChange}
              disabled={loading}
              required
              style={{
                backgroundColor: "#F8FAFC",
                borderRadius: "10px",
                height: "42px",
              }}
            />
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
              background: "linear-gradient(135deg, #4A70A9, #355C8C)",
              color: "#fff",
              borderRadius: "12px",
              height: "46px",
              fontSize: "0.95rem",
              letterSpacing: "0.4px",
              boxShadow: "0 6px 14px rgba(74,112,169,0.35)",
              border: "none",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-1px)";
              e.target.style.boxShadow = "0 10px 20px rgba(74,112,169,0.45)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 6px 14px rgba(74,112,169,0.35)";
            }}
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </button>

  
          {/* Links */}
          <div className="text-center mt-3">
            <p className="text-muted small mb-0">
              Need admin access?{" "}
              <Link
                to="/admin-register"
                className="fw-semibold text-decoration-none"
                style={{ color: "#4A70A9" }}
              >
                Register here
              </Link>
            </p>
          </div>
  
          <div className="text-center mt-2">
            <p className="text-muted small mb-0">
              Are you an employee?{" "}
              <Link
                to="/employee-login"
                className="text-decoration-none"
                style={{ color: "#6B7280" }}
              >
                Employee Login
              </Link>
            </p>
          </div>
        </form>
      </div>
  
      {/* Security Note */}
      <div
        className="text-center mt-4"
        style={{
          backgroundColor: "#F3F7FF",
          border: "1px solid #D6E0F0",
          borderRadius: "10px",
          padding: "10px",
          maxWidth: "400px",
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