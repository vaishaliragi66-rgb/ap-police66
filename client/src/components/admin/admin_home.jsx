import React from "react";
import { useNavigate } from "react-router-dom";
import { FaHospital, FaUserMd, FaRobot, FaBuilding, FaUsers, FaFileMedical, FaChartBar } from "react-icons/fa";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard">
      <div style={{ padding: "12px 12px 0" }}>
        <button
          className="btn mb-3"
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #D6E0F0",
            borderRadius: "8px",
            padding: "6px 14px",
            fontSize: "14px",
            color: "#1F2933",
          }}
        >
          &larr; Back
        </button>
      </div>

      {/* HEADER */}
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage institutes, employees, and system insights</p>
      </div>

<br />
<br/>
 
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


              <div
        className="admin-action-card"
        onClick={() => navigate("/admins/disease-analytics")}
      >
        <FaChartBar className="action-icon" />
        <h5>Disease Analytics</h5>
        <p>Analyze diseases by age, area and designation</p>
      </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
