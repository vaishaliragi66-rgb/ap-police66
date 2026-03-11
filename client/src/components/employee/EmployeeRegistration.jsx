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
    Gender:"",
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
const validateForm = () => {
  const errors = [];

  if (!formData.ABS_NO.trim()) {
    errors.push("ABS Number is required");
  } 

  if (!formData.Name.trim() || formData.Name.length < 3) {
    errors.push("Full Name must be at least 3 characters");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.Email)) {
    errors.push("Enter a valid email address");
  }

  if (formData.Password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  if (!formData.Gender) {
    errors.push("Gender is required");
  }

  if (formData.Phone_No && !/^[6-9]\d{9}$/.test(formData.Phone_No)) {
    errors.push("Enter valid 10-digit Indian phone number");
  }

  if (formData.Address.Pincode && !/^\d{6}$/.test(formData.Address.Pincode)) {
    errors.push("Pincode must be 6 digits");
  }

  if (formData.Height && isNaN(formData.Height)) {
    errors.push("Height must be numeric");
  }

  if (formData.Weight && isNaN(formData.Weight)) {
    errors.push("Weight must be numeric");
  }

  if (formData.DOB) {
    const dob = new Date(formData.DOB);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    if (age < 18) {
      errors.push("Employee must be at least 18 years old");
    }
  }

  return errors;
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate required fields
      const validationErrors = validateForm();

if (validationErrors.length > 0) {
  setError(validationErrors.join(", "));
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
      formPayload.append("Gender", formData.Gender);
      formPayload.append("District", formData.Address.District || "");
      formPayload.append("State", formData.Address.State || "");
      formPayload.append("Pincode", formData.Address.Pincode || "");

      // Append profile picture if selected
      if (profilePic) {
        formPayload.append("Photo", profilePic);
      }

      console.log("Submitting registration...");

      const response = await axios.post(
        `${import.meta.env.REACT_APP_API_URL}/employee-api/register`,
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
                <label className="form-label fw-semibold">Full Name *</label>
                <input
                  type="text"
                  name="Name"
                  className="form-control"
                  placeholder="Enter full name"
                  value={formData.Name}
                  onChange={(e) => {
  const value = e.target.value;
  if (/^[A-Za-z\s]*$/.test(value)) {
    handleChange(e);
  }
}}

                  required
                  disabled={loading}
                />
              </div>
              <div className="row">
  {/* ABS Number */}
  <div className="col-md-6 mb-3">
    <label className="form-label fw-semibold">ABS Number *</label>
    <input
      type="text"
      name="ABS_NO"
      className="form-control"
      placeholder="Enter ABS Number"
      value={formData.ABS_NO}
      onChange={handleChange}
      minLength="6"
      required
      disabled={loading}
    />
  </div>

  {/* Gender */}
  <div className="col-md-6 mb-3">
    <label className="form-label fw-semibold d-block">Gender *</label>

    <div className="form-check form-check-inline">
      <input
        className="form-check-input"
        type="radio"
        name="Gender"
        value="Male"
        checked={formData.Gender === "Male"}
        onChange={handleChange}
        disabled={loading}
        required
      />
      <label className="form-check-label">Male</label>
    </div>

    <div className="form-check form-check-inline">
      <input
        className="form-check-input"
        type="radio"
        name="Gender"
        value="Female"
        checked={formData.Gender === "Female"}
        onChange={handleChange}
        disabled={loading}
      />
      <label className="form-check-label">Female</label>
    </div>

    <div className="form-check form-check-inline">
      <input
        className="form-check-input"
        type="radio"
        name="Gender"
        value="Other"
        checked={formData.Gender === "Other"}
        onChange={handleChange}
        disabled={loading}
      />
      <label className="form-check-label">Other</label>
    </div>
  </div>
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
                  <select
                    name="Designation"
                    className="form-select"
                    value={formData.Designation}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select Designation</option>
                    <option value="HC">HC</option>
                    <option value="ARSI">ARSI</option>
                    <option value="ASI">ASI</option>
                    <option value="RSI">RSI</option>
                    <option value="SI">SI</option>
                    <option value="RI">RI</option>
                    <option value="CI">CI</option>
                    <option value="DSP">DSP</option>
                    <option value="AC">AC</option>
                    <option value="Adl.Commandant">Adl.Commandant</option>
                    <option value="Adl.SP">Adl.SP</option>
                    <option value="SP">SP</option>
                    <option value="COMMANDANT">COMMANDANT</option>
                    <option value="DIG">DIG</option>
                    <option value="IG">IG</option>
                    <option value="ADGP">ADGP</option>
                    <option value="DGP">DGP</option>
                    <option value="AO">AO</option>
                    <option value="SR.Assistant">SR.Assistant</option>
                    <option value="Jr.Assistant">Jr.Assistant</option>
                    <option value="Superintendent">Superintendent</option>
                    <option value="CLASS IV">CLASS IV</option>
                    <option value="Record Assistant">Record Assistant</option>
                    <option value="COOK">CooK</option>
                  </select>
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