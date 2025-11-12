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
        backgroundColor: "#f4f4f4",
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
          backgroundColor: "#fff",
          color: "#000",
          width: "100%",
          textAlign: "center",
          padding: "20px 0",
          fontWeight: "700",
          fontSize: "1.8rem",
          letterSpacing: "0.5px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        }}
      >
        Employee Dashboard
      </header>

      {/* Welcome Section */}
      <div className="text-center mt-5 mb-4">
        <h3
          style={{
            fontWeight: "700",
            color: "#111",
            marginBottom: "0.5rem",
            fontSize: "1.9rem",
          }}
        >
          Welcome, <span style={{ color: "#555" }}>{employeeName}</span>
        </h3>
        <p style={{ color: "#777", fontSize: "1rem" }}>
          Manage your records, reports, and health details.
        </p>
      </div>

      {/* Cards Section */}
      <div
        className="d-flex flex-wrap justify-content-center gap-4"
        style={{ maxWidth: "1000px" }}
      >
        {cards.map((card, index) => (
          <div
            key={index}
            className="text-center p-4 border-0"
            style={{
              width: "240px",
              backgroundColor: "#fff",
              borderRadius: "14px",
              boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 8px 18px rgba(0,0,0,0.2)";
              e.currentTarget.style.backgroundColor = "#f9f9f9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 3px 8px rgba(0,0,0,0.1)";
              e.currentTarget.style.backgroundColor = "#fff";
            }}
          >
            <div
              style={{
                color: "#111",
                marginBottom: "15px",
              }}
            >
              {card.icon}
            </div>
            <h6
              className="fw-bold mb-2"
              style={{ color: "#111", fontSize: "1rem" }}
            >
              {card.title}
            </h6>
            <p
              className="text-muted small mb-3"
              style={{ color: "#666", fontSize: "0.9rem", minHeight: "48px" }}
            >
              {card.desc}
            </p>
            <button
              className="btn btn-dark btn-sm px-4"
              style={{
                borderRadius: "20px",
                fontWeight: "500",
                backgroundColor: "#111",
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
          color: "#888",
          fontSize: "0.9rem",
          paddingBottom: "20px",
        }}
      >
        © 2025 | <span style={{ color: "#111" }}>AP Police Health Portal</span>
      </footer>
    </div>
  );
};

export default EmployeeHome;
