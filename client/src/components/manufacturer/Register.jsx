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
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

function Register_manu() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // password visibility states
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const password = watch("password");

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
        `Registration failed: ${
          error.response?.data?.message || error.message
        }`
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
      <div className="text-center mb-5">
        <h2 className="fw-bold text-dark" style={{ fontSize: "3rem" }}>
          Manufacturer Registration
        </h2>
        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
          Register your manufacturing unit with AP Police Medical Division
        </p>
      </div>

      <div
        className="card border-0 rounded-4 p-4 p-md-5"
        style={{
          width: "800px",
          backgroundColor: "#fff",
          boxShadow:
            "0 8px 25px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06)",
        }}
      >
        <div
          className="d-flex justify-content-center align-items-center mb-4"
          style={{
            backgroundColor: "#f1f3f2",
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            margin: "0 auto",
          }}
        >
          <FaIndustry size={46} color="#333" />
        </div>

        <form onSubmit={handleSubmit(handleRegister)}>
          {/* Manufacturer Name */}
          <div className="mb-3">
            <label className="form-label small text-muted fw-bold">
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
            />
            {errors.Manufacturer_Name && (
              <div className="invalid-feedback">
                {errors.Manufacturer_Name.message}
              </div>
            )}
          </div>

          {/* Address */}
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label small text-muted fw-bold">
                <FaMapMarkerAlt /> Street
              </label>
              <input
                type="text"
                {...register("Street", { required: "Street is required" })}
                className={`form-control ${
                  errors.Street ? "is-invalid" : ""
                }`}
                placeholder="Street / Area"
              />
              {errors.Street && (
                <div className="invalid-feedback">
                  {errors.Street.message}
                </div>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label small text-muted fw-bold">
                <FaMapMarkerAlt /> District
              </label>
              <input
                type="text"
                {...register("District", { required: "District is required" })}
                className={`form-control ${
                  errors.District ? "is-invalid" : ""
                }`}
                placeholder="District"
              />
              {errors.District && (
                <div className="invalid-feedback">
                  {errors.District.message}
                </div>
              )}
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label small text-muted fw-bold">
                <FaMapMarkerAlt /> State
              </label>
              <input
                type="text"
                {...register("State", { required: "State is required" })}
                className={`form-control ${
                  errors.State ? "is-invalid" : ""
                }`}
                placeholder="State"
              />
              {errors.State && (
                <div className="invalid-feedback">
                  {errors.State.message}
                </div>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label small text-muted fw-bold">
                <FaMapMarkerAlt /> Pincode
              </label>
              <input
                type="text"
                {...register("Pincode", { required: "Pincode is required" })}
                className={`form-control ${
                  errors.Pincode ? "is-invalid" : ""
                }`}
                placeholder="Pincode"
              />
              {errors.Pincode && (
                <div className="invalid-feedback">
                  {errors.Pincode.message}
                </div>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="mb-3">
            <label className="form-label small text-muted fw-bold">
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
            />
            {errors.Contact_No && (
              <div className="invalid-feedback">
                {errors.Contact_No.message}
              </div>
            )}
          </div>

          {/* Email */}
          <div className="mb-3">
            <label className="form-label small text-muted fw-bold">
              <FaEnvelope /> Email
            </label>
            <input
              type="email"
              {...register("Email_ID", { required: "Email is required" })}
              className={`form-control ${
                errors.Email_ID ? "is-invalid" : ""
              }`}
              placeholder="Email address"
            />
            {errors.Email_ID && (
              <div className="invalid-feedback">
                {errors.Email_ID.message}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label small text-muted fw-bold">
              <FaLock /> Password
            </label>

            <div className="input-group">
              <input
                type={showPass ? "text" : "password"}
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
              />

              <span
                className="input-group-text"
                style={{ cursor: "pointer" }}
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            {errors.password && (
              <div className="invalid-feedback">
                {errors.password.message}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <label className="form-label small text-muted fw-bold">
              <FaLock /> Confirm Password
            </label>

            <div className="input-group">
              <input
                type={showConfirmPass ? "text" : "password"}
                {...register("confirmPassword", {
                  required: "Confirm password is required",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                })}
                className={`form-control ${
                  errors.confirmPassword ? "is-invalid" : ""
                }`}
                placeholder="Confirm password"
              />

              <span
                className="input-group-text"
                style={{ cursor: "pointer" }}
                onClick={() => setShowConfirmPass(!showConfirmPass)}
              >
                {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            {errors.confirmPassword && (
              <div className="invalid-feedback">
                {errors.confirmPassword.message}
              </div>
            )}
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn w-100 fw-semibold"
            style={{
              background: "linear-gradient(180deg, #1c1c1c 0%, #000 100%)",
              color: "#fff",
              borderRadius: "10px",
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
              style={{ color: "#000" }}
            >
              Login here
            </Link>
          </div>
        </form>

        <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: "0.8rem" }}>
          © 2025 AP Police Health Division
        </p>
      </div>
    </div>
  );
}

export default Register_manu;