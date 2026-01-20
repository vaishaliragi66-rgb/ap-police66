import React from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { FaVials, FaFileMedical, FaClipboardList } from "react-icons/fa";

const DoctorLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="d-flex min-vh-100" style={{ background: "#F5F8FE" }}>
      
      {/* ===== SIDEBAR (DOCTOR ONLY) ===== */}
      <div
        className="bg-white border-end"
        style={{ width: "260px" }}
      >
        <div className="px-4 py-3 border-bottom">
          <h6 className="fw-bold mb-0">Doctor Panel</h6>
          <small className="text-muted">Clinical Operations</small>
        </div>

        <ul className="list-unstyled px-3 py-3">
          <li
            className="d-flex align-items-center gap-3 px-3 py-2 rounded sidebar-link"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/institutions/diseases")}
          >
            <FaVials />
            <span>Diseases</span>
          </li>

          <li
            className="d-flex align-items-center gap-3 px-3 py-2 rounded sidebar-link"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/institutions/reports")}
          >
            <FaFileMedical />
            <span>Employee Reports</span>
          </li>

          <li
            className="d-flex align-items-center gap-3 px-3 py-2 rounded sidebar-link"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/institutes/doctor-diagnosis")}
          >
            <FaClipboardList />
            <span>Doctor Diagnosis</span>
          </li>
        </ul>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-grow-1 p-4">
        <Outlet />
      </div>
    </div>
  );
};

export default DoctorLayout;
