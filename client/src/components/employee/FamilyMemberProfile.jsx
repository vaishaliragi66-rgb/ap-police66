import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { fetchMasterDataMap, getMasterOptions } from "../../utils/masterData_clean";

const FamilyMemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [member, setMember] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [masterMap, setMasterMap] = useState({});

  const relationshipOptions = getMasterOptions(masterMap, "Relationships");
  const bloodGroupOptions = getMasterOptions(masterMap, "Blood Groups");

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/family-api/family-report/${id}`)
      .then((res) => {
        setMember(res.data);
        setEditData(res.data);
      });
  }, [id, BACKEND_URL]);

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

    axios.put(`${BACKEND_URL}/family-api/update/${id}`, editData)
      .then((res) => {
        setMember(res.data.member);
        setIsEditing(false);
        alert("Family member updated successfully");
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Failed to update family member");
        console.error(err);
      });
  };

  const handleCancel = () => {
    setEditData(member);
    setIsEditing(false);
  };

  if (!member) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <div
      className="container mt-4 family-member-profile-page"
      style={{
        minHeight: "100vh",
        paddingTop: "16px",
        paddingBottom: "32px",
        background:
          "radial-gradient(circle at top left, rgba(191,219,254,0.62), transparent 24%), radial-gradient(circle at right center, rgba(224,242,254,0.74), transparent 28%), linear-gradient(180deg, #F5FAFF, #EEF6FF)"
      }}
    >
      <style>
        {`
          .family-member-profile-page .form-control,
          .family-member-profile-page .form-select {
            min-height: 44px;
            border-radius: 14px;
            border: 1px solid rgba(191, 219, 254, 0.75);
            background: rgba(248, 250, 252, 0.96);
            box-shadow: 0 10px 20px rgba(148, 163, 184, 0.08);
          }
        `}
      </style>
      <div className="d-flex justify-content-between mb-3">
        <button
          className="btn"
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(191,219,254,0.82)",
            borderRadius: "14px",
            padding: "6px 14px",
            fontSize: "14px",
            color: "#1F2933",
            boxShadow: "0 12px 20px rgba(191,219,254,0.14)",
          }}
        >
          &larr; Back
        </button>
        {!isEditing ? (
          <button
            className="btn btn-primary"
            onClick={handleEdit}
            style={{
              borderRadius: "14px",
              padding: "6px 14px",
              fontSize: "14px",
              background: "linear-gradient(135deg, #2563EB, #38BDF8)",
              border: "none",
              boxShadow: "0 14px 24px rgba(96,165,250,0.22)",
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
                borderRadius: "14px",
                padding: "6px 14px",
                fontSize: "14px",
                boxShadow: "0 12px 20px rgba(16,185,129,0.18)",
              }}
            >
              Save
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              style={{
                borderRadius: "14px",
                padding: "6px 14px",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div
        className="card shadow p-4 border-0"
        style={{
          background: "rgba(255,255,255,0.78)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.88)",
          boxShadow: "0 24px 44px rgba(148,184,255,0.18)",
          backdropFilter: "blur(18px)",
        }}
      >
        <h4 className="mb-3">
          {isEditing ? (
            <input
              type="text"
              className="form-control"
              value={editData.Name || ""}
              onChange={(e) => setEditData({ ...editData, Name: e.target.value })}
            />
          ) : (
            member.Name
          )}
        </h4>

        <div className="row">
          <div className="col-md-6">
            <p>
              <strong>Relationship:</strong>{" "}
              {isEditing ? (
                <select
                  className="form-control d-inline-block"
                  style={{ width: "auto", fontSize: "14px" }}
                  value={editData.Relationship || ""}
                  onChange={(e) => setEditData({ ...editData, Relationship: e.target.value })}
                >
                  <option value="">Select Relationship</option>
                  {relationshipOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              ) : (
                member.Relationship
              )}
            </p>
            <p>
              <strong>Gender:</strong>{" "}
              {isEditing ? (
                <select
                  className="form-control d-inline-block"
                  style={{ width: "auto", fontSize: "14px" }}
                  value={editData.Gender || ""}
                  onChange={(e) => setEditData({ ...editData, Gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                member.Gender
              )}
            </p>
            <p>
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
                member.Blood_Group
              )}
            </p>
            <p>
              <strong>ABHA Number:</strong>{" "}
              {isEditing ? (
                <input
                  type="text"
                  className="form-control d-inline-block"
                  style={{ width: "auto", fontSize: "14px" }}
                  value={editData.ABHA_Number || ""}
                  onChange={(e) => setEditData({ ...editData, ABHA_Number: e.target.value.replace(/\D/g, "").slice(0, 14) })}
                  maxLength="14"
                  placeholder="14-digit ABHA number"
                />
              ) : (
                member.ABHA_Number || "-"
              )}
            </p>
          </div>

          <div className="col-md-6">
            <p>
              <strong>DOB:</strong>{" "}
              {isEditing ? (
                <input
                  type="date"
                  className="form-control d-inline-block"
                  style={{ width: "auto", fontSize: "14px" }}
                  value={editData.DOB ? new Date(editData.DOB).toISOString().split('T')[0] : ""}
                  onChange={(e) => setEditData({ ...editData, DOB: e.target.value })}
                />
              ) : (
                member.DOB ? new Date(member.DOB).toLocaleDateString() : "-"
              )}
            </p>
            <p>
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
                `${member.Height} cm`
              )}
            </p>
            <p>
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
                `${member.Weight} kg`
              )}
            </p>
            <p>
              <strong>BMI:</strong> {member.BMI || "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyMemberProfile;
