import React ,{useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { FaHospital, FaUserMd, FaRobot, FaBuilding, FaUsers, FaFileMedical, FaChartBar } from "react-icons/fa";
import "./AdminDashboard.css";


function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminToken"); 
    navigate("/admin/login", { replace: true });   // go to homepage
  };

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
  
    if (!token) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="admin-dashboard">
      <div style={{ padding: "12px 12px 0" }}>
        <div
    style={{
      display: "flex",
      justifyContent: "flex-end",   // pushes button to right
      padding: "12px 20px"
    }}
  >
    <button
      onClick={handleLogout}
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #1E3A8A",   // dark blue border
        borderRadius: "8px",
        padding: "6px 16px",
        fontSize: "14px",
        color: "#1E3A8A",              // dark blue text
        fontWeight: 500
      }}
    >
      Logout
    </button>
  </div>
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
