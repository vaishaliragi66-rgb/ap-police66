import React, { useState } from "react";
import axios from "axios";
import "./FamilyRegistration.css";

const FamilyMemberRegistration = () => {
  const employeeId = localStorage.getItem("employeeId");   // ✅ Employee logged-in ID
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

  const [formData, setFormData] = useState({
    Name: "",
    Relationship: "",
    DOB: "",
    Medical_History: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!employeeId) {
      alert("Employee not logged in. Please login again.");
      return;
    }

    try {
      const payload = { ...formData, EmployeeId: employeeId };
      const res = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/family-api/register`,
        payload
      );

      alert(res.data.message);

      setFormData({
        Name: "",
        Relationship: "",
        DOB: "",
        Medical_History: ""
      });
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="family-register-page">
      <div className="family-register-card">
        <h1 className="family-title">Family Member Registration</h1>

        <form className="family-form" onSubmit={handleSubmit}>

          <label>Name</label>
          <input
            type="text"
            name="Name"
            value={formData.Name}
            onChange={handleChange}
            required
          />

          <label>Relationship</label>
          <input
            type="text"
            name="Relationship"
            value={formData.Relationship}
            onChange={handleChange}
            required
          />

          <label>Date of Birth</label>
          <input
            type="date"
            name="DOB"
            value={formData.DOB}
            onChange={handleChange}
          />

          <label>Medical History</label>
          <textarea
            name="Medical_History"
            value={formData.Medical_History}
            onChange={handleChange}
          ></textarea>

          <button type="submit" className="family-submit-btn">
            Register Family Member
          </button>
        </form>
      </div>
    </div>
  );
};

export default FamilyMemberRegistration;
