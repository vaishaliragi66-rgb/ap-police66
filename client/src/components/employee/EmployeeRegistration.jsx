import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./EmployeeRegister.css";

const EmployeeRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ABS_NO: "",
    Name: "",
    Email: "",
    Password: "",
    Designation: "",
    DOB: "",
    Blood_Group: "",
    Address: {
      Street: "",
      District: "",
      State: "",
      Pincode: "",
    },
  });

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

    const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:${BACKEND_PORT_NO}/employee-api/register`, formData);
      alert("Employee registered successfully!");
      navigate("/employee/login"); // ✅ navigate to login after success
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Registration failed!");
    }
  };

  return (
    <div className="register-container">
      <h2 className="title">Employee Registration</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>ABS Number</label>
        <input type="text" name="ABS_NO" placeholder="Enter ABS Number" onChange={handleChange} required />

        <label>Full Name</label>
        <input type="text" name="Name" placeholder="Enter full name" onChange={handleChange} required />

        <label>Email</label>
        <input type="email" name="Email" placeholder="Enter email" onChange={handleChange} required />

        <label>Password</label>
        <input type="password" name="Password" placeholder="Enter password" onChange={handleChange} required />

        <label>Designation</label>
        <input type="text" name="Designation" placeholder="Enter designation" onChange={handleChange} />

        <label>Date of Birth</label>
        <input type="date" name="DOB" onChange={handleChange} />

        <label>Blood Group</label>
        <select name="Blood_Group" onChange={handleChange}>
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

        <h3 className="sub-title">Address Details</h3>

        <label>Street</label>
        <input type="text" name="Street" placeholder="Street" onChange={handleChange} required />

        <label>District</label>
        <input type="text" name="District" placeholder="District" onChange={handleChange} required />

        <label>State</label>
        <input type="text" name="State" placeholder="State" onChange={handleChange} required />

        <label>Pincode</label>
        <input type="text" name="Pincode" placeholder="Pincode" onChange={handleChange} required />

        <button type="submit" className="submit-btn">Register</button>

        <p className="bottom-text">
          Already registered? <Link to="/employee/login">Login here</Link>
        </p>
      </form>
    </div>
  );
};

export default EmployeeRegister;
