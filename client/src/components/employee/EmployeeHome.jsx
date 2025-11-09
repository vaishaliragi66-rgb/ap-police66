import React from "react";
import { useNavigate } from "react-router-dom";

const EmployeeHome = () => {
  const navigate = useNavigate();
  const employeeName = localStorage.getItem("employeeName");

  return (
    <div>
      <h2>Welcome, {employeeName}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button onClick={() => navigate("/employee/institute-register")}>
          Register in an Institute
        </button>
        <button onClick={() => navigate("/employee/family_register")}>
          Register Family Member
        </button>
        <button onClick={() => navigate("/employee/place-order")}>
          Place Medicine Order from Institute
        </button>
        <button onClick={() => {
          localStorage.clear();
          navigate("/employee/login");
        }}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default EmployeeHome;
