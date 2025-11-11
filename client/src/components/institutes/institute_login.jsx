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
  
      setMessage("✅ " + res.data.message);
      localStorage.setItem("institute", JSON.stringify(res.data.payload));
      localStorage.setItem("instituteId", res.data.payload._id);
  
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
        backgroundColor: "#f5f6f7",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h2
          className="fw-bold text-dark mb-2"
          style={{ fontSize: "2.4rem", letterSpacing: "0.4px" }}
        >
          <FaUniversity className="text-dark" />
          Institute Login
        </h2>
        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
          Access your institute dashboard and manage medical inventory
        </p>
      </div>

      {/* Login Card */}
      <div
        className="bg-white rounded-4 shadow-sm p-4"
        style={{
          width: "100%",
          maxWidth: "400px",
          border: "1px solid #e5e5e5",
          boxShadow:
            "0 8px 25px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)",
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold">
              Email
            </label>
            <input
              type="email"
              className="form-control border-0 shadow-sm"
              name="Email_ID"
              placeholder="Enter your email"
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
          <div className="mb-4">
            <label className="form-label text-muted small fw-semibold">
              Password
            </label>
            <input
              type="password"
              className="form-control border-0 shadow-sm"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                backgroundColor: "#f8f8f8",
                borderRadius: "10px",
                height: "42px",
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn w-100 fw-semibold"
            style={{
              background: "linear-gradient(180deg, #1c1c1c, #000)",
              color: "#fff",
              borderRadius: "10px",
              height: "42px",
              fontSize: "0.95rem",
              letterSpacing: "0.3px",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) => {
              e.target.style.background =
                "linear-gradient(180deg, #000, #1c1c1c)";
            }}
            onMouseOut={(e) => {
              e.target.style.background =
                "linear-gradient(180deg, #1c1c1c, #000)";
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Register Redirect */}
        <div className="text-center mt-3">
          <p className="text-muted small mb-0">
            Don’t have an account?{" "}
            <a
              onClick={() => navigate("/institutes/register")}
              className="fw-semibold"
              style={{ color: "#000", cursor: "pointer" }}
            >
              Register here
            </a>
          </p>
        </div>

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

export default InstituteLogin;
