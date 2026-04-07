import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHospital,
  FaUserMd,
  FaRobot,
  FaBuilding,
  FaUsers,
  FaFileMedical,
  FaUpload
} from "react-icons/fa";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();
  const adminName = localStorage.getItem("adminName") || "Admin";

  const handleLogout = () => {
    // remove admin-related keys
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminId");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminRole");
    localStorage.removeItem("adminPermissions");
    // optionally clear any employee/institute tokens
    localStorage.removeItem("employeeToken");
    localStorage.removeItem("instituteToken");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-dashboard">
      {/* back button removed per request */}

      {/* HEADER */}
      <div className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage institutes, employees, and system insights</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button className="btn btn-outline-secondary" onClick={handleLogout} style={{ borderRadius: 8 }}>
              Logout
            </button>
          </div>
        </div>
      </div>

<br />
<br/>
      {/* KPI / STATS
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
      </div> */}

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
          onClick={() => navigate("/admin/employee-upload")}
        >
          <FaUpload className="action-icon" />
          <h5>Bulk Employee Upload</h5>
          <p>Upload employees in batches using Excel with embedded photos</p>
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
