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
import "./InstitutesTheme.css";
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

  const roleLabels = {
    institute: "Institute",
    doctor: "Doctor",
    pharmacist: "Pharmacy",
    diagnosis: "Diagnosis",
    xray: "X-Ray",
    front_desk: "Front Desk"
  };
  const roleLabel = roleLabels[role] || "Institute";
  const dashboardTitle = `${roleLabel} Dashboard`;
  const welcomeMessage = `Welcome back, ${institute?.Institute_Name || roleLabel}`;
  const dashboardSubtitle = "Access your modules, records, and workflows from one place.";

  const QuickCard = ({ icon, title, desc, onClick }) => (
    <div className="col-12 col-md-6 col-lg-3">
      <div
        className="quick-dashboard-card h-100"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        aria-label={title}
      >
        <div className="quick-dashboard-card__accent" />
        <div className="quick-dashboard-card__body">
          <div className="quick-dashboard-card__icon-wrap" aria-hidden="true">
            {icon}
          </div>
          <h5 className="quick-dashboard-card__title">{title}</h5>
          <p className="quick-dashboard-card__desc mb-0">{desc}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="min-vh-100 institutes-theme"
      style={{
        fontFamily: "Inter, sans-serif",
        background: "transparent"
      }}
    >
      <style>
        {`
          .institute-dashboard-section {
            background:
              radial-gradient(circle at top left, rgba(191,219,254,0.58), transparent 26%),
              radial-gradient(circle at right center, rgba(224,242,254,0.72), transparent 32%),
              linear-gradient(180deg, #F7FBFF 0%, #EEF6FF 100%);
            padding: 30px 24px 38px;
          }

          .institute-dashboard-intro {
            text-align: center;
            margin: 0 auto 26px;
            max-width: 760px;
          }

          .institute-dashboard-pill {
            display: inline-flex;
            align-items: center;
            padding: 7px 14px;
            border-radius: 999px;
            background: rgba(255,255,255,0.74);
            border: 1px solid rgba(255,255,255,0.86);
            color: #2563EB;
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            margin-bottom: 14px;
            box-shadow: 0 12px 26px rgba(147,197,253,0.18);
          }

          .institute-dashboard-title {
            font-weight: 700;
            color: #1F2933;
            font-size: 2rem;
            margin-bottom: 6px;
          }

          .institute-dashboard-subtitle {
            color: #6B7280;
            font-size: 1rem;
          }

          .quick-dashboard-card {
            height: 100%;
            border-radius: 20px;
            border: 1px solid rgba(219, 234, 254, 0.95);
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 12px 28px rgba(59, 130, 246, 0.1);
            cursor: pointer;
            transition: transform 0.26s ease, box-shadow 0.26s ease, border-color 0.26s ease;
            outline: none;
            position: relative;
            overflow: hidden;
          }

          .quick-dashboard-card__accent {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(90deg, #2563EB, #38BDF8);
          }

          .quick-dashboard-card__body {
            padding: 28px 24px 24px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            gap: 11px;
            min-height: 242px;
          }

          .quick-dashboard-card__icon-wrap {
            width: 62px;
            height: 62px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #DBEAFE, #FFFFFF);
            color: #2563EB;
            box-shadow: 0 12px 24px rgba(191,219,254,0.16);
            transition: transform 0.26s ease;
          }

          .quick-dashboard-card__title {
            margin: 4px 0 0;
            font-size: 1.05rem;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.01em;
          }

          .quick-dashboard-card__desc {
            font-size: 0.92rem;
            line-height: 1.45;
            color: #64748b;
          }

          .quick-dashboard-card:hover,
          .quick-dashboard-card:focus-visible {
            transform: translateY(-10px) scale(1.015);
            box-shadow: 0 20px 40px rgba(74,112,169,0.22);
            border-color: rgba(147, 197, 253, 1);
          }

          .quick-dashboard-card:hover .quick-dashboard-card__icon-wrap,
          .quick-dashboard-card:focus-visible .quick-dashboard-card__icon-wrap {
            transform: scale(1.08) rotate(-3deg);
          }

          @media (max-width: 991.98px) {
            .institute-dashboard-section {
              padding: 24px 16px 28px;
            }

            .institute-dashboard-title {
              font-size: 1.65rem;
            }
          }
        `}
      </style>
      {/* HEADER */}
<div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center position-relative glass-card" style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none", zIndex: 1200, overflow: "visible" }}>
  <div>
    <small className="text-muted section-pill">
      {welcomeMessage}
    </small>
    <h3 className="fw-bold mb-2">{dashboardTitle}</h3>
    
  </div>
   
{/* <small className="text-muted center">SARCPL
    </small> */}
  <div style={{ position: "relative", zIndex: 1250 }}>
   
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
          backgroundColor: "rgba(255,255,255,0.88)",
          borderRadius: "18px",
          boxShadow: "0 20px 34px rgba(148,184,255,0.18)",
          border: "1px solid rgba(255,255,255,0.88)",
          backdropFilter: "blur(18px)",
          zIndex: 1300
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
      <div className="container-fluid institute-dashboard-section" style={{ position: "relative", zIndex: 1 }}>
        {/* <div className="institute-dashboard-intro">
          <div className="institute-dashboard-pill">{roleLabel} Workspace</div>
          <h2 className="institute-dashboard-title">
            {welcomeMessage}
          </h2>
          <p className="institute-dashboard-subtitle mb-0">
            {dashboardTitle} • {dashboardSubtitle}
          </p>
        </div> */}

        <div className="row g-4 mx-auto" style={{ maxWidth: "1320px" }}>

          {hasAccess("doctorCard") && (
            <QuickCard
              icon={<FaHistory size={35} />}
              title="Doctor"
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
              title="Registration"
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
