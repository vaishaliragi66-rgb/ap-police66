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
  FaVials,
  FaBrain
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
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showOthersSidebar, setShowOthersSidebar] = useState(false);


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

  const exportEmployeesCSV = () => {
    if (!employees.length) {
      alert("No employee data to export");
      return;
    }
  
    const headers = [
      "ABS No",
      "Name",
      "Designation",
      "Email",
      "Phone",
      "Blood Group",
      "Medical History Count"
    ];
  
    const rows = employees.map(emp => [
      emp.ABS_NO,
      emp.Name,
      emp.Designation || "",
      emp.Email || "",
      emp.Phone_No || "",
      emp.Blood_Group || "",
      emp.Medical_History_Count || 0
    ]);
  
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows]
        .map(row => row.map(value => `"${value}"`).join(","))
        .join("\n");
  
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
  
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "employees.csv");
    document.body.appendChild(link);
  
    link.click();
    document.body.removeChild(link);
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
  { icon: <FaBrain />, label: "AI Insights", path: "/institutes/ai-insights" }
];

return (
  <div
    className="min-vh-100"
    style={{
      fontFamily: "Inter, sans-serif",
      backgroundColor: "#F5F8FE",
    }}
  >
    {/* ================= HEADER ================= */}
    <div
      className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center"
      style={{ borderColor: "#E3EAF4" }}
    >
      <div>
        <h5 className="fw-bold mb-0" style={{ color: "#1F2937" }}>
          Institute Dashboard
        </h5>
        <small className="text-muted">
          Welcome back, {institute?.Institute_Name}
        </small>
      </div>

      <FaUserCircle
        size={36}
        style={{ color: "#3B6FB6", cursor: "pointer" }}
        onClick={() => setShowDropdown(!showDropdown)}
      />
    </div>

    {/* ================= DASHBOARD ================= */}
    <div className="container-fluid p-4">

      {/* ================= WELCOME / TODAY ACTION ================= */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body d-flex justify-content-between align-items-center flex-wrap">
          
          <div>
            <h5 className="fw-bold mb-1">
              👋 Welcome, {institute?.Institute_Name}
            </h5>
            <p className="text-muted mb-0">
              Manage today’s patient visits, prescriptions, diagnosis and inventory from here.
            </p>
          </div>

          <button
            className="btn btn-primary px-4 py-2 mt-3 mt-md-0"
            style={{ borderRadius: "8px" }}
            onClick={() => navigate("/institutes/visit-register")}
          >
            + Register Today’s Visit
          </button>

        </div>
      </div>


      {/* ================= QUICK ACCESS CARDS ================= */}
      <div className="row g-4 mb-4">

        {/* DOCTOR PRESCRIPTION */}
        <div className="col-md-3">
          <div
            className="card border shadow-sm h-100"
            style={{ borderColor: "#E3EAF4", cursor: "pointer" }}
            onClick={() => navigate("/institutes/doctor-prescription")}
          >
            <div className="card-body">
              <FaHistory size={28} style={{ color: "#3B6FB6" }} />
              <h6 className="fw-semibold mt-3 mb-1">Doctor Prescription</h6>
              <small className="text-muted">
                View & manage doctor prescriptions
              </small>
            </div>
          </div>
        </div>

        {/* PHARMACY PRESCRIPTIONS */}
        <div className="col-md-3">
          <div
            className="card border shadow-sm h-100"
            style={{ borderColor: "#E3EAF4", cursor: "pointer" }}
            onClick={() => navigate("/institutions/prescriptions")}
          >
            <div className="card-body">
              <FaPills size={28} style={{ color: "#3B6FB6" }} />
              <h6 className="fw-semibold mt-3 mb-1">Pharmacy</h6>
              <small className="text-muted">
                Issue medicines to employees
              </small>
            </div>
          </div>
        </div>

        {/* DIAGNOSIS */}
        <div className="col-md-3">
          <div
            className="card border shadow-sm h-100"
            style={{ borderColor: "#E3EAF4", cursor: "pointer" }}
            onClick={() => navigate("/institutions/diagnosis-entry")}
          >
            <div className="card-body">
              <FaClipboardList size={28} style={{ color: "#3B6FB6" }} />
              <h6 className="fw-semibold mt-3 mb-1">Diagnosis</h6>
              <small className="text-muted">
                Enter & view diagnoses
              </small>
            </div>
          </div>
        </div>

        {/* OTHERS */}
        <div className="col-md-3">
          <div
            className="card border shadow-sm h-100"
            style={{ borderColor: "#E3EAF4", cursor: "pointer" }}
            onClick={() => navigate("/institutes/ledger")}
          >
            <div className="card-body">
              <FaFileMedical size={28} style={{ color: "#3B6FB6" }} />
              <h6 className="fw-semibold mt-3 mb-1">Others</h6>
              <small className="text-muted">
                Ledger, Indent, Stores, AI Insights
              </small>
            </div>
          </div>
        </div>

      </div>

      {/* Nested routes (if any) */}
      <Outlet />
    </div>


  
  </div>
);



};

export default Institute_home;