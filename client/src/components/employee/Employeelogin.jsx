import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./EmployeeRegister.css";

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
        {
          Email: email,
          Password: password,
        }
      );

      alert("Login successful!");

      // ✅ SAVE EVERYTHING IN LOCAL STORAGE
      localStorage.setItem("employeeToken", res.data.payload.token);
      localStorage.setItem("employeeId", res.data.payload.id);
      localStorage.setItem("employeeName", res.data.payload.Name);
      localStorage.setItem("employeeDesignation", res.data.payload.Designation);

      // ✅ Redirect to employee home page
      navigate("/employee/home");
    } catch (error) {
      alert(error.response?.data?.message || "Invalid credentials");
    }
  };

  return (
    <div className="register-container">
      <h2 className="title">Employee Login</h2>
      <form className="form" onSubmit={handleLogin}>
        <label>Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="submit-btn">Login</button>

        <p className="bottom-text">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </form>
    </div>
  );
};

export default EmployeeLogin;
