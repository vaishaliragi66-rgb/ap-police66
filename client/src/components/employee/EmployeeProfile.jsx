import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { fetchMasterDataMap, getMasterOptions } from "../../utils/masterData_clean";

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const employeeId = localStorage.getItem("employeeId");
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [employee, setEmployee] = useState(null);
  const [family, setFamily] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [absCardFile, setAbsCardFile] = useState(null);
  const [absCardUploading, setAbsCardUploading] = useState(false);
  const [absCardDeleting, setAbsCardDeleting] = useState(false);
  const [masterMap, setMasterMap] = useState({});

  const designationOptions = getMasterOptions(masterMap, "Designations");
  const bloodGroupOptions = getMasterOptions(masterMap, "Blood Groups");

  useEffect(() => {
    if (!employeeId) return;

    axios
      .get(`${BACKEND_URL}/employee-api/profile/${employeeId}`)
      .then((res) => {
        setEmployee(res.data);
        setEditData(res.data);
      });

    axios
      .get(`${BACKEND_URL}/family-api/family/${employeeId}`)
      .then((res) => setFamily(res.data || []));
  }, [employeeId, BACKEND_URL]);

  useEffect(() => {
    let mounted = true;
    const loadMaster = async () => {
      try {
        const data = await fetchMasterDataMap({ force: true });
        if (mounted) setMasterMap(data || {});
      } catch {
        if (mounted) setMasterMap({});
      }
    };

    loadMaster();
    const onMasterUpdated = () => loadMaster();
    window.addEventListener("master-data-updated", onMasterUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("master-data-updated", onMasterUpdated);
    };
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editData.Height || Number(editData.Height) <= 0 || Number.isNaN(Number(editData.Height))) {
      alert("Height is required and must be a positive number in cm.");
      return;
    }

    if (!editData.Weight || Number(editData.Weight) <= 0 || Number.isNaN(Number(editData.Weight))) {
      alert("Weight is required and must be a positive number in kg.");
      return;
    }

    axios.put(`${BACKEND_URL}/employee-api/update-profile/${employeeId}`, editData)
      .then((res) => {
        setEmployee(res.data.employee);
        setIsEditing(false);
        alert("Profile updated successfully");
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Failed to update profile");
        console.error(err);
      });
  };

  const handleAbsCardUpload = () => {
    if (!absCardFile) {
      alert("Please choose an ABS card file first.");
      return;
    }

    setAbsCardUploading(true);
    const formData = new FormData();
    formData.append("ABS_Card", absCardFile);

    axios
      .put(
        `${BACKEND_URL}/employee-api/upload-abs-card/${employeeId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      .then((res) => {
        setEmployee(res.data.employee);
        setEditData(res.data.employee);
        setAbsCardFile(null);
        alert("ABS card uploaded successfully");
      })
      .catch((err) => {
        const resp = err?.response?.data;
        const msg =
          resp?.message ||
          (typeof resp === "string" ? resp : "") ||
          err?.message ||
          "Failed to upload ABS card";
        alert(msg);
        console.error(err);
      })
      .finally(() => setAbsCardUploading(false));
  };

  const handleAbsCardDelete = () => {
    if (!employee?.ABS_Card) return;

    const ok = window.confirm("Delete the uploaded ABS card?");
    if (!ok) return;

    setAbsCardDeleting(true);
    axios
      .delete(
        `${BACKEND_URL}/employee-api/delete-abs-card/${employeeId}`
      )
      .then((res) => {
        setEmployee(res.data.employee);
        setEditData(res.data.employee);
        setAbsCardFile(null);
        alert("ABS card deleted successfully");
      })
      .catch((err) => {
        const resp = err?.response?.data;
        const msg =
          resp?.message ||
          (typeof resp === "string" ? resp : "") ||
          err?.message ||
          "Failed to delete ABS card";
        alert(msg);
        console.error(err);
      })
      .finally(() => setAbsCardDeleting(false));
  };

  const handleCancel = () => {
    setEditData(employee);
    setIsEditing(false);
  };

  if (!employee)
    return <div className="text-center mt-5">Loading profile...</div>;

    const absCardUrl = employee?.ABS_Card
      ? `${BACKEND_URL}${employee.ABS_Card}`
      : null;
    const isAbsCardImage = employee?.ABS_Card
      ? /\.(png|jpe?g|gif)$/i.test(employee.ABS_Card)
      : false;

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

        {/* Back Button and Edit Button */}
        <div className="d-flex justify-content-between mb-3">
          <button
            className="btn"
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
          {!isEditing ? (
            <button
              className="btn btn-primary"
              onClick={handleEdit}
              style={{
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "14px",
              }}
            >
              Edit Profile
            </button>
          ) : (
            <div>
              <button
                className="btn btn-success me-2"
                onClick={handleSave}
                style={{
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "14px",
                }}
              >
                Save
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
                style={{
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
    
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
                    ? `${BACKEND_URL}${employee.Profile_Pic}`
                    : employee.Photo
                    ? `${BACKEND_URL}${employee.Photo}`
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
        {isEditing ? (
          <input
            type="email"
            className="form-control d-inline-block"
            style={{ width: "auto", fontSize: "14px" }}
            value={editData.Email || ""}
            onChange={(e) => setEditData({ ...editData, Email: e.target.value })}
          />
        ) : (
          <span style={{ color: "#6B7280" }}>{employee.Email}</span>
        )}
      </p>

      <p className="mb-2">
        <strong>Designation:</strong>{" "}
        {isEditing ? (
          <select
            className="form-control d-inline-block"
            style={{ width: "auto", fontSize: "14px" }}
            value={editData.Designation || ""}
            onChange={(e) => setEditData({ ...editData, Designation: e.target.value })}
          >
            <option value="">Select Designation</option>
            {designationOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        ) : (
          <span style={{ color: "#6B7280" }}>{employee.Designation}</span>
        )}
      </p>

      <p className="mb-0">
        <strong>Date of Birth:</strong>{" "}
        {isEditing ? (
          <input
            type="date"
            className="form-control d-inline-block"
            style={{ width: "auto", fontSize: "14px" }}
            value={editData.DOB ? new Date(editData.DOB).toISOString().split('T')[0] : ""}
            onChange={(e) => setEditData({ ...editData, DOB: e.target.value })}
          />
        ) : (
          <span style={{ color: "#6B7280" }}>
            {employee.DOB
              ? new Date(employee.DOB).toLocaleDateString()
              : "-"}
          </span>
        )}
      </p>

      <p className="mb-0 mt-2">
        <strong>ABHA Number:</strong>{" "}
        {isEditing ? (
          <input
            type="text"
            className="form-control d-inline-block"
            style={{ width: "auto", fontSize: "14px" }}
            value={editData.ABHA_Number || ""}
            onChange={(e) =>
              setEditData({
                ...editData,
                ABHA_Number: e.target.value.replace(/\D/g, "").slice(0, 14)
              })
            }
            maxLength="14"
            placeholder="14-digit ABHA number"
          />
        ) : (
          <span style={{ color: "#6B7280" }}>{employee.ABHA_Number || "-"}</span>
        )}
      </p>

      <div className="mt-3">
        <strong>ABS Card:</strong>{" "}
        {absCardUrl ? (
          <span style={{ color: "#6B7280" }}>
            Uploaded
            <span style={{ marginLeft: "8px" }}>
              <a
                href={absCardUrl}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none" }}
              >
                View
              </a>
            </span>
            {isEditing && (
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={handleAbsCardDelete}
                disabled={absCardDeleting}
                style={{ marginLeft: "10px", borderRadius: "8px" }}
              >
                {absCardDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
          </span>
        ) : (
          <span style={{ color: "#6B7280" }}>Not uploaded</span>
        )}

        {isEditing && (
          <div className="mt-2">
            <input
              type="file"
              className="form-control"
              style={{ maxWidth: "320px", fontSize: "14px" }}
              accept="image/*,application/pdf"
              onChange={(e) => setAbsCardFile(e.target.files?.[0] || null)}
            />
            <button
              className="btn btn-outline-primary mt-2"
              onClick={handleAbsCardUpload}
              disabled={absCardUploading}
              style={{ borderRadius: "8px", padding: "6px 14px", fontSize: "14px" }}
            >
              {absCardUploading ? "Uploading..." : "Upload ABS Card"}
            </button>
          </div>
        )}

        {absCardUrl && isAbsCardImage && (
          <div className="mt-2">
            <img
              src={absCardUrl}
              alt="ABS Card"
              style={{
                width: "100%",
                maxWidth: "260px",
                borderRadius: "8px",
                border: "1px solid #D6E0F0",
              }}
            />
          </div>
        )}
      </div>
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
        {isEditing ? (
          <select
            className="form-control d-inline-block"
            style={{ width: "auto", fontSize: "14px" }}
            value={editData.Blood_Group || ""}
            onChange={(e) => setEditData({ ...editData, Blood_Group: e.target.value })}
          >
            <option value="">Select</option>
            {bloodGroupOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        ) : (
          <span style={{ color: "#6B7280" }}>
            {employee.Blood_Group}
          </span>
        )}
      </p>

      <p className="mb-2">
        <strong>Height:</strong>{" "}
        {isEditing ? (
          <input
            type="number"
            className="form-control d-inline-block"
            style={{ width: "auto", fontSize: "14px" }}
            value={editData.Height || ""}
            onChange={(e) => setEditData({ ...editData, Height: e.target.value })}
          />
        ) : (
          <span style={{ color: "#6B7280" }}>
            {employee.Height} cm
          </span>
        )}
      </p>

      <p className="mb-2">
        <strong>Weight:</strong>{" "}
        {isEditing ? (
          <input
            type="number"
            className="form-control d-inline-block"
            style={{ width: "auto", fontSize: "14px" }}
            value={editData.Weight || ""}
            onChange={(e) => setEditData({ ...editData, Weight: e.target.value })}
          />
        ) : (
          <span style={{ color: "#6B7280" }}>
            {employee.Weight} kg
          </span>
        )}
      </p>

      <p className="mb-2">
        <strong>BMI:</strong>{" "}
        <span style={{ color: "#6B7280" }}>
          {employee.BMI || "-"}
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

          <p style={{ marginBottom: "4px", fontSize: "14px" }}>
            <strong>ABHA:</strong> {f.ABHA_Number || "-"}
          </p>

          <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: 0 }}>
            Height: {f.Height} cm &nbsp;|&nbsp; Weight: {f.Weight} kg &nbsp;|&nbsp; BMI: {f.BMI || "-"}
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
