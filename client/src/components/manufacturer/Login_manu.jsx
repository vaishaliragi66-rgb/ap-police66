import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSignInAlt, FaIndustry } from "react-icons/fa";
import axios from "axios";

function Login_manu() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("manufacturer");
    if (storedUser && storedUser !== "undefined") {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.Manufacturer_Name && parsed._id) {
          navigate(`/manufacturer-dashboard`);
        } else {
          localStorage.removeItem("manufacturer");
        }
      } catch {
        localStorage.removeItem("manufacturer");
      }
    }
  }, [navigate]);

  async function onSubmit(data) {
    setIsSubmitting(true);
    try {
      const response = await axios.get(
        `http://localhost:6100/manufacturer-api/manufacturer/name/${data.Manufacturer_Name}`
      );

      const manufacturer = response.data;

      if (!manufacturer) {
        alert("❌ Manufacturer not found");
        return;
      }

      if (manufacturer.password === data.password) {
        localStorage.setItem("manufacturer", JSON.stringify(manufacturer));
        alert("✅ Login successful!");
        navigate(`/manufacturer-layout/${manufacturer.Manufacturer_Name}`);
      } else {
        alert("❌ Incorrect password");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("⚠️ Login failed, please try again");
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
        paddingTop: "10px",
      }}
    >
      {/* Header */}
      <div
        className="text-center mb-5"
        style={{
          marginBottom: "2.8rem", // spacing between title and card
        }}
      >
        <h2
          className="fw-bold text-dark"
          style={{
            fontSize: "3rem",
            letterSpacing: "0.4px",
            marginBottom: "0.8rem", // reduces stickiness to subtext
          }}
        >
          Manufacturer Login
        </h2>
        <p
          className="text-muted"
          style={{
            fontSize: "0.9rem",
            marginBottom: "0", // keep this clean
          }}
        >
          Access your manufacturer dashboard
        </p>
      </div>

      {/* Login Card */}
      <div
        className="card border-0 rounded-4 p-4 d-flex align-items-center"
        style={{
          width: "370px",
          backgroundColor: "#fff",
          boxShadow:
            "0 8px 25px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06)",
          transition: "all 0.3s ease",
        }}
      >
        {/* Big Center Icon */}
        <div
          className="d-flex justify-content-center align-items-center mb-4"
          style={{
            backgroundColor: "#f1f3f2",
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            boxShadow: "inset 0 0 8px rgba(0,0,0,0.08)",
            marginTop: "-10px",
          }}
        >
          <FaIndustry size={46} color="#333" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="w-100">
          {/* Manufacturer Name */}
          <div className="mb-3">
            <input
              type="text"
              {...register("Manufacturer_Name", {
                required: "Manufacturer Name required",
              })}
              className={`form-control border-0 ${
                errors.Manufacturer_Name ? "is-invalid" : ""
              }`}
              placeholder="Manufacturer Name"
              style={{
                borderRadius: "10px",
                backgroundColor: "#f8f8f8",
                height: "42px",
                fontSize: "0.9rem",
                boxShadow: "inset 0 0 3px rgba(0, 0, 0, 0.05)",
              }}
            />
            {errors.Manufacturer_Name && (
              <div className="invalid-feedback">
                {errors.Manufacturer_Name.message}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="mb-3">
            <input
              type="password"
              {...register("password", { required: "Password required" })}
              className={`form-control border-0 ${
                errors.password ? "is-invalid" : ""
              }`}
              placeholder="Password"
              style={{
                borderRadius: "10px",
                backgroundColor: "#f8f8f8",
                height: "42px",
                fontSize: "0.9rem",
                boxShadow: "inset 0 0 3px rgba(0, 0, 0, 0.05)",
              }}
            />
            {errors.password && (
              <div className="invalid-feedback">{errors.password.message}</div>
            )}
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn w-100 fw-semibold d-flex align-items-center justify-content-center"
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
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Logging in...
              </>
            ) : (
              <>
                <FaSignInAlt
                  className="me-2"
                  size={14}
                  style={{ marginTop: "-1px" }}
                />{" "}
                Sign In
              </>
            )}
          </button>
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

export default Login_manu;
