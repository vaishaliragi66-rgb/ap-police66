import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const employeeId = localStorage.getItem("employeeId");
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

  const [employee, setEmployee] = useState(null);
  const [family, setFamily] = useState([]);

  useEffect(() => {
    if (!employeeId) return;

    axios
      .get(`http://localhost:${BACKEND_PORT}/employee-api/profile/${employeeId}`)
      .then((res) => setEmployee(res.data));

    axios
      .get(`http://localhost:${BACKEND_PORT}/family-api/family/${employeeId}`)
      .then((res) => setFamily(res.data || []));
  }, [employeeId, BACKEND_PORT]);

  if (!employee)
    return <div className="text-center mt-5">Loading profile...</div>;

    return (
            <div
        style={{
          backgroundColor: "#F8FAFC", // light neutral (NOT blue)
          minHeight: "100vh",
          padding: "24px 0",
          fontFamily: "'Inter', sans-serif",
        }}
      >

        <div className="container" style={{ maxWidth: "1100px" }}>

          {/* Page Header */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #D6E0F0",
            borderRadius: "12px",
            padding: "20px 24px",
            marginBottom: "20px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
          }}
        >
          <h4 style={{ margin: 0, color: "#1F2933", fontWeight: 600 }}>
            Employee Profile
          </h4>
          <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: "14px" }}>
            View your personal and family health details
          </p>
        </div>

    
          {/* Back Button */}
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
            ← Back
          </button>
    
          {/* PROFILE CARD */}
          <div
            className="card border-0"
            style={{
              borderRadius: "16px",
              boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
           
                {/* Top Strip */}
      <div
        style={{
          backgroundColor: "#F3F7FF",
          padding: "28px 24px",
          borderBottom: "1px solid #D6E0F0",
        }}
      >
        <div className="row align-items-center">
          {/* Profile Image */}
          <div className="col-md-3 text-center">
            <div
              style={{
                display: "inline-block",
                padding: "6px",
                borderRadius: "50%",
                backgroundColor: "#FFFFFF",
                border: "1px solid #D6E0F0",
              }}
            >
              <img
                src={
                  employee.Profile_Pic
                    ? `http://localhost:${BACKEND_PORT}${employee.Profile_Pic}`
                    : employee.Photo
                    ? `http://localhost:${BACKEND_PORT}${employee.Photo}`
                    : "/default-avatar.png"
                }
                
                className="rounded-circle"
                style={{
                  width: "120px",
                  height: "120px",
                  objectFit: "cover",
                  border: "3px solid #4A70A9",
                }}
              />
            </div>
          </div>

          {/* Name + Meta */}
          <div className="col-md-9">
            <h3
              style={{
                color: "#1F2933",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              {employee.Name}
            </h3>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                fontSize: "14px",
                color: "#6B7280",
              }}
      >
        <span>
          <strong style={{ color: "#1F2933" }}>ABS No:</strong>{" "}
          {employee.ABS_NO}
        </span>

      </div>
    </div>
  </div>
</div>

    
            {/* DETAILS */}
            <div className="p-4">
            <div className="row g-3">
  {/* LEFT INFO */}
  <div className="col-md-6">
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #D6E0F0",
        borderRadius: "12px",
        padding: "18px",
        height: "100%",
      }}
    >
      <h6
        style={{
          fontWeight: 600,
          color: "#4A70A9",
          marginBottom: "12px",
        }}
      >
        Personal Information
      </h6>

      <p className="mb-2">
        <strong>Email:</strong>{" "}
        <span style={{ color: "#6B7280" }}>{employee.Email}</span>
      </p>

      <p className="mb-2">
        <strong>Designation:</strong>{" "}
        <span style={{ color: "#6B7280" }}>{employee.Designation}</span>
      </p>

      <p className="mb-0">
        <strong>Date of Birth:</strong>{" "}
        <span style={{ color: "#6B7280" }}>
          {employee.DOB
            ? new Date(employee.DOB).toLocaleDateString()
            : "-"}
        </span>
      </p>
    </div>
  </div>

  {/* RIGHT INFO */}
  <div className="col-md-6">
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #D6E0F0",
        borderRadius: "12px",
        padding: "18px",
        height: "100%",
      }}
    >
      <h6
        style={{
          fontWeight: 600,
          color: "#4A70A9",
          marginBottom: "12px",
        }}
      >
        Health & Address
      </h6>

      <p className="mb-2">
        <strong>Blood Group:</strong>{" "}
        <span style={{ color: "#6B7280" }}>
          {employee.Blood_Group}
        </span>
      </p>

      <p className="mb-2">
        <strong>Height:</strong>{" "}
        <span style={{ color: "#6B7280" }}>
          {employee.Height} cm
        </span>
      </p>

      <p className="mb-2">
        <strong>Weight:</strong>{" "}
        <span style={{ color: "#6B7280" }}>
          {employee.Weight} kg
        </span>
      </p>

      <p className="mb-0">
        <strong>Address:</strong>{" "}
        <span style={{ color: "#6B7280" }}>
          {employee.Address?.District}, {employee.Address?.State}
        </span>
      </p>
    </div>
  </div>
</div>

    
              <hr style={{ borderColor: "#D6E0F0" }} />
    
              {/* FAMILY MEMBERS */}
              <div
          style={{
            backgroundColor: "#F3F7FF",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            border: "1px solid #D6E0F0",
          }}
        >
          <h5
            style={{
              margin: 0,
              color: "#1F2933",
              fontWeight: 600,
            }}
          >
            Family Members
          </h5>
        </div>

    
        {family.length === 0 ? (
  <div
    style={{
      backgroundColor: "#FFFFFF",
      border: "1px dashed #D6E0F0",
      borderRadius: "10px",
      padding: "16px",
      color: "#6B7280",
      fontSize: "14px",
    }}
  >
    No family members registered.
  </div>
) : (
  <div className="row">
    {family.map((f) => (
      <div className="col-md-4 mb-3" key={f._id}>
        <div
          className="h-100 p-3"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #D6E0F0",
            boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
            cursor: "pointer",
            transition: "all 0.25s ease",
            minHeight: "140px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow =
              "0 10px 22px rgba(74,112,169,0.18)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 6px 14px rgba(0,0,0,0.06)";
          }}
          onClick={() => navigate(`/employee/family/${f._id}`)}
        >
          <h6 style={{ fontWeight: 600, color: "#1F2933", marginBottom: "4px" }}>
            {f.Name}
          </h6>

          <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "6px" }}>
            {f.Relationship}
          </p>

          <p style={{ marginBottom: "4px", fontSize: "14px" }}>
            <strong>Blood:</strong> {f.Blood_Group}
          </p>

          <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: 0 }}>
            Height: {f.Height} cm &nbsp;|&nbsp; Weight: {f.Weight} kg
          </p>
        </div>
      </div>
    ))}
  </div>
)}

            </div>
          </div>
        </div>
      </div>
    );
    
};

export default EmployeeProfile;
