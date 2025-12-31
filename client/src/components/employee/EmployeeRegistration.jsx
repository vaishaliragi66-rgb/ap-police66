import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FaUserPlus, FaCamera, FaUser } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

const EmployeeRegister = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    ABS_NO: "",
    Name: "",
    Email: "",
    Password: "",
    Designation: "",
    DOB: "",
    Blood_Group: "",
    Height: "",
    Weight: "",
    Phone_No: "",
    Address: {
      Street: "",
      District: "",
      State: "",
      Pincode: "",
    },
  });
  
  const [profilePic, setProfilePic] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || 6100;

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (["Street", "District", "State", "Pincode"].includes(name)) {
      setFormData({
        ...formData,
        Address: { ...formData.Address, [name]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    if (error) setError("");
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setError("Please select a valid image file (JPEG, PNG, GIF)");
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }

      setProfilePic(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate required fields
      if (!formData.ABS_NO || !formData.Name || !formData.Email || !formData.Password) {
        setError("ABS Number, Name, Email, and Password are required");
        setLoading(false);
        return;
      }

      // Create FormData object
      const formPayload = new FormData();
      
      // Append all form fields
      formPayload.append("ABS_NO", formData.ABS_NO);
      formPayload.append("Name", formData.Name);
      formPayload.append("Email", formData.Email);
      formPayload.append("Password", formData.Password);
      formPayload.append("Designation", formData.Designation || "");
      formPayload.append("DOB", formData.DOB || "");
      formPayload.append("Blood_Group", formData.Blood_Group || "");
      formPayload.append("Height", formData.Height || "");
      formPayload.append("Weight", formData.Weight || "");
      formPayload.append("Phone_No", formData.Phone_No || "");
      formPayload.append("Street", formData.Address.Street || "");
      formPayload.append("District", formData.Address.District || "");
      formPayload.append("State", formData.Address.State || "");
      formPayload.append("Pincode", formData.Address.Pincode || "");

      // Append profile picture if selected
      if (profilePic) {
        formPayload.append("Photo", profilePic);
      }

      console.log("Submitting registration...");

      const response = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/employee-api/register`,
        formPayload,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setSuccess(response.data.message || "✅ Employee registered successfully!");
      
      // Reset form
      setFormData({
        ABS_NO: "",
        Name: "",
        Email: "",
        Password: "",
        Designation: "",
        DOB: "",
        Blood_Group: "",
        Height: "",
        Weight: "",
        Phone_No: "",
        Address: {
          Street: "",
          District: "",
          State: "",
          Pincode: "",
        },
      });
      setProfilePic(null);
      setProfilePreview(null);

      // Navigate after 2 seconds
      setTimeout(() => {
        navigate("/employee/login");
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
          <div className="bg-primary text-white rounded-circle p-3">
            <FaUserPlus size={28} />
          </div>
        </div>
        <h2 className="fw-bold text-dark">Employee Registration</h2>
        <p className="text-muted">Create your employee account</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show w-100 mb-3" style={{ maxWidth: "900px" }}>
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
        <div className="alert alert-success alert-dismissible fade show w-100 mb-3" style={{ maxWidth: "900px" }}>
          {success}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setSuccess("")}
          ></button>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white shadow-lg rounded-3 p-4 w-100" style={{ maxWidth: "900px" }}>
        <form onSubmit={handleSubmit}>
          <div className="row">
            
            {/* Left Column - Personal Details */}
            <div className="col-lg-6">
              <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Personal Details</h5>
              
              {/* Profile Picture Upload */}
              <div className="mb-4 text-center">
                <div 
                  className="rounded-circle border border-3 border-secondary mx-auto d-flex align-items-center justify-content-center mb-3"
                  style={{
                    width: "120px",
                    height: "120px",
                    backgroundColor: profilePreview ? "transparent" : "#f8f9fa",
                    cursor: "pointer",
                    overflow: "hidden"
                  }}
                  onClick={triggerFileInput}
                >
                  {profilePreview ? (
                    <img 
                      src={profilePreview} 
                      alt="Profile Preview" 
                      className="w-100 h-100 object-fit-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <FaUser size={40} className="text-secondary mb-2" />
                      <p className="text-muted small mb-0">Click to upload</p>
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePicChange}
                  accept="image/*"
                  className="d-none"
                />
                
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="btn btn-outline-dark btn-sm px-3 py-2 mb-2"
                  style={{ borderRadius: "8px" }}
                >
                  <FaCamera className="me-2" />
                  {profilePic ? "Change Photo" : "Upload Photo"}
                </button>
                
                {profilePic && (
                  <p className="text-muted small">
                    Selected: {profilePic.name}
                  </p>
                )}
              </div>

              {/* Required Fields */}
              <div className="mb-3">
                <label className="form-label fw-semibold">ABS Number *</label>
                <input
                  type="text"
                  name="ABS_NO"
                  className="form-control"
                  placeholder="Enter ABS Number"
                  value={formData.ABS_NO}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Full Name *</label>
                <input
                  type="text"
                  name="Name"
                  className="form-control"
                  placeholder="Enter full name"
                  value={formData.Name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Email *</label>
                  <input
                    type="email"
                    name="Email"
                    className="form-control"
                    placeholder="Enter email"
                    value={formData.Email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Password *</label>
                  <input
                    type="password"
                    name="Password"
                    className="form-control"
                    placeholder="Enter password"
                    value={formData.Password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Designation</label>
                  <input
                    type="text"
                    name="Designation"
                    className="form-control"
                    placeholder="Enter designation"
                    value={formData.Designation}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Date of Birth</label>
                  <input
                    type="date"
                    name="DOB"
                    className="form-control"
                    value={formData.DOB}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Additional Details */}
            <div className="col-lg-6">
              <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Additional Information</h5>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Blood Group</label>
                  <select
                    name="Blood_Group"
                    className="form-select"
                    value={formData.Blood_Group}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Phone Number</label>
                  <input
                    type="text"
                    name="Phone_No"
                    className="form-control"
                    placeholder="Enter phone number"
                    value={formData.Phone_No}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Height (cm)</label>
                  <input
                    type="text"
                    name="Height"
                    className="form-control"
                    placeholder="Height in cm"
                    value={formData.Height}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Weight (kg)</label>
                  <input
                    type="text"
                    name="Weight"
                    className="form-control"
                    placeholder="Weight in kg"
                    value={formData.Weight}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <h5 className="fw-bold text-dark mb-3 border-bottom pb-2 mt-4">Address Details</h5>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Street</label>
                <input
                  type="text"
                  name="Street"
                  className="form-control"
                  placeholder="Street address"
                  value={formData.Address.Street}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">District</label>
                  <input
                    type="text"
                    name="District"
                    className="form-control"
                    placeholder="District"
                    value={formData.Address.District}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">State</label>
                  <input
                    type="text"
                    name="State"
                    className="form-control"
                    placeholder="State"
                    value={formData.Address.State}
                  onChange={handleChange}
                  disabled={loading}
                />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Pincode</label>
                <input
                  type="text"
                  name="Pincode"
                  className="form-control"
                  placeholder="Pincode"
                  value={formData.Address.Pincode}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center mt-4">
            <button
              type="submit"
              className="btn btn-primary btn-lg px-5 py-2"
              disabled={loading}
              style={{ minWidth: "200px" }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center mt-3">
            <p className="text-muted">
              Already have an account?{" "}
              <Link to="/employee-login" className="text-primary fw-semibold text-decoration-none">
                Login here
              </Link>
            </p>
          </div>
        </form>
      </div>

      {/* Footer Note */}
      <div className="text-center mt-4">
        <p className="text-muted small">
          All fields marked with * are required
        </p>
      </div>
    </div>
  );
};

export default EmployeeRegister;