import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./institute_register.css";

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

      // Redirect to homepage
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
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div
        className="card shadow-lg p-4 rounded-4 w-100"
        style={{ maxWidth: "400px" }}
      >
        <h3 className="text-center mb-4 fw-bold text-primary">
          Institute Login
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
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

          {/* Password Field */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
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

          <div className="d-grid">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>

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
