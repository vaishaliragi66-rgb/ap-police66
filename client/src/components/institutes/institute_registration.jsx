import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./institute_register.css";

const InstituteRegister = () => {
  const [formData, setFormData] = useState({
    Institute_Name: "",
    Email_ID: "",
    password: "",
    Contact_No: "",
    Address: {
      Street: "",
      District: "",
      State: "",
      Pincode: "",
    },
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    // handle nested Address fields separately
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
    setMessage("");
    setLoading(true);

    const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

    try {
      const res = await fetch(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/register/institute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ " + data.message);
        setFormData({
          Institute_Name: "",
          Email_ID: "",
          password: "",
          Contact_No: "",
          Address: { Street: "", District: "", State: "", Pincode: "" },
        });

        setTimeout(() => navigate("/instituteS/login"), 1500);
      } else {
        setMessage("❌ " + (data.message || data.error));
      }
    } catch (err) {
      setMessage("❌ Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div
        className="card shadow-lg p-4 rounded-4 register-card w-100"
        style={{ maxWidth: "600px" }}
      >
        <h3 className="text-center mb-4 fw-bold text-primary">
          Institute Registration
        </h3>
        <form onSubmit={handleSubmit}>
          {/* Institute Name */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Institute Name</label>
            <input
              type="text"
              className="form-control"
              name="Institute_Name"
              placeholder="Enter institute name"
              value={formData.Institute_Name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Email ID</label>
            <input
              type="email"
              className="form-control"
              name="Email_ID"
              placeholder="Enter email"
              value={formData.Email_ID}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              className="form-control"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          {/* Contact Number */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Contact Number</label>
            <input
              type="text"
              className="form-control"
              name="Contact_No"
              placeholder="Enter contact number"
              value={formData.Contact_No}
              onChange={handleChange}
              required
              pattern="^[0-9]{10}$"
              title="Enter a valid 10-digit phone number"
            />
          </div>

          {/* Address Fields */}
          <h5 className="mt-4 text-primary">Address Details</h5>

          <div className="mb-3">
            <label className="form-label fw-semibold">Street</label>
            <input
              type="text"
              className="form-control"
              name="Street"
              placeholder="Street"
              value={formData.Address.Street}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">District</label>
            <input
              type="text"
              className="form-control"
              name="District"
              placeholder="District"
              value={formData.Address.District}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">State</label>
            <input
              type="text"
              className="form-control"
              name="State"
              placeholder="State"
              value={formData.Address.State}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Pincode</label>
            <input
              type="text"
              className="form-control"
              name="Pincode"
              placeholder="Pincode"
              value={formData.Address.Pincode}
              onChange={handleChange}
              required
              pattern="^[0-9]{6}$"
              title="Enter a valid 6-digit pincode"
            />
          </div>

          {/* Submit Button */}
          <div className="d-grid mt-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center mt-3">
            <p className="mb-0">
              Already registered?{" "}
              <a href="#" onClick={() => navigate("/instituteS/login")} className="text-primary text-decoration-none">
                Login here
              </a>
            </p>
          </div>
        </form>

        {/* Message */}
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

export default InstituteRegister;
