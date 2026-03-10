import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FaClipboardList,
  FaWarehouse,
  FaRobot,
  FaPills,
  FaBoxOpen,
  FaFileMedical,
  FaBars,
  FaTimes,
  FaHome
} from "react-icons/fa";
import { APP_HEADER_HEIGHT } from "../GlobalHeader";

const OthersLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const hideSidebar = params.get("mode") === "embedded";

  const [open, setOpen] = useState(true);

  const menu = [
    { label: "Medicines Issued Register", path: "/institutes/medicines-issued-register", icon: <FaPills /> },
    { label: "Employee Reports", path: "/institutions/reports", icon: <FaFileMedical /> },
    { label: "Ledger", path: "/institutes/ledger", icon: <FaClipboardList /> },
    { label: "Indent", path: "/institutes/indent", icon: <FaClipboardList /> },
    { label: "Main Store", path: "/institutions/main-store", icon: <FaWarehouse /> },
    { label: "Substore", path: "/institutes/inventory", icon: <FaBoxOpen /> },
    { label: "AI Insights", path: "/institutes/ai-insights", icon: <FaRobot /> },
    { label: "Analytics", path: "/institutes/analytics", icon: <FaRobot />}
  ];

  return (
    <div className="d-flex">

      {/* ================= SIDEBAR ================= */}
      {!hideSidebar && open && (
        <div
          style={{
            width: "240px",
            height: `calc(100vh - ${APP_HEADER_HEIGHT}px)`,
            position: "fixed",
            left: 0,
            top: `${APP_HEADER_HEIGHT}px`,
            background: "linear-gradient(180deg, #BED2EB 0%, #e6f0ff 100%)",
            color: "#1f2937",
            borderRight: "1px solid #dbeafe",
            overflowY: "auto",
            paddingTop: "20px",
            transition: "all 0.3s ease",
            zIndex: 1000
          }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center px-3 mb-4">
            <h6 className="fw-bold mb-0">Others</h6>
            <FaTimes
              style={{ cursor: "pointer" }}
              onClick={() => setOpen(false)}
            />
          </div>

          {/* Menu */}
          {menu.map((item) => {
            const active = location.pathname === item.path;

            return (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                className="d-flex align-items-center gap-3 px-3 py-3 sidebar-item"
                style={{
                  cursor: "pointer",
                  background: active ? "#dbeafe" : "transparent",
                  color: active ? "#1d4ed8" : "#374151",
                  borderLeft: active
                    ? "4px solid #2563eb"
                    : "4px solid transparent",
                  fontWeight: active ? "600" : "500",
                  transition: "all 0.3s ease"
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MAIN CONTENT ================= */}
      <div
        style={{
          marginLeft: !hideSidebar && open ? "240px" : "0",
          width: "100%",
          padding: "20px",
          transition: "all 0.3s ease"
        }}
      >
        {/* Open Button (when sidebar closed) */}
        {!hideSidebar && !open && (
          <button
            className="btn btn-outline-dark mb-3"
            onClick={() => setOpen(true)}
          >
            <FaBars /> Open Menu
          </button>
        )}

        <Outlet />
      </div>
      {/* Floating Home Button */}
      <button
        onClick={() => navigate("/institutes/home")}
        style={{
          position: "fixed",
          bottom: "25px",
          left: "20px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "50px",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
          zIndex: 2000,
          fontWeight: "600",
          cursor: "pointer"
        }}
      >
        <FaHome /> Home
</button>
    </div>
  );
};

export default OthersLayout;
