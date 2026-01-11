import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FaUserShield, FaLock } from "react-icons/fa";
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

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || 6100;

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
        `http://localhost:${BACKEND_PORT_NO}/admin-api/register`,
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
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center py-5" 
         style={{ backgroundColor: "#f8f9fa" }}>
      
      {/* Header */}
      <div className="text-center mb-4">
        <div className="d-flex justify-content-center align-items-center mb-3">
          <div className="bg-dark text-white rounded-circle p-3">
            <FaUserShield size={28} />
          </div>
        </div>
        <h2 className="fw-bold text-dark">Admin Registration</h2>
        <p className="text-muted">Create administrator account</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show w-100 mb-3" style={{ maxWidth: "600px" }}>
          <strong>Error:</strong> {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="alert alert-success alert-dismissible fade show w-100 mb-3" style={{ maxWidth: "600px" }}>
          {success}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setSuccess("")}
          ></button>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white shadow-lg rounded-3 p-4 w-100" style={{ maxWidth: "600px" }}>
        <form onSubmit={handleSubmit}>
          <div className="row">
            
            {/* Name Field */}
            <div className="col-12 mb-3">
              <label className="form-label fw-semibold">Full Name *</label>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Email Field */}
            <div className="col-12 mb-3">
              <label className="form-label fw-semibold">Email Address *</label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Password Fields */}
            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Password *</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaLock />
                </span>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              {passwordStrength && (
                <div className={`small mt-1 text-${passwordStrength === 'Strong' ? 'success' : passwordStrength === 'Medium' ? 'warning' : 'danger'}`}>
                  Password strength: {passwordStrength}
                </div>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Confirm Password *</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaLock />
                </span>
                <input
                  type="password"
                  name="confirmPassword"
                  className={`form-control ${!passwordMatch && formData.confirmPassword ? 'is-invalid' : ''}`}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              {!passwordMatch && formData.confirmPassword && (
                <div className="invalid-feedback d-block small">
                  Passwords do not match
                </div>
              )}
            </div>

            {/* Date of Birth */}
            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Date of Birth</label>
              <input
                type="date"
                name="dob"
                className="form-control"
                value={formData.dob}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* Address Field */}
            <div className="col-12 mb-3">
              <label className="form-label fw-semibold">Address</label>
              <textarea
                name="address"
                className="form-control"
                placeholder="Enter complete address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                disabled={loading}
              />
            </div>

            {/* Password Requirements */}
            <div className="col-12 mb-4">
              <div className="card border-light">
                <div className="card-body p-3">
                  <h6 className="card-title small fw-semibold">Password Requirements:</h6>
                  <ul className="small text-muted mb-0">
                    <li>Minimum 8 characters</li>
                    <li>Include uppercase and lowercase letters</li>
                    <li>Include at least one number</li>
                    <li>Special characters recommended</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center mt-2">
            <button
              type="submit"
              className="btn btn-dark btn-lg px-5 py-2"
              disabled={loading}
              style={{ minWidth: "200px" }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Account...
                </>
              ) : (
                "Register as Admin"
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center mt-3">
            <p className="text-muted">
              Already have an account?{" "}
              <Link to="/admin/login" className="text-dark fw-semibold text-decoration-none">
                Login here
              </Link>
            </p>
          </div>
        </form>
      </div>

      {/* Footer Note */}
      <div className="text-center mt-4">
        <p className="text-muted small">
          Fields marked with * are required
        </p>
      </div>
    </div>
  );
};

export default AdminRegister;