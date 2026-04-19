import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserFriends,
  FaNotesMedical,
  FaPrescriptionBottleAlt,
  FaVirus,
  FaSignOutAlt,
  FaImage,
  FaUser,
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

const EmployeeHome = () => {
  const navigate = useNavigate();
  const employeeName = localStorage.getItem("employeeName") || "Employee";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Card data
  const cards = [
    {
      icon: <FaUser size={30} />,
      title: "My Profile",
      desc: "View and edit your personal profile.",
      onClick: () => navigate("/employee/profile"),
      btnText: "View Profile",
    },
    {
      icon: <FaUserFriends size={30} />,
      title: "Family Members",
      desc: "Register and manage your family members.",
      onClick: () => navigate("/employee/family_register"),
      btnText: "Register",
    },
    {
      icon: <FaNotesMedical size={30} />,
      title: "Diagnosis Reports",
      desc: "View your test reports and results.",
      onClick: () => navigate("/employee/diagnosis-report"),
      btnText: "View Reports",
    },
    {
      icon: <FaPrescriptionBottleAlt size={30} />,
      title: "Prescriptions",
      desc: "Check your prescription history and medications.",
      onClick: () => navigate("/employee/prescription-report"),
      btnText: "View Prescriptions",
    },
    {
      icon: <FaVirus size={30} />,
      title: "Disease History",
      desc: "Track your health records and previous conditions.",
      onClick: () => navigate("/employee/disease-history"),
      btnText: "View History",
    },
    {
      icon: <FaImage size={30} />,
      title: "X‑ray Reports",
      desc: "View your x‑ray records and findings.",
      onClick: () => navigate("/employee/xray-report"),
      btnText: "View Reports",
    },
    {
      icon: <FaSignOutAlt size={30} />,
      title: "Logout",
      desc: "Sign out from your account securely.",
      onClick: handleLogout,
      btnText: "Logout",
    },
  ];

  return (
    <div
      style={{
        background:
          "radial-gradient(circle at top left, rgba(191,219,254,0.62), transparent 24%), radial-gradient(circle at right center, rgba(224,242,254,0.74), transparent 28%), linear-gradient(180deg, #F5FAFF, #EEF6FF)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
<header
  style={{
    background: "rgba(255,255,255,0.78)",
    width: "100%",
    padding: "18px 32px",
    fontWeight: 600,
    fontSize: "1.6rem",
    color: "#1F2933",
    boxShadow: "0 20px 40px rgba(148,184,255,0.14)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.84)",
    backdropFilter: "blur(18px)",
  }}
>
  <div>
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: "999px",
        background: "linear-gradient(135deg, rgba(219,234,254,0.95), rgba(255,255,255,0.86))",
        border: "1px solid rgba(255,255,255,0.88)",
        color: "#2563EB",
        fontSize: "0.68rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        marginBottom: "10px",
      }}
    >
      Employee Portal
    </div>
    <div>Employee Dashboard</div>
  </div>

  <div
    style={{
      cursor: "pointer",
      fontSize: "1.2rem",
      color: "#2563EB",
      width: "48px",
      height: "48px",
      borderRadius: "16px",
      background: "linear-gradient(135deg, #DBEAFE, #FFFFFF)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 12px 24px rgba(191,219,254,0.16)",
    }}
    title="Profile"
    onClick={() => navigate("/employee/profile")}
  >
    👤
  </div>
</header>

      <div style={{ width: "100%", padding: "12px 32px 0" }}>
        <button
          className="btn mb-3"
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(191,219,254,0.82)",
            borderRadius: "14px",
            padding: "6px 14px",
            fontSize: "14px",
            color: "#1F2933",
            boxShadow: "0 12px 20px rgba(191,219,254,0.14)",
          }}
        >
          &larr; Back
        </button>
      </div>

      {/* Welcome Section */}
      <div className="text-center mt-5 mb-5">
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 14px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.74)",
            border: "1px solid rgba(255,255,255,0.86)",
            color: "#2563EB",
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            marginBottom: "16px",
            boxShadow: "0 12px 26px rgba(147,197,253,0.18)",
          }}
        >
          Personal Workspace
        </div>
        <h3
          style={{
            fontWeight: 700,
            color: "#1F2933",
            fontSize: "2.1rem",
            marginBottom: "6px",
          }}
        >
          Welcome,{" "}
          <span style={{ color: "#4A70A9" }}>{employeeName}</span>
        </h3>
        <p style={{ color: "#6B7280", fontSize: "1rem" }}>
          Manage your records, reports, and health details.
        </p>
      </div>
  
      {/* Cards */}
      <div
        className="d-flex flex-wrap justify-content-center gap-4"
        style={{ maxWidth: "1000px" }}
      >
        {cards.map((card, index) => (
          <div
            key={index}
            className="text-center p-4"
            style={{
              width: "240px",
              background: "rgba(255,255,255,0.76)",
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.88)",
              boxShadow: "0 24px 44px rgba(148,184,255,0.18)",
              backdropFilter: "blur(18px)",
              transition: "all 0.3s ease",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-10px)";
              e.currentTarget.style.boxShadow =
                "0 18px 40px rgba(74,112,169,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 10px 28px rgba(0,0,0,0.08)";
            }}
          >
            {/* Top Accent */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "5px",
                background: "linear-gradient(90deg, #2563EB, #38BDF8)",
              }}
            />
  
            {/* Icon Badge */}
            <div
              style={{
                width: "58px",
                height: "58px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, #DBEAFE, #FFFFFF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563EB",
                margin: "20px auto 14px",
                boxShadow: "0 12px 24px rgba(191,219,254,0.16)",
              }}
            >
              {card.icon}
            </div>
  
            <h6
              className="fw-semibold mb-2"
              style={{ color: "#1F2933", fontSize: "1rem" }}
            >
              {card.title}
            </h6>
  
            <p
              className="text-muted small mb-3"
              style={{
                color: "#6B7280",
                fontSize: "0.9rem",
                minHeight: "48px",
              }}
            >
              {card.desc}
            </p>
  
            <button
              className="btn btn-sm px-4"
              style={{
                borderRadius: "999px",
                fontWeight: 600,
                background:
                  "linear-gradient(90deg, #2563EB, #38BDF8)",
                color: "#FFFFFF",
                border: "none",
                boxShadow: "0 14px 24px rgba(96,165,250,0.22)",
              }}
              onClick={card.onClick}
            >
              {card.btnText}
            </button>
          </div>
        ))}
      </div>
  
      {/* Footer */}
      <footer
        className="text-center mt-5"
        style={{
          color: "#6B7280",
          fontSize: "0.9rem",
          paddingBottom: "20px",
        }}
      >
        © 2025 |{" "}
        <span style={{ color: "#1F2933" }}>
          AP Police Health Portal
        </span>
      </footer>
    </div>
  );
  
  
};

export default EmployeeHome;
