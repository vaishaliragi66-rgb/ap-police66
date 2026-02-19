import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AddPasswords = () => {
  const [formData, setFormData] = useState({
    doctor: "",
    pharmacist: "",
    diagnosis: "",
    xray: "",
    frontdesk: ""
  });

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        "http://localhost:6100/institute-auth/setup-roles",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("Role passwords saved successfully");
      navigate("/institutes/home");

    } catch (err) {
      alert(err.response?.data?.message || "Failed to save passwords");
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: "500px" }}>
      <h3>Configure Role Passwords</h3>
      <form onSubmit={handleSubmit}>

        {Object.keys(formData).map((role) => (
          <div className="mb-3" key={role}>
            <label className="form-label">
              {role.charAt(0).toUpperCase() + role.slice(1)} Password
            </label>
            <input
              type="password"
              className="form-control"
              name={role}
              value={formData[role]}
              onChange={handleChange}
              required
            />
          </div>
        ))}

        <button type="submit" className="btn btn-primary w-100">
          Save Passwords
        </button>
      </form>
    </div>
  );
};

export default AddPasswords;