import React, { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import {
  FaUserCircle,
  FaUsers,
  FaHistory,
  FaChartLine,
  FaPills,
  FaFileMedical,
  FaClipboardList,
  FaVials
} from "react-icons/fa";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
const Institute_home = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const institute = JSON.parse(localStorage.getItem("institute") || "{}");
  const role = localStorage.getItem("role") || "institute";
  const token = localStorage.getItem("instituteToken");
  
  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
    } else {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, [token, navigate]);

  // ✅ Proper Logout
  const handleSignout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("institute");

    delete axios.defaults.headers.common["Authorization"];

    navigate("/", { replace: true });
  };

  // ---------------- ROLE → CARD MAPPING ----------------

  const cardAccess = {
    institute: [
      "doctorCard",
      "pharmacyCard",
      "diagnosisCard",
      "xrayCard",
      "visitCard",
      "healthCard",
      "othersCard",
      "addPasswordCard"
    ],
    doctor: ["doctorCard", "healthCard", "othersCard"],
    pharmacist: ["pharmacyCard", "healthCard", "othersCard"],
    diagnosis: ["diagnosisCard", "healthCard", "othersCard"],
    xray: ["xrayCard", "healthCard", "othersCard"],
    front_desk: ["visitCard", "healthCard", "othersCard"]
  };

  const hasAccess = (card) => {
    return cardAccess[role]?.includes(card);
  };

  const dashboardTitle = "Front Desk";
  const welcomeMessage = role === "front_desk" ? "Welcome back, Front Desk" : `Welcome back, ${institute?.Institute_Name}`;

  const QuickCard = ({ icon, title, desc, onClick }) => (
    <div className="col-lg-4 col-md-6">
      <div
        className="card h-100 text-center border-0 shadow-sm"
        style={{
          borderRadius: "20px",
          cursor: "pointer",
          transition: "all 0.3s ease"
        }}
        onClick={onClick}
      >
        <div className="card-body p-5">
          {icon}
          <h5 className="fw-semibold mt-4">{title}</h5>
          <p className="text-muted mb-0">{desc}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="min-vh-100"
      style={{
        fontFamily: "Inter, sans-serif",
        background: "linear-gradient(135deg, #f4f7ff 0%, #eef2ff 100%)"
      }}
    >
      {/* HEADER */}
<div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center position-relative">
  <div>
    <h3 className="fw-bold mb-2">{dashboardTitle}</h3>
    <small className="text-muted">
      {welcomeMessage}
    </small>
  </div>
   
{/* <small className="text-muted center">SARCPL
    </small> */}
  <div style={{ position: "relative" }}>
   
    <FaUserCircle
      size={36}
      style={{ cursor: "pointer" }}
      onClick={() => setShowDropdown(prev => !prev)}
    />

    {showDropdown && (
      <div
        style={{
          position: "absolute",
          right: 0,
          top: "45px",
          width: "180px",
          backgroundColor: "#fff",
          borderRadius: "10px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
          zIndex: 999
        }}
      >
        <button
          className="btn btn-light w-100 text-start"
          onClick={() => {
            setShowDropdown(false);
            navigate("/institutes/profile");
          }}
        >
          👤 Profile
        </button>

        <button
          className="btn btn-light w-100 text-start text-danger"
          onClick={() => {
            setShowDropdown(false);
            handleSignout();
          }}
        >
          🚪 Logout
        </button>
      </div>
    )}
  </div>
</div>


      {/* DASHBOARD */}
      <div className="container-fluid p-4">
        <div className="row g-4">

          {hasAccess("doctorCard") && (
            <QuickCard
              icon={<FaHistory size={35} />}
              title="Doctor Prescription"
              desc="View & manage doctor prescriptions"
              onClick={() => navigate("/institutes/doctor-prescription")}
            />
          )}

          {hasAccess("pharmacyCard") && (
            <QuickCard
              icon={<FaPills size={35} />}
              title="Pharmacy"
              desc="Issue medicines to employees"
              onClick={() => navigate("/institutions/prescriptions")}
            />
          )}

          {hasAccess("diagnosisCard") && (
            <QuickCard
              icon={<FaClipboardList size={35} />}
              title="Diagnosis"
              desc="Enter & view diagnoses"
              onClick={() => navigate("/institutions/diagnosis-entry")}
            />
          )}

          {hasAccess("xrayCard") && (
            <QuickCard
              icon={<FaVials size={35} />}
              title="X-Ray"
              desc="Record and view X-ray details"
              onClick={() => navigate("/institutions/xray-entry")}
            />
          )}

          {hasAccess("visitCard") && (
            <QuickCard
              icon={<FaUsers size={35} />}
              title="Visit Register"
              desc="Register daily visits"
              onClick={() => navigate("/institutes/visit-register")}
            />
          )}

          {hasAccess("healthCard") && (
            <QuickCard
              icon={<FaChartLine size={35} />}
              title="Health Summary"
              desc="Daily & Monthly health analytics"
              onClick={() => navigate("/institutes/health-summary")}
            />
          )}

          {hasAccess("othersCard") && (
            <QuickCard
              icon={<FaFileMedical size={35} />}
              title="Others"
              desc="Ledger, Indent, Stores, AI Insights"
              onClick={() => navigate("/institutes/ledger")}
            />
          )}

          {hasAccess("addPasswordCard") && (
            <QuickCard
              icon={<FaUserCircle size={35} />}
              title="Add / Update Role Passwords"
              desc="Configure role passwords"
              onClick={() => navigate("/institutes/add-password")}
            />
          )}
        </div>

        <Outlet />
      </div>
    </div>
  );
};

export default Institute_home;
