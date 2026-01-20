import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FaClipboardList,
  FaWarehouse,
  FaRobot,
  FaPills,
  FaBoxOpen,
  FaFileMedical
} from "react-icons/fa";

const OthersLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menu = [
    {
      label: "Medicines Issued Register",
      path: "/institutes/medicines-issued-register",
      icon: <FaPills />
    },
    {
      label: "Inventory",
      path: "/institutes/inventory",
      icon: <FaBoxOpen />
    },
    {
      label: "Employee Reports",
      path: "/institutions/reports",
      icon: <FaFileMedical />
    },
    {
      label: "Ledger",
      path: "/institutes/ledger",
      icon: <FaClipboardList />
    },
    {
      label: "Indent",
      path: "/institutes/indent",
      icon: <FaClipboardList />
    },
    {
      label: "Main Store",
      path: "/institutions/main-store",
      icon: <FaWarehouse />
    },
    {
      label: "Sub Store",
      path: "/institutes/sub-store",
      icon: <FaWarehouse />
    },
    {
      label: "AI Insights",
      path: "/institutes/ai-insights",
      icon: <FaRobot />
    }
  ];

  return (
    <div className="container-fluid mt-4">
      <div className="row">

        {/* ================= SIDEBAR ================= */}
        <div className="col-md-3">
          <div className="card shadow-sm" style={{ borderRadius: 12 }}>
            <div
              className="card-header fw-bold"
              style={{
                background: "#1f2937",
                color: "#fff",
                borderRadius: "12px 12px 0 0"
              }}
            >
              Others
            </div>

            <div className="list-group list-group-flush">
              {menu.map((item) => {
                const active = location.pathname === item.path;

                return (
                  <div
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="d-flex align-items-center gap-3 px-3 py-3"
                    style={{
                      cursor: "pointer",
                      background: active ? "#e8f0ff" : "#fff",
                      color: active ? "#1d4ed8" : "#374151",
                      fontWeight: active ? "600" : "500",
                      borderLeft: active
                        ? "4px solid #2563eb"
                        : "4px solid transparent"
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="col-md-9">
          <Outlet />
        </div>

      </div>
    </div>
  );
};

export default OthersLayout;
