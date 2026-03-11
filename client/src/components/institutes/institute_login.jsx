import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUniversity } from "react-icons/fa";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const InstituteLogin = () => {
  const [formData, setFormData] = useState({
    Email_ID: "",
    password: "",
    role: "institute",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const normalizedEmail = formData.Email_ID.trim().toLowerCase();
    const normalizedPassword = formData.password.trim();

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setMessage("❌ Please enter a valid email address");
      setLoading(false);
      return;
    }

    if (!normalizedPassword) {
      setMessage("❌ Password is required");
      setLoading(false);
      return;
    }

    try {
      let endpoint = "";

      if (formData.role === "institute") {
        endpoint = `/institute-auth/login`;
      } else {
        endpoint = `/institute-auth/role-login`;
      }

      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}${endpoint}`,
        {
          ...formData,
          Email_ID: normalizedEmail,
          password: normalizedPassword,
        }
      );

      /* ================= STORE TOKEN ================= */
      if (res.data.token) {
        localStorage.setItem("instituteToken", res.data.token);
        localStorage.setItem("role", formData.role);
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${res.data.token}`;
      }

      /* ================= STORE INSTITUTE DATA ================= */
      // Backend must return instituteId & instituteName in response
      if (res.data.instituteId) {
        const instituteData = {
          _id: res.data.instituteId,
          Institute_Name: res.data.instituteName || "Institute"
        };

        localStorage.setItem("institute", JSON.stringify(instituteData));
        localStorage.setItem("instituteId", res.data.instituteId);
      }

      setMessage("✅ Login successful");

      setTimeout(() => {
        navigate("/institutes/home");
      }, 1000);

    } catch (err) {
      setMessage(
        "❌ " + (err.response?.data?.message || "Login failed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100"
      style={{
        backgroundColor: "#F8FAFC",
        fontFamily: "'Inter', sans-serif",
        padding: "24px",
      }}
    >
      <div className="text-center mb-4">
        <div
          className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
          style={{
            width: "64px",
            height: "64px",
            backgroundColor: "#EAF2FF",
            color: "#4A70A9",
          }}
        >
          <FaUniversity size={30} />
        </div>

        <h3 style={{ fontWeight: 600, color: "#1F2933" }}>
          Institute Login
        </h3>
        <p style={{ color: "#6B7280", fontSize: "14px" }}>
          Access your institute dashboard
        </p>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: "32px",
          border: "1px solid #D6E0F0",
          boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
        }}
      >
        <form onSubmit={handleSubmit}>

          {/* ROLE */}
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: "13px" }}>
              Login As
            </label>
            <select
              name="role"
              className="form-control"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="institute">Institute</option>
              <option value="doctor">Doctor</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="diagnosis">Diagnosis</option>
              <option value="xray">Xray</option>
              <option value="front_desk">Front Desk</option>
            </select>
          </div>

          {/* EMAIL */}
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: "13px" }}>
              Email Address
            </label>
            <input
              type="email"
              className="form-control"
              name="Email_ID"
              value={formData.Email_ID}
              onChange={handleChange}
              required
            />
          </div>

          {/* PASSWORD */}
          <div className="mb-4">
            <label className="form-label" style={{ fontSize: "13px" }}>
              Password
            </label>
            <input
              type="password"
              className="form-control"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              backgroundColor: "#4A70A9",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "999px",
              padding: "10px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && (
          <div
            className={`alert mt-3 text-center ${
              message.startsWith("✅")
                ? "alert-success"
                : "alert-danger"
            }`}
          >
            {message}
          </div>
        )}
      </div>
      <div className="text-center mt-3">
  <p style={{ fontSize: "14px", color: "#6B7280" }}>
    Don't have an account?{" "}
    <Link
      to="/institutes/register"
      style={{
        color: "#4A70A9",
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      Register here
    </Link>
  </p>
</div>
    </div>
  );
};

export default InstituteLogin;