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
  const token = localStorage.getItem("instituteToken");

  if (!token) {
    navigate("/", { replace: true });
  } else {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }
}, []);


  useEffect(() => {
    fetchDashboardStats();
  }, [instituteId]);

  const handleProfileClick = () => navigate("/institutes/profile");
  const handleSignout = () => {
  // Remove token
  localStorage.removeItem("instituteToken");

  // Remove institute data
  localStorage.removeItem("institute");

  // Clear axios auth header
  delete axios.defaults.headers.common["Authorization"];

  // Redirect to login
  navigate("/", { replace: true });
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
    background: "linear-gradient(135deg, #f4f7ff 0%, #eef2ff 100%)"
  }}
>

    {/* ================= HEADER ================= */}
      <div
        className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center position-relative"
        style={{ borderColor: "#E3EAF4" }}
      >
        <div>
          <h3 className="fw-bold mb-2" style={{ color: "#1F2937" }}>
            Institute Dashboard
          </h3>
          <small className="text-muted">
            Welcome back, {institute?.Institute_Name}
          </small>
        </div>

        {/* USER ICON */}
        <div style={{ position: "relative" }}>
          <FaUserCircle
            size={36}
            style={{ color: "#3B6FB6", cursor: "pointer" }}
            onClick={() => setShowDropdown((prev) => !prev)}
          />

          {/* DROPDOWN */}
          {showDropdown && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "45px",
                width: "180px",
                backgroundColor: "#fff",
                borderRadius: "10px",
                boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                zIndex: 9999,
              }}
            >
              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigate("/institutes/profile");
                }}
                className="btn btn-light w-100 text-start"
              >
                👤 View Profile
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  handleSignout();
                }}
                className="btn btn-light w-100 text-start text-danger"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>


    {/* ================= DASHBOARD ================= */}
    <div className="container-fluid p-4">

      {/* ================= WELCOME / TODAY ACTION ================= */}
      <div className="card border-0 shadow-lg mb-5 mx-auto"
          style={{
            borderRadius: "20px",
            background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)"
          }}>
        <div className="card-body d-flex justify-content-between align-items-center flex-wrap p-4">

          <div>
            <h4 className="fw-bold mb-2" style={{ color: "#1F2937" }}>
              👋 Welcome, {institute?.Institute_Name}
            </h4>
            <p className="text-muted mb-0" style={{ fontSize: "15px" }}>
              Manage today’s patient visits, prescriptions, diagnosis and inventory from here.
            </p>
          </div>

          <button
            className="btn px-4 py-2 mt-4 mt-md-0"
            style={{
              backgroundColor: "#3B6FB6",
              color: "#fff",
              borderRadius: "10px",
              fontWeight: "500"
            }}
            onClick={() => navigate("/institutes/visit-register")}
          >
            + Register Today’s Visit
          </button>

        </div>
      </div>

      {/* ================= QUICK ACCESS CARDS ================= */}
      <div className="d-flex justify-content-center">
        <div
          className="row g-4"
          style={{
            maxWidth: "900px",
            width: "100%"
          }}
        >

          {/* DOCTOR PRESCRIPTION */}
          <div className="col-md-6">
            <div
              className="card h-100 text-center border-0 shadow-sm"
              style={{
                borderRadius: "20px",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onClick={() => navigate("/institutes/doctor-prescription")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 12px 25px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <div className="card-body p-5">
                <FaHistory size={35} style={{ color: "#3B6FB6" }} />
                <h5 className="fw-semibold mt-4">Doctor Prescription</h5>
                <p className="text-muted mb-0">
                  View & manage doctor prescriptions
                </p>
              </div>
            </div>
          </div>

          {/* PHARMACY */}
          <div className="col-md-6">
            <div
              className="card h-100 text-center border-0 shadow-sm"
              style={{
                borderRadius: "20px",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onClick={() => navigate("/institutions/prescriptions")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 12px 25px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <div className="card-body p-5">
                <FaPills size={35} style={{ color: "#3B6FB6" }} />
                <h5 className="fw-semibold mt-4">Pharmacy</h5>
                <p className="text-muted mb-0">
                  Issue medicines to employees
                </p>
              </div>
            </div>
          </div>

          {/* DIAGNOSIS */}
          <div className="col-md-6">
            <div
              className="card h-100 text-center border-0 shadow-sm"
              style={{
                borderRadius: "20px",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onClick={() => navigate("/institutions/diagnosis-entry")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 12px 25px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <div className="card-body p-5">
                <FaClipboardList size={35} style={{ color: "#3B6FB6" }} />
                <h5 className="fw-semibold mt-4">Diagnosis</h5>
                <p className="text-muted mb-0">
                  Enter & view diagnoses
                </p>
              </div>
            </div>
          </div>

          {/* OTHERS */}
          <div className="col-md-6">
            <div
              className="card h-100 text-center border-0 shadow-sm"
              style={{
                borderRadius: "20px",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onClick={() => navigate("/institutes/ledger")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 12px 25px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <div className="card-body p-5">
                <FaFileMedical size={35} style={{ color: "#3B6FB6" }} />
                <h5 className="fw-semibold mt-4">Others</h5>
                <p className="text-muted mb-0">
                  Ledger, Indent, Stores, AI Insights
                </p>
              </div>
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