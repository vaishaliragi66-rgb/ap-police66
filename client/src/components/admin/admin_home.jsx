import React from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard">
      <h1 className="admin-title">Admin Dashboard</h1>

      <div className="admin-cards">
        <button
          className="admin-card"
          onClick={() => navigate("/admin/institute-reports")}
        >
          🏥 View All Institute Reports
        </button>

        <button
          className="admin-card"
          onClick={() => navigate("/admin/employee-reports")}
        >
          👨‍⚕️ Employee Reports
        </button>

        <button
          className="admin-card"
          onClick={() => navigate("/admin/ai-insights")}
        >
          🤖 AI Insights
        </button>
      </div>
    </div>
  );
}

export default AdminDashboard;
