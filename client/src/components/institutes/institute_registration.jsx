import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaUniversity, FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from "react-router-dom";

const InstituteRegister = () => {
  const [formData, setFormData] = useState({
    Institute_Name: "",
    Email_ID: "",
    password: "",
    confirm_password: "",
    Contact_No: "",
    Address: {
      Street: "",
      District: "",
      State: "",
      Pincode: "",
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    setMessage("");
    setLoading(true);

    if (formData.password !== formData.confirm_password) {
      setMessage("❌ Password and Confirm Password do not match");
      setLoading(false);
      return;
    }

    const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;
    const { confirm_password, ...payload } = formData;

    try {
      const res = await fetch(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/register/institute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ " + data.message);
        setFormData({
          Institute_Name: "",
          Email_ID: "",
          password: "",
          confirm_password: "",
          Contact_No: "",
          Address: { Street: "", District: "", State: "", Pincode: "" },
        });
        setTimeout(() => navigate("/institutes/login"), 1500);
      } else {
        setMessage("❌ " + (data.message || data.error));
      }
    } catch {
      setMessage("❌ Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex flex-column align-items-center min-vh-100"
      style={{
        background: "linear-gradient(135deg, #f2f2f2, #e6e6e6)",
        paddingTop: "30px",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <FaUniversity size={42} className="text-dark mb-2" />
        <h3 className="fw-bold text-dark mb-1">Institute Registration</h3>
        <p className="text-muted" style={{ fontSize: "14px" }}>
          Register your institution securely
        </p>
      </div>

      {/* Form Card */}
      <div
        className="bg-white p-4 rounded shadow"
        style={{ width: "100%", maxWidth: "600px" }}
      >
        <div className="border-bottom mb-3 pb-2">
          <h5 className="fw-semibold text-secondary mb-0">
            Institute Details
          </h5>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="form-control mb-3"
            name="Institute_Name"
            placeholder="Institute Name"
            value={formData.Institute_Name}
            onChange={handleChange}
            required
          />

          <input
            className="form-control mb-3"
            name="Email_ID"
            type="email"
            placeholder="Email Address"
            value={formData.Email_ID}
            onChange={handleChange}
            required
          />

          {/* Password */}
          <div className="position-relative mb-3">
            <input
              className="form-control"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#555",
              }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {/* Confirm Password */}
          <div className="position-relative mb-3">
            <input
              className="form-control"
              name="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
            />
            <span
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#555",
              }}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <input
            className="form-control mb-3"
            name="Contact_No"
            placeholder="Contact Number"
            value={formData.Contact_No}
            onChange={handleChange}
            required
          />

          <hr className="text-secondary" />
          <h6 className="text-muted mb-2">Address Information</h6>

          {["Street", "District", "State", "Pincode"].map((field) => (
            <input
              key={field}
              className="form-control mb-3"
              name={field}
              placeholder={field}
              value={formData.Address[field]}
              onChange={handleChange}
              required
            />
          ))}

          <button
            className="btn w-100 fw-semibold"
            style={{
              backgroundColor: "#111",
              color: "#fff",
              letterSpacing: "0.5px",
            }}
            disabled={loading}
          >
            {loading ? "Registering..." : "REGISTER"}
          </button>
        </form>

        {message && (
          <div
            className={`alert mt-3 ${
              message.startsWith("✅")
                ? "alert-success"
                : "alert-danger"
            }`}
            style={{ fontSize: "14px" }}
          >
            {message}
          </div>
        )}
         {/* ✅ Login Link (RESTORED) */}
        <div className="text-center mt-3">
          <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
            Already registered?{" "}
            <Link
              to="/institutes/login"
              className="fw-semibold text-decoration-none"
            >
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstituteRegister;
