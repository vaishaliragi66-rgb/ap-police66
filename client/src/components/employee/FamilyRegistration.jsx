import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const FamilyMemberRegistration = () => {
  const employeeId = localStorage.getItem("employeeId");
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

  const [formData, setFormData] = useState({
    Name: "",
    Gender: "",
    Relationship: "",
    DOB: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check if user is logged in
  useEffect(() => {
    if (!employeeId) {
      setError("Please login to register family members");
    }
  }, [employeeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear errors when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!employeeId) {
      setError("Employee not logged in. Please login again.");
      return;
    }

    // Validate required fields
    if (!formData.Name || !formData.Gender || !formData.Relationship) {
      setError("Name, Gender and Relationship are required fields");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = { 
        ...formData, 
        EmployeeId: employeeId 
      };

      const res = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/family-api/register`,
        payload
      );

      setSuccess(res.data.message);
      
      // Reset form
      setFormData({
        Name: "",
        Gender: "",
        Relationship: "",
        DOB: "",
      });

    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          "Registration failed. Please try again.";
      setError(errorMessage);
      
      // Log the error for debugging
      console.error("Registration error:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        className="p-5"
        style={{
          width: "600px",
          border: "1px solid rgba(0,0,0,0.2)",
          borderRadius: "20px",
          backgroundColor: "#ffffff",
          color: "#000000",
        }}
      >
        <h3
          className="text-center mb-4 fw-bold"
          style={{ color: "#000000", letterSpacing: "0.5px" }}
        >
          Family Member Registration
        </h3>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setError("")}
            ></button>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            {success}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setSuccess("")}
            ></button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark">Name *</label>
            <input
              type="text"
              className="form-control text-dark"
              name="Name"
              value={formData.Name}
              onChange={handleChange}
              required
              disabled={loading}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid rgba(0,0,0,0.3)",
                borderRadius: "6px",
              }}
            />
          </div>

          {/* Gender */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark">Gender *</label>
            <div className="d-flex gap-4 mt-1">
              <div className="form-check">
                <input
                  className="form-check-input border-dark"
                  type="radio"
                  name="Gender"
                  value="Male"
                  checked={formData.Gender === "Male"}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <label className="form-check-label text-dark">Male</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input border-dark"
                  type="radio"
                  name="Gender"
                  value="Female"
                  checked={formData.Gender === "Female"}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <label className="form-check-label text-dark">Female</label>
              </div>
            </div>
          </div>

          {/* Relationship */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark">
              Relationship *
            </label>
            <select
              className="form-select text-dark"
              name="Relationship"
              value={formData.Relationship}
              onChange={handleChange}
              required
              disabled={loading}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid rgba(0,0,0,0.3)",
                borderRadius: "6px",
              }}
            >
              <option value="">Select Relationship</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Wife">Wife</option>
              <option value="Child">Child</option>
            </select>
          </div>

          {/* DOB */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark">
              Date of Birth
            </label>
            <input
              type="date"
              className="form-control text-dark"
              name="DOB"
              value={formData.DOB}
              onChange={handleChange}
              disabled={loading}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid rgba(0,0,0,0.3)",
                borderRadius: "6px",
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn w-100 fw-semibold mt-3"
            disabled={loading}
            style={{
              backgroundColor: loading ? "#666666" : "#000000",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "10px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Registering...
              </>
            ) : (
              "Register Family Member"
            )}
          </button>

          {/* Employee ID Info */}
          <div className="mt-3 text-center">
            <small className="text-muted">
              Registering for Employee ID: {employeeId || "Not logged in"}
            </small>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FamilyMemberRegistration;