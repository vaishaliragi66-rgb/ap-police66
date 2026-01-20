import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHospital,
  FaUserMd,
  FaRobot,
  FaBuilding,
  FaUsers,
  FaFileMedical
} from "react-icons/fa";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard">

      {/* HEADER */}
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage institutes, employees, and system insights</p>
      </div>

      {/* KPI / STATS */}
      <div className="admin-stats">
        <div className="stat-card">
          <FaBuilding className="stat-icon" />
          <div>
            <h4>Institutes</h4>
            <span>Registered Medical Institutes</span>
          </div>
        </div>

        <div className="stat-card">
          <FaUsers className="stat-icon" />
          <div>
            <h4>Employees</h4>
            <span>Total Employees Covered</span>
          </div>
        </div>

        <div className="stat-card">
          <FaFileMedical className="stat-icon" />
          <div>
            <h4>Reports</h4>
            <span>Medical & Diagnostic Records</span>
          </div>
        </div>
      </div>

      {/* MAIN ACTIONS */}
      <div className="admin-actions">
        <div
          className="admin-action-card"
          onClick={() => navigate("/admin/institute-reports")}
        >
          <FaHospital className="action-icon" />
          <h5>Institute Reports</h5>
          <p>View and monitor all registered institutes</p>
        </div>

        <div
          className="admin-action-card"
          onClick={() => navigate("/admin/employee-reports")}
        >
          <FaUserMd className="action-icon" />
          <h5>Employee Reports</h5>
          <p>Access employee medical & activity reports</p>
        </div>

        <div
          className="admin-action-card"
          onClick={() => navigate("/admin/ai-insights")}
        >
          <FaRobot className="action-icon" />
          <h5>AI Insights</h5>
          <p>Analytics & predictive health insights</p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
