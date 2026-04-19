import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FaUserShield } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

const AdminRegister = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    dob: "",
    address: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("");
  const [passwordMatch, setPasswordMatch] = useState(true);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Check password strength and match when relevant fields change
    if (name === "password") {
      checkPasswordStrength(value);
      if (formData.confirmPassword) {
        setPasswordMatch(value === formData.confirmPassword);
      }
    }
    
    if (name === "confirmPassword") {
      setPasswordMatch(value === formData.password);
    }
    
    if (error) setError("");
  };

  const checkPasswordStrength = (password) => {
    if (password.length === 0) {
      setPasswordStrength("");
      return;
    }
    
    let strength = "Weak";
    let color = "danger";
    
    if (password.length >= 8) {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      const criteriaMet = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;
      
      if (criteriaMet >= 3 && password.length >= 10) {
        strength = "Strong";
        color = "success";
      } else if (criteriaMet >= 2) {
        strength = "Medium";
        color = "warning";
      }
    }
    
    setPasswordStrength(strength);
  };

  const validateForm = () => {
    // Check required fields
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("All fields are required");
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Password match validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    // Password strength validation
    if (passwordStrength === "Weak" && formData.password.length > 0) {
      setError("Password is too weak. Use at least 8 characters with mix of letters, numbers, and symbols");
      return false;
    }

    // Minimum password length
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Prepare data for API
      const adminData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        dob: formData.dob || null,
        address: formData.address || null,
        role: "admin",
        createdAt: new Date().toISOString()
      };

      console.log("Submitting admin registration...");

      const response = await axios.post(
        `${BACKEND_URL}/admin-api/register`,
        adminData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccess(response.data.message || "✅ Admin registered successfully!");
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        dob: "",
        address: "",
      });
      setPasswordStrength("");
      setPasswordMatch(true);

      // Navigate to admin login after 2 seconds
      setTimeout(() => {
        navigate("/admin/login");
      }, 2000);

    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.join(", ") ||
                          error.response?.data?.error || 
                          error.message || 
                          "❌ Registration failed!";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(191,219,254,0.62), transparent 28%), radial-gradient(circle at right center, rgba(224,242,254,0.7), transparent 30%), linear-gradient(180deg, #F5FAFF, #EEF6FF)",
        fontFamily: "'Inter', sans-serif",
        padding: "32px 16px",
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
            top: "-70px",
            left: "-60px",
            width: "260px",
            height: "260px",
            borderRadius: "999px",
            background: "rgba(147,197,253,0.32)",
            filter: "blur(70px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-90px",
            right: "-60px",
            width: "300px",
            height: "300px",
            borderRadius: "999px",
            background: "rgba(186,230,253,0.38)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Header */}
      <div className="text-center mb-4 position-relative" style={{ zIndex: 1 }}>
        <div
          className="mx-auto d-flex align-items-center justify-content-center mb-3"
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #DBEAFE, #FFFFFF)",
            color: "#2563EB",
            border: "1px solid rgba(255,255,255,0.8)",
            boxShadow: "0 16px 30px rgba(147,197,253,0.24)",
          }}
        >
          <FaUserShield size={30} />
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
          Administrator Setup
        </div>
  
        <h3 style={{ fontWeight: 600, color: "#1F2933", letterSpacing: "-0.03em" }}>
          Admin Registration
        </h3>
        <p style={{ color: "#6B7280", fontSize: "14px" }}>
          Create administrator account
        </p>
      </div>
  
      {/* Alerts */}
      {error && (
        <div
          className="alert alert-danger w-100 mb-3"
          style={{ maxWidth: "620px", fontSize: "14px", borderRadius: "18px", zIndex: 1 }}
        >
          {error}
        </div>
      )}
  
      {success && (
        <div
          className="alert alert-success w-100 mb-3"
          style={{ maxWidth: "620px", fontSize: "14px", borderRadius: "18px", zIndex: 1 }}
        >
          {success}
        </div>
      )}
  
      {/* Form Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "620px",
          background: "rgba(255,255,255,0.72)",
          borderRadius: "24px",
          padding: "32px",
          border: "1px solid rgba(255,255,255,0.88)",
          boxShadow: "0 24px 44px rgba(148,184,255,0.18)",
          backdropFilter: "blur(18px)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <style>
          {`
            .admin-register-card .form-control {
              background-color: rgba(248, 250, 252, 0.96);
              border: 1px solid rgba(191, 219, 254, 0.6);
              border-radius: 14px;
              min-height: 46px;
              box-shadow: 0 8px 18px rgba(148, 163, 184, 0.10);
            }

            .admin-register-card .form-control:focus {
              border-color: #60A5FA;
              box-shadow: 0 0 0 0.18rem rgba(96, 165, 250, 0.16);
            }
          `}
        </style>
        <form onSubmit={handleSubmit} className="admin-register-card">
          {/* Name */}
          <div className="mb-3">
            <label className="form-label small text-muted">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              className="form-control"
              placeholder="Enter full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
  
          {/* Email */}
          <div className="mb-3">
            <label className="form-label small text-muted">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
  
          {/* Passwords */}
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label small text-muted">
                Password *
              </label>
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              {passwordStrength && (
                <div
                  className="small mt-1"
                  style={{
                    color:
                      passwordStrength === "Strong"
                        ? "#198754"
                        : passwordStrength === "Medium"
                        ? "#FFC107"
                        : "#DC3545",
                  }}
                >
                  Password strength: {passwordStrength}
                </div>
              )}
            </div>
  
            <div className="col-md-6 mb-3">
              <label className="form-label small text-muted">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                className={`form-control ${
                  !passwordMatch && formData.confirmPassword
                    ? "is-invalid"
                    : ""
                }`}
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              {!passwordMatch && (
                <div className="invalid-feedback">
                  Passwords do not match
                </div>
              )}
            </div>
          </div>
  
          {/* DOB */}
          <div className="mb-3">
            <label className="form-label small text-muted">
              Date of Birth
            </label>
            <input
              type="date"
              name="dob"
              className="form-control"
              value={formData.dob}
              onChange={handleChange}
            />
          </div>
  
          {/* Address */}
          <div className="mb-4">
            <label className="form-label small text-muted">
              Address
            </label>
            <textarea
              name="address"
              className="form-control"
              rows="3"
              placeholder="Enter complete address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          {/* Password Requirements */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(239,246,255,0.95), rgba(255,255,255,0.82))",
              border: "1px solid rgba(191,219,254,0.7)",
              borderRadius: "18px",
              padding: "14px 16px",
              marginBottom: "24px",
              boxShadow: "0 12px 24px rgba(191,219,254,0.14)",
            }}
          >
            <p
              style={{
                marginBottom: "6px",
                fontWeight: 600,
                fontSize: "13px",
                color: "#1F2933",
              }}
            >
              Password Requirements
            </p>

            <ul
              style={{
                paddingLeft: "18px",
                margin: 0,
                fontSize: "13px",
                color: "#6B7280",
              }}
            >
              <li>Minimum 8 characters</li>
              <li>At least one uppercase letter</li>
              <li>At least one lowercase letter</li>
              <li>At least one number</li>
              <li>Special character recommended</li>
            </ul>
          </div>

  
          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #2563EB, #38BDF8)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "16px",
              padding: "12px",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "0 14px 28px rgba(96,165,250,0.32)",
              transition: "all 0.3s ease",
            }}
          >
            {loading ? "Creating account..." : "Register Admin"}
          </button>
  
          {/* Login Link */}
          <div className="text-center mt-3">
            <p style={{ fontSize: "14px", color: "#6B7280" }}>
              Already have an account?{" "}
              <Link
                to="/admin/login"
                style={{
                  color: "#4A70A9",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Login here
              </Link>
            </p>
          </div>
        </form>
      </div>
  
      {/* Footer */}
      <p className="mt-4 small text-muted">
        Fields marked with * are mandatory
      </p>
    </div>
  );
  
};

export default AdminRegister;
