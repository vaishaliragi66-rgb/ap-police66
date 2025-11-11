import { useForm } from "react-hook-form";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FaIndustry,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaLock,
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

function Register_manu() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister(data) {
    setIsSubmitting(true);
    try {
      const formattedData = {
        Manufacturer_Name: data.Manufacturer_Name,
        Contact_No: data.Contact_No,
        Email_ID: data.Email_ID,
        password: data.password,
        Address: {
          Street: data.Street,
          District: data.District,
          State: data.State,
          Pincode: data.Pincode,
        },
      };

      const response = await axios.post(
        "http://localhost:6100/manufacturer-api/register_manufacturer",
        formattedData
      );

      alert(`✅ Registration successful for ${response.data.Manufacturer_Name}`);
      localStorage.removeItem("manufacturer");
      navigate("/manufacturer-login");
    } catch (error) {
      console.error("Registration error:", error);
      alert(
        `Registration failed: ${error.response?.data?.message || error.message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100"
      style={{
        background:
          "radial-gradient(circle at 30% 20%, #f1f1f1, #f7f7f7 50%, #e9e9e9 100%)",
        paddingTop: "20px",
      }}
    >
      {/* Header */}
      <div
        className="text-center mb-5"
        style={{
          marginBottom: "2.8rem",
        }}
      >
        <h2
          className="fw-bold text-dark"
          style={{
            fontSize: "3rem",
            letterSpacing: "0.4px",
            marginBottom: "0.8rem",
          }}
        >
          Manufacturer Registration
        </h2>
        <p
          className="text-muted"
          style={{
            fontSize: "0.9rem",
            marginBottom: "0",
          }}
        >
          Register your manufacturing unit with AP Police Medical Division
        </p>
      </div>

      {/* Registration Card */}
      <div
        className="card border-0 rounded-4 p-4 p-md-5"
        style={{
          width: "800px",
          backgroundColor: "#fff",
          boxShadow:
            "0 8px 25px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06)",
          transition: "all 0.3s ease",
        }}
      >
        {/* Center Icon */}
        <div
          className="d-flex justify-content-center align-items-center mb-4"
          style={{
            backgroundColor: "#f1f3f2",
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            margin: "0 auto",
            boxShadow: "inset 0 0 8px rgba(0,0,0,0.08)",
          }}
        >
          <FaIndustry size={46} color="#333" />
        </div>

        <form onSubmit={handleSubmit(handleRegister)}>
          {/* Manufacturer Name */}
          <div className="mb-3">
            <label className="form-label d-flex align-items-center gap-2 small text-muted fw-bold">
              <FaIndustry /> Manufacturer Name
            </label>
            <input
              type="text"
              {...register("Manufacturer_Name", {
                required: "Manufacturer name is required",
              })}
              className={`form-control ${
                errors.Manufacturer_Name ? "is-invalid" : ""
              }`}
              placeholder="Company name"
              style={{
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
              }}
            />
            {errors.Manufacturer_Name && (
              <div className="invalid-feedback">
                {errors.Manufacturer_Name.message}
              </div>
            )}
          </div>

          {/* Address Fields */}
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label d-flex align-items-center gap-2 small text-muted fw-bold">
                <FaMapMarkerAlt /> Street
              </label>
              <input
                type="text"
                {...register("Street", { required: "Street is required" })}
                className={`form-control ${errors.Street ? "is-invalid" : ""}`}
                placeholder="Street / Area"
                style={{
                  borderRadius: "8px",
                  backgroundColor: "#f9f9f9",
                }}
              />
              {errors.Street && (
                <div className="invalid-feedback">{errors.Street.message}</div>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label d-flex align-items-center gap-2 small text-muted fw-bold">
                <FaMapMarkerAlt /> District
              </label>
              <input
                type="text"
                {...register("District", { required: "District is required" })}
                className={`form-control ${
                  errors.District ? "is-invalid" : ""
                }`}
                placeholder="District"
                style={{
                  borderRadius: "8px",
                  backgroundColor: "#f9f9f9",
                }}
              />
              {errors.District && (
                <div className="invalid-feedback">{errors.District.message}</div>
              )}
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label d-flex align-items-center gap-2 small text-muted fw-bold">
                <FaMapMarkerAlt /> State
              </label>
              <input
                type="text"
                {...register("State", { required: "State is required" })}
                className={`form-control ${errors.State ? "is-invalid" : ""}`}
                placeholder="State"
                style={{
                  borderRadius: "8px",
                  backgroundColor: "#f9f9f9",
                }}
              />
              {errors.State && (
                <div className="invalid-feedback">{errors.State.message}</div>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label d-flex align-items-center gap-2 small text-muted fw-bold">
                <FaMapMarkerAlt /> Pincode
              </label>
              <input
                type="text"
                {...register("Pincode", { required: "Pincode is required" })}
                className={`form-control ${
                  errors.Pincode ? "is-invalid" : ""
                }`}
                placeholder="Pincode"
                style={{
                  borderRadius: "8px",
                  backgroundColor: "#f9f9f9",
                }}
              />
              {errors.Pincode && (
                <div className="invalid-feedback">{errors.Pincode.message}</div>
              )}
            </div>
          </div>

          {/* Contact, Email, Password */}
          <div className="mb-3">
            <label className="form-label d-flex align-items-center gap-2 small text-muted fw-bold">
              <FaPhone /> Contact Number
            </label>
            <input
              type="text"
              {...register("Contact_No", {
                required: "Contact number is required",
                pattern: {
                  value: /^[0-9]{10}$/,
                  message: "Enter valid 10-digit number",
                },
              })}
              className={`form-control ${
                errors.Contact_No ? "is-invalid" : ""
              }`}
              placeholder="10-digit phone number"
              style={{
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
              }}
            />
            {errors.Contact_No && (
              <div className="invalid-feedback">{errors.Contact_No.message}</div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label d-flex align-items-center gap-2 small text-muted fw-bold">
              <FaEnvelope /> Email
            </label>
            <input
              type="email"
              {...register("Email_ID", { required: "Email is required" })}
              className={`form-control ${
                errors.Email_ID ? "is-invalid" : ""
              }`}
              placeholder="Email address"
              style={{
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
              }}
            />
            {errors.Email_ID && (
              <div className="invalid-feedback">{errors.Email_ID.message}</div>
            )}
          </div>

          <div className="mb-4">
            <label className="form-label d-flex align-items-center gap-2 small text-muted fw-bold">
              <FaLock /> Password
            </label>
            <input
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be 6+ chars",
                },
              })}
              className={`form-control ${
                errors.password ? "is-invalid" : ""
              }`}
              placeholder="Enter password"
              style={{
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
              }}
            />
            {errors.password && (
              <div className="invalid-feedback">{errors.password.message}</div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn w-100 fw-semibold"
            style={{
              background: "linear-gradient(180deg, #1c1c1c 0%, #000 100%)",
              color: "#fff",
              borderRadius: "10px",
              height: "42px",
              fontSize: "0.92rem",
              fontWeight: "600",
              letterSpacing: "0.4px",
              border: "none",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              transition: "all 0.25s ease",
            }}
            onMouseOver={(e) => {
              e.target.style.background =
                "linear-gradient(180deg, #000 0%, #1a1a1a 100%)";
              e.target.style.boxShadow = "0 6px 12px rgba(0,0,0,0.25)";
              e.target.style.transform = "translateY(-1px)";
            }}
            onMouseOut={(e) => {
              e.target.style.background =
                "linear-gradient(180deg, #1c1c1c 0%, #000 100%)";
              e.target.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
              e.target.style.transform = "translateY(0)";
            }}
          >
            {isSubmitting ? "Registering..." : "Complete Registration"}
          </button>

          <div className="text-center mt-3 small">
            Already registered?{" "}
            <Link
              to="/manufacturer-login"
              onClick={() => localStorage.removeItem("manufacturer")}
              className="fw-semibold"
              style={{ color: "#000", textDecoration: "none" }}
            >
              Login here
            </Link>
          </div>
        </form>

        {/* Footer */}
        <p
          className="text-center text-muted mt-3 mb-0"
          style={{ fontSize: "0.8rem" }}
        >
          © 2025 AP Police Health Division
        </p>
      </div>
    </div>
  );
}

export default Register_manu;
