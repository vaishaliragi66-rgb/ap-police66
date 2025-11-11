import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FaUserLock } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

const EmployeeLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/employee-api/login`,
        { Email: email, Password: password }
      );

      alert("✅ Login successful!");

      // ✅ Save Employee Data
      localStorage.setItem("employeeToken", res.data.payload.token);
      localStorage.setItem("employeeId", res.data.payload.id);
      localStorage.setItem("employeeName", res.data.payload.Name);
      localStorage.setItem("employeeDesignation", res.data.payload.Designation);

      navigate("employee/home");
    } catch (error) {
      alert(error.response?.data?.message || "❌ Invalid credentials");
    }
  };

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100"
      style={{
        backgroundColor: "#f5f6f7",
        fontFamily: "Inter, sans-serif",
        padding: "30px 20px",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <FaUserLock size={46} className="text-dark mb-2" />
        <h2 className="fw-bold text-dark mb-2">Employee Login</h2>
        <div
          style={{
            width: "70px",
            height: "3px",
            backgroundColor: "#000",
            borderRadius: "3px",
            margin: "0 auto 15px auto",
          }}
        ></div>
        <p className="text-muted" style={{ fontSize: "0.95rem" }}>
          Welcome back! Please log in to your account
        </p>
      </div>

      {/* Login Card */}
      <div
        className="bg-white p-5 rounded-4 shadow-sm w-100"
        style={{
          maxWidth: "400px",
          border: "1px solid #e5e5e5",
          boxShadow: "0 8px 25px rgba(0, 0, 0, 0.07)",
        }}
      >
        <form onSubmit={handleLogin}>
          {/* Email */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold">
              Email
            </label>
            <input
              type="email"
              className="form-control border-0 shadow-sm"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                backgroundColor: "#f8f8f8",
                borderRadius: "10px",
                height: "42px",
              }}
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="btn w-100 fw-semibold"
            style={{
              background: "linear-gradient(180deg, #1c1c1c, #000)",
              color: "#fff",
              borderRadius: "10px",
              height: "45px",
              fontSize: "0.95rem",
              transition: "0.3s ease",
            }}
            onMouseOver={(e) =>
              (e.target.style.background = "linear-gradient(180deg, #000, #1c1c1c)")
            }
            onMouseOut={(e) =>
              (e.target.style.background = "linear-gradient(180deg, #1c1c1c, #000)")
            }
          >
            Login
          </button>

          {/* Bottom Text */}
          <div className="text-center mt-3">
            <p className="text-muted small mb-0">
              Don’t have an account?{" "}
              <Link
                to="/employee-register"
                className="fw-semibold"
                style={{ color: "#000", cursor: "pointer" }}
              >
                Register here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeLogin;
