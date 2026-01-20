import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FaUserLock } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import HealthShield from '../../assets/Employee_login.svg'
const Employeelogin = () => {
  const [absNo, setAbsNo] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;
  const employeeName = localStorage.getItem("employeeName")
  

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/employee-api/login`,
        { ABS_NO: absNo, Password: password }
      );

      alert("✅ Login successful!");

      // ✅ Save Employee Data
      console.log("LOGIN RESPONSE PAYLOAD:", res.data.payload);
      localStorage.setItem("employeeToken", res.data.payload.token);
      localStorage.setItem("employeeId", res.data.payload.id);
      localStorage.setItem("employeeName", res.data.payload.Name);
      localStorage.setItem("employeeDesignation", res.data.payload.Designation);
      localStorage.setItem("employeeABS", res.data.payload.ABS_NO);
      localStorage.setItem("employeeObjectId", res.data.payload._id);

      navigate("/employee/home");
    } catch (error) {
      alert(error.response?.data?.message || "❌ Invalid credentials");
    }
  };

  return (
    <div
      className="min-vh-100 d-flex"
      style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, sans-serif" }}
    >
      {/* LEFT SIDE – VISUAL / BRAND */}
      <div
        className="d-none d-md-flex flex-column justify-content-center align-items-center text-center"
        style={{
          width: "50%",
          backgroundColor: "#EAF2FF",
          padding: "60px",
        }}
      >
       <div
        className="rounded-circle d-flex align-items-center justify-content-center mb-4"
        style={{
          width: "140px",
          height: "140px",
          
        }}
      >
        <img
          src={HealthShield}
          alt="Health & Safety"
          style={{
            width: "400px",
            height: "400px",
          }}
        />
      </div>

  
        <h2 style={{ color: "#1F2933", fontWeight: 600 }}>
          AP Police Medical System
        </h2>
  
        <p
          style={{
            color: "#6B7280",
            fontSize: "15px",
            maxWidth: "360px",
            marginTop: "12px",
          }}
        >
          Secure access for employees to manage medical inventory, records,
          and internal operations.
        </p>
      </div>
  
      {/* RIGHT SIDE – LOGIN FORM */}
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{
          width: "100%",
          maxWidth: "500px",
          margin: "0 auto",
          padding: "40px 24px",
        }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div
            className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
            style={{
              width: "60px",
              height: "60px",
              backgroundColor: "#EAF2FF",
              color: "#4A70A9",
            }}
          >
            <FaUserLock size={28} />
          </div>
  
          <h3 style={{ fontWeight: 600, color: "#1F2933" }}>
            Employee Login
          </h3>
          <p style={{ color: "#6B7280", fontSize: "14px" }}>
            Login using your ABS number and password
          </p>
        </div>
  
        {/* Login Card */}
        <div
          className="bg-white w-100"
          style={{
            borderRadius: "14px",
            padding: "32px",
            border: "1px solid #D6E0F0",
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          }}
        >
          <form onSubmit={handleLogin}>
            {/* ABS Number */}
            <div className="mb-3">
              <label className="form-label">ABS Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter ABS Number"
                value={absNo}
                onChange={(e) => setAbsNo(e.target.value)}
                required
              />
            </div>
  
            {/* Password */}
            <div className="mb-4">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
  
            {/* Button */}
            <button
              type="submit"
              className="w-100"
              style={{
                backgroundColor: "#4A70A9",
                color: "#fff",
                border: "none",
                borderRadius: "999px",
                padding: "10px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Login
            </button>
  
            {/* Footer */}
            <div className="text-center mt-3">
              <p style={{ fontSize: "13px", color: "#6B7280" }}>
                Don’t have an account?{" "}
                <Link
                  to="/employee-register"
                  style={{
                    color: "#4A70A9",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Register here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
  
};

export default Employeelogin;