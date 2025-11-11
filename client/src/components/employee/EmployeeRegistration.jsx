import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FaUserPlus } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

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

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/employee-api/register`,
        formData
      );
      alert("✅ Employee registered successfully!");
      navigate("/employee/login");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "❌ Registration failed!");
    }
  };

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-start min-vh-100"
      style={{
        backgroundColor: "#f5f6f7",
        fontFamily: "Inter, sans-serif",
        padding: "60px 20px",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <FaUserPlus size={46} className="text-dark mb-2" />
        <h2 className="fw-bold text-dark mb-2">Employee Registration</h2>
        <div
          style={{
            width: "80px",
            height: "3px",
            backgroundColor: "#000",
            borderRadius: "3px",
            margin: "0 auto 15px auto",
          }}
        ></div>
        <p className="text-muted" style={{ fontSize: "0.95rem" }}>
          Fill out your personal and address details to register
        </p>
      </div>

      {/* Form Card */}
      <div
        className="bg-white p-5 rounded-4 shadow-sm w-100"
        style={{
          maxWidth: "900px",
          border: "1px solid #e5e5e5",
          boxShadow: "0 8px 25px rgba(0, 0, 0, 0.07)",
        }}
      >
        <form onSubmit={handleSubmit}>
          <div className="row">
            {/* Left Column – Personal Details */}
            <div className="col-md-6 pe-md-4">
              <h5 className="fw-bold text-dark mb-3">Personal Details</h5>

              <div className="mb-3">
                <label className="form-label text-muted small fw-semibold">
                  ABS Number
                </label>
                <input
                  type="text"
                  name="ABS_NO"
                  className="form-control border-0 shadow-sm"
                  placeholder="Enter ABS Number"
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-semibold">
                  Full Name
                </label>
                <input
                  type="text"
                  name="Name"
                  className="form-control border-0 shadow-sm"
                  placeholder="Enter full name"
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-semibold">
                  Email
                </label>
                <input
                  type="email"
                  name="Email"
                  className="form-control border-0 shadow-sm"
                  placeholder="Enter email"
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-semibold">
                  Password
                </label>
                <input
                  type="password"
                  name="Password"
                  className="form-control border-0 shadow-sm"
                  placeholder="Enter password"
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-semibold">
                  Designation
                </label>
                <input
                  type="text"
                  name="Designation"
                  className="form-control border-0 shadow-sm"
                  placeholder="Enter designation"
                  onChange={handleChange}
                  style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
                />
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label text-muted small fw-semibold">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="DOB"
                    className="form-control border-0 shadow-sm"
                    onChange={handleChange}
                    style={{
                      backgroundColor: "#f8f8f8",
                      borderRadius: "10px",
                    }}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label text-muted small fw-semibold">
                    Blood Group
                  </label>
                  <select
                    name="Blood_Group"
                    className="form-select border-0 shadow-sm"
                    onChange={handleChange}
                    style={{
                      backgroundColor: "#f8f8f8",
                      borderRadius: "10px",
                    }}
                  >
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
                </div>
              </div>
            </div>

            {/* Divider Line */}
            <div
              className="d-none d-md-block col-md-1"
              style={{
                borderLeft: "1px solid #e0e0e0",
                height: "100%",
              }}
            ></div>

            {/* Right Column – Address Details */}
            <div className="col-md-5 ps-md-4">
              <h5 className="fw-bold text-dark mb-3">Address Details</h5>

              <div className="mb-3">
                <label className="form-label text-muted small fw-semibold">
                  Street
                </label>
                <input
                  type="text"
                  name="Street"
                  className="form-control border-0 shadow-sm"
                  placeholder="Street"
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-semibold">
                  District
                </label>
                <input
                  type="text"
                  name="District"
                  className="form-control border-0 shadow-sm"
                  placeholder="District"
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-semibold">
                  State
                </label>
                <input
                  type="text"
                  name="State"
                  className="form-control border-0 shadow-sm"
                  placeholder="State"
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-semibold">
                  Pincode
                </label>
                <input
                  type="text"
                  name="Pincode"
                  className="form-control border-0 shadow-sm"
                  placeholder="Pincode"
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-4 text-center">
            <button
              type="submit"
              className="btn fw-semibold px-5 py-2"
              style={{
                background: "linear-gradient(180deg, #1c1c1c, #000)",
                color: "#fff",
                borderRadius: "10px",
                fontSize: "0.95rem",
                transition: "0.3s ease",
              }}
              onMouseOver={(e) =>
                (e.target.style.background =
                  "linear-gradient(180deg, #000, #1c1c1c)")
              }
              onMouseOut={(e) =>
                (e.target.style.background =
                  "linear-gradient(180deg, #1c1c1c, #000)")
              }
            >
              Register
            </button>
          </div>

          {/* Login Redirect */}
          <div className="text-center mt-3">
            <p className="text-muted small mb-0">
              Already registered?{" "}
              <Link
                to="/employee-login"
                className="fw-semibold"
                style={{ color: "#000", cursor: "pointer" }}
              >
                Login here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeRegister;
