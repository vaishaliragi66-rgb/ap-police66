import React from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { FaVials, FaFileMedical, FaClipboardList } from "react-icons/fa";

const DoctorLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="d-flex min-vh-100" style={{ background: "#F5F8FE" }}>
      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-grow-1 p-4">
        <Outlet />
      </div>
    </div>
  );
};

export default DoctorLayout;