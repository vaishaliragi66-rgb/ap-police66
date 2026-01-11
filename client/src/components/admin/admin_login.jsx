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
        backgroundColor: "#f5f6f7",
        fontFamily: "Inter, sans-serif",
        padding: "30px 20px",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <div className="mb-3">
          <div 
            className="rounded-circle mx-auto d-flex align-items-center justify-content-center"
            style={{
              width: "80px",
              height: "80px",
              backgroundColor: "#1c1c1c",
              color: "white"
            }}
          >
            <FaUserShield size={32} />
          </div>
        </div>
        <h2 className="fw-bold text-dark mb-2">Admin Login</h2>
        <div
          style={{
            width: "70px",
            height: "3px",
            backgroundColor: "#1c1c1c",
            borderRadius: "3px",
            margin: "0 auto 15px auto",
          }}
        ></div>
        <p className="text-muted" style={{ fontSize: "0.95rem" }}>
          Access the administrator dashboard
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show w-100 mb-3" style={{ maxWidth: "400px" }}>
          <strong>Error:</strong> {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError("")}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Login Card */}
      <div
        className="bg-white p-5 rounded-4 shadow-sm w-100"
        style={{
          maxWidth: "400px",
          border: "1px solid #e5e5e5",
          boxShadow: "0 8px 25px rgba(0, 0, 0, 0.07)",
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
              required
              disabled={loading}
              style={{
                backgroundColor: "#f8f8f8",
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
              required
              disabled={loading}
              style={{
                backgroundColor: "#f8f8f8",
                borderRadius: "10px",
                height: "42px",
              }}
            />
          </div>

          {/* Forgot Password Link (Optional) */}
          <div className="text-end mb-4">
            <Link
              to="/admin/forgot-password"
              className="small text-muted text-decoration-none"
              style={{ fontSize: "0.85rem" }}
            >
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="btn w-100 fw-semibold"
            disabled={loading}
            style={{
              background: "linear-gradient(180deg, #1c1c1c, #000)",
              color: "#fff",
              borderRadius: "10px",
              height: "45px",
              fontSize: "0.95rem",
              transition: "0.3s ease",
              opacity: loading ? 0.7 : 1,
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.background = "linear-gradient(180deg, #000, #1c1c1c)";
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.background = "linear-gradient(180deg, #1c1c1c, #000)";
              }
            }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Logging in...
              </>
            ) : (
              "Login as Admin"
            )}
          </button>

          {/* Registration Link */}
          <div className="text-center mt-3">
            <p className="text-muted small mb-0">
              Need admin access?{" "}
              <Link
                to="/admin-register"
                className="fw-semibold"
                style={{ color: "#1c1c1c", cursor: "pointer" }}
              >
                Register here
              </Link>
            </p>
          </div>

          {/* Employee Login Link */}
          <div className="text-center mt-2">
            <p className="text-muted small mb-0">
              Are you an employee?{" "}
              <Link
                to="/employee-login"
                className="text-decoration-none"
                style={{ color: "#6c757d" }}
              >
                Employee Login
              </Link>
            </p>
          </div>
        </form>
      </div>

      {/* Security Notice */}
      <div className="text-center mt-4" style={{ maxWidth: "400px" }}>
        <p className="text-muted small mb-0">
          <i className="fas fa-shield-alt me-1"></i>
          This is a secure administrator portal. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;