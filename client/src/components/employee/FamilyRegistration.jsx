import React, { useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const FamilyMemberRegistration = () => {
  const employeeId = localStorage.getItem("employeeId");
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

  const [formData, setFormData] = useState({
    Name: "",
    Gender: "",
    Relationship: "",
    DOB: "",
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
        Gender: "",
        Relationship: "",
        DOB: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{
        backgroundColor: "#f5f5f5", // white background
      }}
    >
      <div
        className="p-5"
        style={{
          width: "600px", // wide form
          border: "1px solid rgba(0,0,0,0.2)", // faint black border
          borderRadius: "20px",
          backgroundColor: "#ffffff",
          color: "#000000",
        }}
      >
        <h3
          className="text-center mb-4 fw-bold"
          style={{ color: "#000000", letterSpacing: "0.5px" }}
        >
          Family Member Registration
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark">Name</label>
            <input
              type="text"
              className="form-control text-dark"
              name="Name"
              value={formData.Name}
              onChange={handleChange}
              required
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid rgba(0,0,0,0.3)", // faint border
                borderRadius: "6px",
              }}
            />
          </div>

          {/* Gender */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark">Gender</label>
            <div className="d-flex gap-4 mt-1">
              <div className="form-check">
                <input
                  className="form-check-input border-dark"
                  type="radio"
                  name="Gender"
                  value="Male"
                  checked={formData.Gender === "Male"}
                  onChange={handleChange}
                  required
                />
                <label className="form-check-label text-dark">Male</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input border-dark"
                  type="radio"
                  name="Gender"
                  value="Female"
                  checked={formData.Gender === "Female"}
                  onChange={handleChange}
                  required
                />
                <label className="form-check-label text-dark">Female</label>
              </div>
            </div>
          </div>

          {/* Relationship */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark">
              Relationship
            </label>
            <select
              className="form-select text-dark"
              name="Relationship"
              value={formData.Relationship}
              onChange={handleChange}
              required
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid rgba(0,0,0,0.3)", // faint border
                borderRadius: "6px",
              }}
            >
              <option value="">Select Relationship</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Wife">Wife</option>
              <option value="Child">Child</option>
            </select>
          </div>

          {/* DOB */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark">
              Date of Birth
            </label>
            <input
              type="date"
              className="form-control text-dark"
              name="DOB"
              value={formData.DOB}
              onChange={handleChange}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid rgba(0,0,0,0.3)", // faint border
                borderRadius: "6px",
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn w-100 fw-semibold mt-3"
            style={{
              backgroundColor: "#000000",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "10px",
              fontSize: "16px",
            }}
          >
            Register Family Member
          </button>
        </form>
      </div>
    </div>
  );
};

export default FamilyMemberRegistration;
