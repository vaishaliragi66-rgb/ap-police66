import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserFriends,
  FaNotesMedical,
  FaPrescriptionBottleAlt,
  FaVirus,
  FaSignOutAlt,
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
        backgroundColor: "#F4F7FB",
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
    background: "#FFFFFF",
    width: "100%",
    padding: "18px 32px",
    fontWeight: 600,
    fontSize: "1.6rem",
    color: "#1F2933",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #D6E0F0",
  }}
>
  <span>Employee Dashboard</span>

  <div
    style={{
      cursor: "pointer",
      fontSize: "1.4rem",
      color: "#4A70A9",
    }}
    title="Profile"
    onClick={() => navigate("/employee/profile")}
  >
    👤
  </div>
</header>

      {/* Welcome Section */}
      <div className="text-center mt-5 mb-5">
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
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              border: "1px solid #E2EAF6",
              boxShadow: "0 10px 28px rgba(0,0,0,0.08)",
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
                background: "linear-gradient(90deg, #4A70A9, #6FA4D8)",
              }}
            />
  
            {/* Icon Badge */}
            <div
              style={{
                width: "58px",
                height: "58px",
                borderRadius: "50%",
                backgroundColor: "#EAF2FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4A70A9",
                margin: "20px auto 14px",
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
                fontWeight: 500,
                background:
                  "linear-gradient(90deg, #4A70A9, #6FA4D8)",
                color: "#FFFFFF",
                border: "none",
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
