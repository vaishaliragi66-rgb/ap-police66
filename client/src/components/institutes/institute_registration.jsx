import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaUniversity, FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from "react-router-dom";

const InstituteRegister = () => {
  const [formData, setFormData] = useState({
    Institute_Name: "",
    Email_ID: "",
    password: "",
    confirm_password: "",
    Contact_No: "",
    Address: {
      Street: "",
      District: "",
      State: "",
      Pincode: "",
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (formData.password !== formData.confirm_password) {
      setMessage("❌ Password and Confirm Password do not match");
      setLoading(false);
      return;
    }

    const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;
    const { confirm_password, ...payload } = formData;

    try {
      const res = await fetch(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/register/institute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ " + data.message);
        setFormData({
          Institute_Name: "",
          Email_ID: "",
          password: "",
          confirm_password: "",
          Contact_No: "",
          Address: { Street: "", District: "", State: "", Pincode: "" },
        });
        setTimeout(() => navigate("/institutes/login"), 1500);
      } else {
        setMessage("❌ " + (data.message || data.error));
      }
    } catch {
      setMessage("❌ Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        padding: "40px 16px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <div
          className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
          style={{
            width: "64px",
            height: "64px",
            backgroundColor: "#EAF2FF",
            color: "#4A70A9",
          }}
        >
          <FaUniversity size={30} />
        </div>
  
        <h3 style={{ fontWeight: 600, color: "#1F2933" }}>
          Institute Registration
        </h3>
        <p style={{ color: "#6B7280", fontSize: "14px" }}>
          Register your institution securely
        </p>
      </div>
  
      {/* Form Card */}
      <div
        className="mx-auto"
        style={{
          maxWidth: "620px",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: "32px",
          border: "1px solid #D6E0F0",
          boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
        }}
      >
        <div
          className="mb-4 pb-2"
          style={{
            borderBottom: "1px solid #D6E0F0",
          }}
        >
          <h5 style={{ fontWeight: 600, color: "#1F2933", marginBottom: 0 }}>
            Institute Details
          </h5>
        </div>
  
        <form onSubmit={handleSubmit}>
          <input
            className="form-control mb-3"
            name="Institute_Name"
            placeholder="Institute Name"
            value={formData.Institute_Name}
            onChange={handleChange}
            required
          />
  
          <input
            className="form-control mb-3"
            name="Email_ID"
            type="email"
            placeholder="Email Address"
            value={formData.Email_ID}
            onChange={handleChange}
            required
          />
  
          {/* Password */}
          <div className="position-relative mb-3">
            <input
              className="form-control"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#6B7280",
              }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
  
          {/* Confirm Password */}
          <div className="position-relative mb-3">
            <input
              className="form-control"
              name="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
            />
            <span
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#6B7280",
              }}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
  
          <input
            className="form-control mb-4"
            name="Contact_No"
            placeholder="Contact Number"
            value={formData.Contact_No}
            onChange={handleChange}
            required
          />
  
          <h6
            style={{
              fontWeight: 600,
              color: "#1F2933",
              marginBottom: "12px",
            }}
          >
            Address Information
          </h6>
  
          {["Street", "District", "State", "Pincode"].map((field) => (
            <input
              key={field}
              className="form-control mb-3"
              name={field}
              placeholder={field}
              value={formData.Address[field]}
              onChange={handleChange}
              required
            />
          ))}
  
          <button
            className="w-100"
            disabled={loading}
            style={{
              backgroundColor: "#4A70A9",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "999px",
              padding: "10px",
              fontWeight: 500,
              marginTop: "10px",
            }}
          >
            {loading ? "Registering..." : "Register Institute"}
          </button>
        </form>
  
        {message && (
          <div
            className={`alert mt-3 ${
              message.startsWith("✅")
                ? "alert-success"
                : "alert-danger"
            }`}
            style={{ fontSize: "14px" }}
          >
            {message}
          </div>
        )}
  
        {/* Login Link */}
        <div className="text-center mt-3">
          <p style={{ fontSize: "14px", color: "#6B7280" }}>
            Already registered?{" "}
            <Link
              to="/institutes/login"
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
      </div>
    </div>
  );
  
};

export default InstituteRegister;
