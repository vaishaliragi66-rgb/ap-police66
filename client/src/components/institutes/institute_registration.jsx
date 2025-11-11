import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaUniversity } from "react-icons/fa";

const InstituteRegister = () => {
  const [formData, setFormData] = useState({
    Institute_Name: "",
    Email_ID: "",
    password: "",
    Contact_No: "",
    Address: {
      Street: "",
      District: "",
      State: "",
      Pincode: "",
    },
  });

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

    const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

    try {
      const res = await fetch(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/register/institute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ " + data.message);
        setFormData({
          Institute_Name: "",
          Email_ID: "",
          password: "",
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
      className="d-flex flex-column align-items-center justify-content-start min-vh-100"
      style={{
        backgroundColor: "#f5f6f7",
        paddingTop: "10px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h2
          className="fw-bold text-dark mb-2"
          style={{ fontSize: "2.5rem", letterSpacing: "0.4px" }}
        >
          <FaUniversity className="me-2 mb-1 text-dark" />
          Institute Registration
        </h2>
        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
          Register your institute to manage medical inventory requests
        </p>
      </div>

      {/* Form Card */}
      <div
        className="bg-white shadow-sm rounded-4 p-4"
        style={{
          width: "100%",
          maxWidth: "650px",
          border: "1px solid #e5e5e5",
          boxShadow:
            "0 8px 25px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)",
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Institute Name */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold">
              Institute Name
            </label>
            <input
              type="text"
              className="form-control border-0 shadow-sm"
              name="Institute_Name"
              placeholder="Enter institute name"
              value={formData.Institute_Name}
              onChange={handleChange}
              required
              style={{
                backgroundColor: "#f8f8f8",
                borderRadius: "10px",
                height: "42px",
              }}
            />
          </div>

          {/* Email */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold">
              Email ID
            </label>
            <input
              type="email"
              className="form-control border-0 shadow-sm"
              name="Email_ID"
              placeholder="Enter email"
              value={formData.Email_ID}
              onChange={handleChange}
              required
              style={{
                backgroundColor: "#f8f8f8",
                borderRadius: "10px",
                height: "42px",
              }}
            />
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold">
              Password
            </label>
            <input
              type="password"
              className="form-control border-0 shadow-sm"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              style={{
                backgroundColor: "#f8f8f8",
                borderRadius: "10px",
                height: "42px",
              }}
            />
          </div>

          {/* Contact */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold">
              Contact Number
            </label>
            <input
              type="text"
              className="form-control border-0 shadow-sm"
              name="Contact_No"
              placeholder="Enter contact number"
              value={formData.Contact_No}
              onChange={handleChange}
              required
              pattern="^[0-9]{10}$"
              title="Enter a valid 10-digit number"
              style={{
                backgroundColor: "#f8f8f8",
                borderRadius: "10px",
                height: "42px",
              }}
            />
          </div>

          {/* Address */}
          <h6 className="fw-bold text-dark mt-4 mb-3">Address Details</h6>
          {["Street", "District", "State", "Pincode"].map((field) => (
            <div className="mb-3" key={field}>
              <label className="form-label text-muted small fw-semibold">
                {field}
              </label>
              <input
                type="text"
                className="form-control border-0 shadow-sm"
                name={field}
                placeholder={field}
                value={formData.Address[field]}
                onChange={handleChange}
                required
                style={{
                  backgroundColor: "#f8f8f8",
                  borderRadius: "10px",
                  height: "42px",
                }}
              />
            </div>
          ))}

          {/* Submit Button */}
          <div className="d-grid mt-4">
            <button
              type="submit"
              className="btn w-100 fw-semibold"
              disabled={loading}
              style={{
                background: "linear-gradient(180deg, #1c1c1c, #000)",
                color: "#fff",
                borderRadius: "10px",
                height: "42px",
                fontSize: "0.95rem",
                letterSpacing: "0.3px",
              }}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center mt-3">
            <p className="text-muted small mb-0">
              Already registered?{" "}
              <a
                onClick={() => navigate("/institutes/login")}
                className="fw-semibold"
                style={{ color: "#000", cursor: "pointer" }}
              >
                Login here
              </a>
            </p>
          </div>
        </form>

        {/* Message */}
        {message && (
          <div
            className={`alert mt-4 text-center ${
              message.startsWith("✅") ? "alert-success" : "alert-danger"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstituteRegister;
