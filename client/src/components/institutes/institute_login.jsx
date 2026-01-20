import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUniversity } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

const InstituteLogin = () => {
  const [formData, setFormData] = useState({
    Email_ID: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage("");
  setLoading(true);

  try {
    const res = await axios.post(
      `http://localhost:${BACKEND_PORT_NO}/institute-api/institute/login`,
      formData
    );

    // ✅ ADD THIS DEBUG LOG
    console.log("Login response:", res.data);
    console.log("Payload:", res.data.payload);
    console.log("Full response:", res);

    // Store the token and institute data
    if (res.data.token) {
      localStorage.setItem('instituteToken', res.data.token);
    }
    
    if (res.data.payload) {
      localStorage.setItem("institute", JSON.stringify(res.data.payload));
      localStorage.setItem("instituteId", res.data.payload._id);
      
      // ✅ ADD THESE TO VERIFY
      console.log("Saved to localStorage:", {
        institute: JSON.parse(localStorage.getItem("institute")),
        instituteId: localStorage.getItem("instituteId")
      });
    }

    setMessage("✅ " + (res.data.message || "Login successful"));

    // Set default Authorization header for future requests
    if (res.data.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    }

    setTimeout(() => {
      navigate("/institutes/home");
    }, 1500);
  } catch (err) {
    if (err.response) {
      setMessage("❌ " + (err.response.data.message || "Login failed"));
    } else {
      setMessage("❌ Error connecting to server");
    }
  } finally {
    setLoading(false);
  }
};
  

return (
  <div
    className="d-flex flex-column align-items-center justify-content-center min-vh-100"
    style={{
      backgroundColor: "#F8FAFC",
      fontFamily: "'Inter', sans-serif",
      padding: "24px",
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
        Institute Login
      </h3>
      <p style={{ color: "#6B7280", fontSize: "14px" }}>
        Access your institute dashboard
      </p>
    </div>

    {/* Login Card */}
    <div
      style={{
        width: "100%",
        maxWidth: "420px",
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        padding: "32px",
        border: "1px solid #D6E0F0",
        boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
      }}
    >
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div className="mb-3">
          <label
            className="form-label"
            style={{ fontSize: "13px", color: "#6B7280" }}
          >
            Email Address
          </label>
          <input
            type="email"
            className="form-control"
            name="Email_ID"
            placeholder="Enter your email"
            value={formData.Email_ID}
            onChange={handleChange}
            required
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label
            className="form-label"
            style={{ fontSize: "13px", color: "#6B7280" }}
          >
            Password
          </label>
          <input
            type="password"
            className="form-control"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            backgroundColor: "#4A70A9",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "999px",
            padding: "10px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Register Redirect */}
      <div className="text-center mt-3">
        <p style={{ fontSize: "14px", color: "#6B7280" }}>
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/institutes/register")}
            style={{
              color: "#4A70A9",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Register here
          </span>
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`alert mt-3 text-center ${
            message.startsWith("✅")
              ? "alert-success"
              : "alert-danger"
          }`}
          style={{ fontSize: "14px" }}
        >
          {message}
        </div>
      )}
    </div>
  </div>
);

};

export default InstituteLogin;