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
    axios.put(`${BACKEND_URL}/family-api/update/${id}`, editData)
      .then((res) => {
        setMember(res.data.member);
        setIsEditing(false);
        alert("Family member updated successfully");
      })
      .catch((err) => {
        alert("Failed to update family member");
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
    <div className="container mt-4">
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
          &larr; Back
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

      <div className="card shadow p-4">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyMemberProfile;
