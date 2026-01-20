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
    Blood_Group: "",
    Height: "",
    Weight: "",
    Phone_No: "",
    Address: {
      Street: "",
      District: "",
      State: "",
      Pincode: "",
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle Address nested object separately
    if (name.startsWith("Address.")) {
      const key = name.split(".")[1];
      setFormData({
        ...formData,
        Address: { ...formData.Address, [key]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!employeeId) {
      alert("Employee not logged in. Please login again.");
      return;
    }

    try {
      const payload = {
        ...formData,
        EmployeeId: employeeId,
      };

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
        Blood_Group: "",
        Height: "",
        Weight: "",
        Phone_No: "",
        Address: {
          Street: "",
          District: "",
          State: "",
          Pincode: "",
        },
      });
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
          <div
        className="d-flex justify-content-center"
        style={{
          backgroundColor: "#F8FAFC",
          fontFamily: "'Inter', sans-serif",
          paddingTop: "60px",   // ✅ space from top
          paddingBottom: "40px"
        }}
      >

      <div
        className="p-4"
        style={{
          width: "700px",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #D6E0F0",
          boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
        }}
      >
              <h3
        className="text-center mb-4"
        style={{
          fontWeight: 600,
          color: "#1F2933",
          paddingBottom: "10px",
          borderBottom: "1px solid #D6E0F0",
        }}
      >
        Family Member Registration
      </h3>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Name</label>
            <input
              type="text"
              className="form-control"
              name="Name"
              value={formData.Name}
              onChange={handleChange}
              required
            />
          </div>
  
          {/* Gender */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Gender</label>
            <div className="d-flex gap-4 mt-1">
              {["Male", "Female"].map((g) => (
                <div className="form-check" key={g}>
                  <input
                    className="form-check-input"
                    type="radio"
                    name="Gender"
                    value={g}
                    checked={formData.Gender === g}
                    onChange={handleChange}
                    required
                  />
                  <label className="form-check-label">{g}</label>
                </div>
              ))}
            </div>
          </div>
  
          {/* Relationship */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Relationship</label>
            <select
              className="form-select"
              name="Relationship"
              value={formData.Relationship}
              onChange={handleChange}
              required
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
            <label className="form-label fw-semibold">Date of Birth</label>
            <input
              type="date"
              className="form-control"
              name="DOB"
              value={formData.DOB}
              onChange={handleChange}
            />
          </div>
  
          {/* Blood Group */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Blood Group</label>
            <select
              className="form-select"
              name="Blood_Group"
              value={formData.Blood_Group}
              onChange={handleChange}
            >
              <option value="">Select</option>
              {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
  
          {/* Height & Weight */}
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Height (cm)</label>
              <input
                type="text"
                className="form-control"
                name="Height"
                value={formData.Height}
                onChange={handleChange}
              />
            </div>
  
            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Weight (kg)</label>
              <input
                type="text"
                className="form-control"
                name="Weight"
                value={formData.Weight}
                onChange={handleChange}
              />
            </div>
          </div>
  
          {/* Phone */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Phone Number</label>
            <input
              type="text"
              className="form-control"
              name="Phone_No"
              value={formData.Phone_No}
              onChange={handleChange}
            />
          </div>
  
          {/* Address */}
          <h6
            className="fw-semibold mt-4 mb-2"
            style={{ color: "#4A70A9" }}
          >
            Address Details
          </h6>
  
          <input
            className="form-control mb-2"
            placeholder="Street"
            name="Address.Street"
            value={formData.Address.Street}
            onChange={handleChange}
          />
          <input
            className="form-control mb-2"
            placeholder="District"
            name="Address.District"
            value={formData.Address.District}
            onChange={handleChange}
          />
          <input
            className="form-control mb-2"
            placeholder="State"
            name="Address.State"
            value={formData.Address.State}
            onChange={handleChange}
          />
          <input
            className="form-control mb-3"
            placeholder="Pincode"
            name="Address.Pincode"
            value={formData.Address.Pincode}
            onChange={handleChange}
          />
  
          {/* Submit */}
          <button
            type="submit"
            className="btn w-100 mt-3"
            style={{
              backgroundColor: "#4A70A9",
              color: "#FFFFFF",
              fontWeight: 500,
              borderRadius: "999px",
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