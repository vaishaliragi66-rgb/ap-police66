import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FaUserPlus, FaCamera, FaUser } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "./EmployeeRegister.css"
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
        navigate("/employee-login");
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
          <style>
{`
  /* Label – calm & light */
  .form-label {
    font-size: 13px;
    font-weight: 500;
    color: #1F2933;
    margin-bottom: 6px;
  }

  /* Card-style inputs */
  .form-control,
  .form-select {
    background-color: #F8FAFC;
    border: 1px solid #E6EEFA;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  /* Focus – dashboard blue line */
  .form-control:focus,
  .form-select:focus {
    background-color: #FFFFFF;
    border-color: #4A70A9;
    box-shadow: none;
  }

  /* Placeholder */
  .form-control::placeholder {
    color: #9AA4B2;
    font-size: 13px;
  }

  /* Disabled */
  .form-control:disabled,
  .form-select:disabled {
    background-color: #F1F5FB;
    opacity: 0.8;
  }

  /* Spacing between fields */
  .mb-3 {
    margin-bottom: 16px !important;
  }
`}
</style>
  


      
      {/* Header */}
      <div className="text-center mb-4">
        <div className="d-flex justify-content-center align-items-center mb-3">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "#E6EEFA",   // light blue circle
              color: "#4A70A9",             // primary blue icon
              boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
            }}
          >
            <FaUserPlus size={26} />
          </div>
        </div>

        <h2
          className="fw-semibold"
          style={{ color: "#1F2933" }}
        >
          Employee Registration
        </h2>

        <p
          style={{
            color: "#6B7280",
            fontSize: "14px",
          }}
        >
          Create your employee account
        </p>
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
      <div
  className="bg-white p-4 w-100"
  style={{
    maxWidth: "900px",
    borderRadius: "14px",
    border: "1px solid #D6E0F0",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  }}
>

        <form onSubmit={handleSubmit}>
          <div className="row">
            
            {/* Left Column - Personal Details */}
            <div className="col-lg-6">
            <h5
            className="fw-semibold mb-3 pb-2"
            style={{
              color: "#1F2933",
              borderBottom: "2px solid #EAF2FF",
            }}
          >
          Personal Details</h5>
              
              {/* Profile Picture Upload */}
             <div className="mb-4 text-center">
  {/* Profile Circle */}
  <div
    className="rounded-circle mx-auto d-flex align-items-center justify-content-center"
    style={{
      width: "120px",
      height: "120px",
      border: "2px dashed #D6E0F0",
      backgroundColor: profilePreview ? "#FFFFFF" : "#F8FAFC",
      cursor: "pointer",
      overflow: "hidden",
      transition: "border-color 0.2s ease",
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
      <FaUser size={38} style={{ color: "#9AA4B2" }} />
    )}
  </div>

  {/* Hint text */}
  <p
    style={{
      marginTop: "8px",
      fontSize: "12px",
      color: "#6B7280",
    }}
  >
    Click to upload profile photo
  </p>

  {/* Hidden input */}
  <input
    type="file"
    ref={fileInputRef}
    onChange={handleProfilePicChange}
    accept="image/*"
    className="d-none"
  />

  {/* Action button */}
 

  {profilePic && (
    <p className="text-muted small mt-1">
      {profilePic.name}
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
            <h5
            className="fw-semibold mb-3 pb-2"
            style={{
              color: "#1F2933",
              borderBottom: "2px solid #EAF2FF",
            }}
          >
          Additional Information</h5>
              
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

              <h5
              className="fw-semibold mb-3 pb-2"
              style={{
                color: "#1F2933",
                borderBottom: "2px solid #EAF2FF",
              }}
            >
            Address Details</h5>
              
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
              disabled={loading}
              style={{
                backgroundColor: "#4A70A9",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "999px",
                padding: "10px 36px",
                fontSize: "14px",
                fontWeight: 500,
                minWidth: "200px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                transition: "all 0.2s ease",
              }}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center mt-3">
            <p style={{ fontSize: "13px", color: "#6B7280" }}>
              Already have an account?{" "}
              <Link
                to="/employee-login"
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