import React, { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { 
  FaUserCircle, 
  FaUsers, 
  FaBox, 
  FaShoppingCart, 
  FaHistory, 
  FaChartLine,
  FaPills,
  FaFileMedical,
  FaClipboardList,
  FaHospital,
  FaVials
} from "react-icons/fa";
import { IoClose, IoMenu } from "react-icons/io5";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const Institute_home = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalEmployees: 0,
    registeredEmployees: 0,
    totalMedicinesInInventory: 0,
    lowStockMedicines: 0,
    inventoryItemCount: 0
  });
  const [loading, setLoading] = useState(true);

  // Get institute ID from localStorage
  const institute = JSON.parse(localStorage.getItem("institute") || "{}");
  const instituteId = institute?._id;

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    if (!instituteId) return;
    
    try {
      setLoading(true);
      const res = await axios.get(
        `http://localhost:6100/institute-api/dashboard-stats/${instituteId}`
      );
      setDashboardStats(res.data);
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed employees
  const fetchEmployees = async () => {
    try {
      const res = await axios.get("http://localhost:6100/institute-api/employees-detailed");
      setEmployees(res.data.employees);
      setShowEmployeeModal(true);
    } catch (err) {
      console.error("Failed to load employees", err);
      alert("Failed to load employees");
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [instituteId]);

  const handleProfileClick = () => navigate("/institutes/profile");
  const handleSignout = () => {
    localStorage.removeItem("institute");
    navigate("/");
  };

  const navItems = [
  { icon: <FaUsers />, label: "Medicines Issued Register", path: "/institutes/medicines-issued-register" },
  { icon: <FaBox />, label: "Inventory", path: "/institutes/inventory" },
  { icon: <FaVials />, label: "Diseases", path: "/institutions/diseases" },
  { icon: <FaPills />, label: "Prescriptions", path: "/institutions/prescriptions" },
  { icon: <FaFileMedical />, label: "View Employee Reports", path: "/institutions/reports" },
  { icon: <FaClipboardList />, label: "Diagnosis", path: "/institutions/diagnosis-entry" },
  { icon: <FaClipboardList />, label: "Ledger", path: "/institutes/ledger" },
  { icon: <FaClipboardList />, label: "Indent", path: "/institutes/indent" },
  { icon: <FaHistory />, label: "Doctor prescription", path: "/institutes/doctor-prescription" },
  { icon: <FaChartLine />, label: "Doctor Diagnosis", path: "/institutes/doctor-diagnosis" },
  { icon: <FaUsers />, label: "Register Visit", path: "/institutes/visit-register" },
  { icon: <FaPills />, label: "Main Store", path: "/institutions/main-store" },
  { icon: <FaClipboardList />, label: "Sub Store", path: "/institutes/sub-store" },
];


  return (
    <div
      className="d-flex min-vh-100"
      style={{
        fontFamily: "Inter, sans-serif",
        backgroundColor: "#f5f6f7",
        overflowX: "hidden",
      }}
    >
      {/* ================= SIDEBAR ================= */}
<div
  className={`bg-white text-dark p-4 border-end shadow-sm position-fixed ${
    sidebarOpen ? "translate-x-0" : "-translate-x-100"
  }`}
  style={{
    width: "280px",
    height: "100vh",          // ✅ FIXED height
    overflowY: "auto",        // ✅ ENABLE SCROLL
    overflowX: "hidden",      // ✅ NO SIDE SCROLL
    transition: "all 0.4s ease",
    zIndex: 1050,
  }}
>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-2">
            <FaHospital size={24} className="text-primary" />
            <h5 className="fw-bold mb-0">Institute Panel</h5>
          </div>
          <IoClose
            size={28}
            style={{ cursor: "pointer" }}
            onClick={() => setSidebarOpen(false)}
            className="text-muted"
          />
        </div>

        <div className="text-center mb-4">
          <div className="bg-light rounded-circle d-inline-flex p-3 mb-2">
            <FaHospital size={32} className="text-primary" />
          </div>
          <h6 className="fw-bold">{institute?.Institute_Name || "Institute"}</h6>
          <small className="text-muted">{institute?.Email_ID || ""}</small>
        </div>

        <ul className="list-unstyled mt-3">
          {navItems.map((item, index) => (
            <li 
              key={index} 
              className="mb-2 hover-item d-flex align-items-center gap-3 p-2 rounded"
              onClick={() => navigate(item.path)}
            >
              <span className="text-primary">{item.icon}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 pt-4 border-top">
          <p className="text-center small text-muted">
            ©️ 2025 AP Police Health Division
          </p>
        </div>
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <div
        className="flex-grow-1"
        style={{
          marginLeft: sidebarOpen ? "280px" : "0",
          transition: "all 0.4s ease",
        }}
      >
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center p-3 bg-white shadow-sm">
          <div className="d-flex align-items-center gap-3">
            {!sidebarOpen && (
              <IoMenu
                size={30}
                style={{ cursor: "pointer" }}
                onClick={() => setSidebarOpen(true)}
                className="text-dark"
              />
            )}
            <div>
              <h3 className="fw-bold mb-0">Institute Dashboard</h3>
              <small className="text-muted">Welcome back, {institute?.Institute_Name || "Admin"}</small>
            </div>
          </div>

          <div className="position-relative">
            <div className="d-flex align-items-center gap-3">
              <div className="text-end d-none d-md-block">
                <h6 className="mb-0 fw-semibold">{institute?.Institute_Name}</h6>
                <small className="text-muted">Institute Admin</small>
              </div>
              <FaUserCircle
                size={42}
                style={{ cursor: "pointer" }}
                onClick={() => setShowDropdown(!showDropdown)}
                className="text-primary"
              />
            </div>
            {showDropdown && (
              <div className="position-absolute bg-white border rounded shadow p-2"
                   style={{ right: 0, top: "50px", width: "180px", zIndex: 1000 }}>
                <div className="p-2 border-bottom">
                  <small className="text-muted">Signed in as</small>
                  <p className="fw-semibold mb-0 small">{institute?.Institute_Name}</p>
                </div>
                <button 
                  onClick={handleProfileClick}
                  className="btn btn-sm btn-outline-primary w-100 mb-2"
                >
                  Profile Settings
                </button>
                <button 
                  onClick={handleSignout}
                  className="btn btn-sm btn-outline-danger w-100"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* DASHBOARD STATS */}
        <div className="container py-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading dashboard...</p>
            </div>
          ) : (
            <>
              <div className="row g-4 mb-4">
                <div className="col-md-3 col-sm-6">
                  <div
                    className="card text-center p-4 shadow-sm rounded-4 border-0 bg-gradient-primary text-white"
                    style={{ cursor: "pointer", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                    onClick={fetchEmployees}
                  >
                    <div className="d-flex justify-content-center mb-3">
                      <div className="bg-white rounded-circle p-3">
                        <FaUsers size={24} className="text-primary" />
                      </div>
                    </div>
                    <h6 className="mb-2">Total Employees</h6>
                    <h2 className="fw-bold">{dashboardStats.totalEmployees}</h2>
                    <small className="opacity-75">Click to view details</small>
                  </div>
                </div>
                <div className="col-md-3 col-sm-6">
                  <div className="card text-center p-4 shadow-sm rounded-4 border-0 bg-gradient-info text-white"
                       style={{ background: "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)" }}>
                    <div className="d-flex justify-content-center mb-3">
                      <div className="bg-white rounded-circle p-3">
                        <FaBox size={24} className="text-info" />
                      </div>
                    </div>
                    <h6 className="mb-2">Inventory</h6>
                    <h2 className="fw-bold">{dashboardStats.totalMedicinesInInventory}</h2>
                    <div className="d-flex justify-content-center gap-3 mt-2">
                      <small className="badge bg-light text-dark">Items: {dashboardStats.inventoryItemCount}</small>
                      <small className="badge bg-danger">Low: {dashboardStats.lowStockMedicines}</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 col-sm-6">
                  <div className="card text-center p-4 shadow-sm rounded-4 border-0 bg-gradient-warning text-white"
                       style={{ background: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)" }}>
                    <div className="d-flex justify-content-center mb-3">
                      <div className="bg-white rounded-circle p-3">
                        <FaUsers size={24} className="text-warning" />
                      </div>
                    </div>
                    <h6 className="mb-2">Registered Employees</h6>
                    <h2 className="fw-bold">{dashboardStats.registeredEmployees}</h2>
                    <small className="opacity-75">Active in system</small>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="row mt-5">
                <div className="col-12">
                  <div className="card shadow-sm border-0">
                    <div className="card-body">
                      <h5 className="card-title fw-bold mb-4">Quick Actions</h5>
                      <div className="row g-3">
                        <div className="col-md-4">
                        </div>
                        <div className="col-md-4">
                          <button 
                            className="btn btn-success w-100 py-3 d-flex align-items-center justify-content-center gap-2"
                            onClick={() => navigate("/institutes/inventory")}
                          >
                            <FaBox /> Manage Inventory
                          </button>
                        </div>
                        <div className="col-md-4">
                          <button 
                            className="btn btn-info w-100 py-3 d-flex align-items-center justify-content-center gap-2"
                            onClick={() => navigate("/institutes/analytics")}
                          >
                            <FaFileMedical /> View Reports
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Outlet />
            </>
          )}
        </div>
      </div>

      {/* ================= EMPLOYEE MODAL ================= */}
      {showEmployeeModal && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <FaUsers className="me-2" />
                  Employee Details ({employees.length} employees)
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowEmployeeModal(false)}
                />
              </div>

              <div className="modal-body p-0">
                <div className="table-responsive" style={{ maxHeight: "60vh" }}>
                  <table className="table table-hover table-striped mb-0">
                    <thead className="table-dark sticky-top">
                      <tr>
                        <th>ABS No</th>
                        <th>Name</th>
                        <th>Designation</th>
                        <th>Email</th>
                        <th>DOB</th>
                        <th>Phone</th>
                        <th>Height</th>
                        <th>Weight</th>
                        <th>Address</th>
                        <th>Blood Group</th>
                        <th>Medical History</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(emp => (
                        <tr key={emp._id}>
                          <td className="fw-semibold">{emp.ABS_NO}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {emp.Photo ? (
                                <img 
                                  src={emp.Photo.startsWith('/') ? `http://localhost:6100${emp.Photo}` : emp.Photo}
                                  alt={emp.Name}
                                  className="rounded-circle"
                                  style={{ width: "32px", height: "32px", objectFit: "cover" }}
                                />
                              ) : (
                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                                     style={{ width: "32px", height: "32px" }}>
                                  <FaUserCircle className="text-white" size={16} />
                                </div>
                              )}
                              <span>{emp.Name}</span>
                            </div>
                          </td>
                          <td>{emp.Designation || "-"}</td>
                          <td><small>{emp.Email}</small></td>
                          <td>{emp.DOB || "-"}</td>
                          <td>{emp.Phone_No || "-"}</td>
                          <td>{emp.Height ? `${emp.Height} cm` : "-"}</td>
                          <td>{emp.Weight ? `${emp.Weight} kg` : "-"}</td>
                          <td>
                            <small className="text-muted">
                              {emp.Address || "-"}
                            </small>
                          </td>
                          <td>
                            <span className={`badge ${
                              emp.Blood_Group ? "bg-danger" : "bg-secondary"
                            }`}>
                              {emp.Blood_Group || "-"}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              emp.Medical_History_Count > 0 ? "bg-info" : "bg-light text-dark"
                            }`}>
                              {emp.Medical_History_Count} records
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowEmployeeModal(false)}
                >
                  Close
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    // Export functionality could be added here
                    alert("Export functionality coming soon!");
                  }}
                >
                  Export to CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>
        {`
          .hover-item {
            cursor: pointer;
            padding: 10px 12px;
            border-radius: 8px;
            transition: all 0.3s ease;
          }
          .hover-item:hover {
            background: linear-gradient(135deg, #667eea0d 0%, #764ba20d 100%);
            transform: translateX(5px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .bg-gradient-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; }
          .bg-gradient-success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; }
          .bg-gradient-info { background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%) !important; }
          .bg-gradient-warning { background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%) !important; }
          /* Sidebar scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.35);
}

        `}
      </style>
    </div>
  );
};

export default Institute_home;