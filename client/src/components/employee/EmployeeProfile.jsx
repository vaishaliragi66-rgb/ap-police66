import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { fetchMasterDataMap, getMasterOptions } from "../../utils/masterData_clean";

const EmployeeProfile = () => {
  const FALLBACK_PROFILE_IMAGE = "/profile-fallback.png";
  const navigate = useNavigate();
  const employeeObjectId = localStorage.getItem("employeeObjectId");
  const employeeId = employeeObjectId || localStorage.getItem("employeeId");
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:6100";

  const [employee, setEmployee] = useState(null);
  const [family, setFamily] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [absCardFile, setAbsCardFile] = useState(null);
  const [absCardUploading, setAbsCardUploading] = useState(false);
  const [absCardDeleting, setAbsCardDeleting] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [familyPhotoFiles, setFamilyPhotoFiles] = useState({});
  const [familyPhotoPreviews, setFamilyPhotoPreviews] = useState({});
  const [familyPhotoUploadingId, setFamilyPhotoUploadingId] = useState("");
  const [masterMap, setMasterMap] = useState({});
  const profilePhotoInputRef = useRef(null);
  const familyPhotoInputRefs = useRef({});

  const designationOptions = getMasterOptions(masterMap, "Designations");
  const bloodGroupOptions = getMasterOptions(masterMap, "Blood Groups");

  useEffect(() => {
    if (!employeeId) return;

    axios
      .get(`${BACKEND_URL}/employee-api/profile/${employeeId}`)
      .then((res) => {
        setEmployee(res.data);
        setEditData(res.data);
      })
      .catch(() => {
        setEmployee(null);
      });

    axios
      .get(`${BACKEND_URL}/family-api/family/${employeeId}`)
      .then((res) => setFamily(res.data || []))
      .catch(() => setFamily([]));
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
        setProfilePhotoFile(null);
        setProfilePhotoPreview("");
        setFamilyPhotoFiles({});
        setFamilyPhotoPreviews((prev) => {
          Object.values(prev).forEach((url) => {
            if (url) URL.revokeObjectURL(url);
          });
          return {};
        });
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
    setProfilePhotoFile(null);
    setProfilePhotoPreview("");
    setFamilyPhotoFiles({});
    setFamilyPhotoPreviews((prev) => {
      Object.values(prev).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      return {};
    });
    setIsEditing(false);
  };

  const handleProfilePhotoFileChange = (file) => {
    if (!file) {
      setProfilePhotoFile(null);
      setProfilePhotoPreview("");
      return;
    }

    setProfilePhotoFile(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
  };

  const handleFamilyPhotoFileChange = (memberId, file) => {
    if (!memberId) return;

    if (!file) {
      setFamilyPhotoFiles((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      setFamilyPhotoPreviews((prev) => {
        const next = { ...prev };
        if (next[memberId]) URL.revokeObjectURL(next[memberId]);
        delete next[memberId];
        return next;
      });
      return;
    }

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(String(file.type || "").toLowerCase())) {
      alert("Only JPEG, PNG, WebP, or GIF images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5 MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFamilyPhotoFiles((prev) => ({ ...prev, [memberId]: file }));
    setFamilyPhotoPreviews((prev) => {
      const next = { ...prev };
      if (next[memberId]) URL.revokeObjectURL(next[memberId]);
      next[memberId] = previewUrl;
      return next;
    });
  };

  const handleFamilyPhotoUpload = (memberId) => {
    const file = familyPhotoFiles[memberId];
    if (!file) {
      alert("Please choose a family member photo first.");
      return;
    }

    setFamilyPhotoUploadingId(memberId);
    const formData = new FormData();
    formData.append("Photo", file);

    axios
      .put(`${BACKEND_URL}/family-api/upload-photo/${memberId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      .then((res) => {
        const updatedMember = res?.data?.member;
        if (updatedMember?._id) {
          setFamily((prev) =>
            (Array.isArray(prev) ? prev : []).map((member) =>
              String(member?._id) === String(updatedMember._id) ? updatedMember : member
            )
          );
        }

        setFamilyPhotoFiles((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
        setFamilyPhotoPreviews((prev) => {
          const next = { ...prev };
          if (next[memberId]) URL.revokeObjectURL(next[memberId]);
          delete next[memberId];
          return next;
        });

        alert("Family member photo uploaded successfully");
      })
      .catch((err) => {
        const resp = err?.response?.data;
        const msg =
          resp?.message ||
          (typeof resp === "string" ? resp : "") ||
          err?.message ||
          "Failed to upload family member photo";
        alert(msg);
      })
      .finally(() => setFamilyPhotoUploadingId(""));
  };

  const handleProfilePhotoUpload = () => {
    if (!profilePhotoFile) {
      alert("Please choose a profile image first.");
      return;
    }

    setProfilePhotoUploading(true);
    const formData = new FormData();
    formData.append("Photo", profilePhotoFile);

    axios
      .put(`${BACKEND_URL}/employee-api/upload-photo/${employeeId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      .then((res) => {
        setEmployee(res.data.employee);
        setEditData(res.data.employee);
        setProfilePhotoFile(null);
        setProfilePhotoPreview("");
        alert("Profile image uploaded successfully");
      })
      .catch((err) => {
        const resp = err?.response?.data;
        const msg =
          resp?.message ||
          (typeof resp === "string" ? resp : "") ||
          err?.message ||
          "Failed to upload profile image";
        alert(msg);
        console.error(err);
      })
      .finally(() => setProfilePhotoUploading(false));
  };

  useEffect(() => {
    return () => {
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
      Object.values(familyPhotoPreviews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [profilePhotoPreview, familyPhotoPreviews]);

  if (!employee)
    return <div className="text-center mt-5">Loading profile...</div>;

  const resolveImageUrl = (photoPath) => {
    if (!photoPath) return FALLBACK_PROFILE_IMAGE;
    if (/^https?:\/\//i.test(photoPath)) return photoPath;
    const base = String(BACKEND_URL || "").replace(/\/$/, "");
    return `${base}/${String(photoPath).replace(/^\/+/, "")}`;
  };
  const resolveFileUrl = (filePath) => {
    if (!filePath) return null;
    if (/^https?:\/\//i.test(filePath)) return filePath;
    const base = String(BACKEND_URL || "").replace(/\/$/, "");
    return `${base}/${String(filePath).replace(/^\/+/, "")}`;
  };
  const absCardUrl = resolveFileUrl(employee?.ABS_Card);
  const isAbsCardImage = employee?.ABS_Card
    ? /\.(png|jpe?g|gif|webp)$/i.test(String(employee.ABS_Card).split("?")[0])
    : false;
  const profileImageSrc = isEditing && profilePhotoPreview
    ? profilePhotoPreview
    : resolveImageUrl(employee?.Profile_Pic || employee?.Photo);

    return (
      <div
        className="employee-profile-page"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(191,219,254,0.62), transparent 24%), radial-gradient(circle at right center, rgba(224,242,254,0.74), transparent 28%), linear-gradient(180deg, #F5FAFF, #EEF6FF)",
          minHeight: "100vh",
          padding: "24px 0",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <style>
          {`
            .employee-profile-page .form-control,
            .employee-profile-page .form-select {
              min-height: 44px;
              border-radius: 14px;
              border: 1px solid rgba(191, 219, 254, 0.75);
              background: rgba(248, 250, 252, 0.96);
              box-shadow: 0 10px 20px rgba(148, 163, 184, 0.08);
            }
          `}
        </style>

        <div className="container" style={{ maxWidth: "1100px" }}>

          {/* Page Header */}
        <div
          style={{
            background: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(255,255,255,0.88)",
            borderRadius: "24px",
            padding: "20px 24px",
            marginBottom: "20px",
            boxShadow: "0 24px 44px rgba(148,184,255,0.16)",
            backdropFilter: "blur(18px)",
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
              backgroundColor: "rgba(255,255,255,0.82)",
              border: "1px solid rgba(191,219,254,0.82)",
              borderRadius: "14px",
              padding: "6px 14px",
              fontSize: "14px",
              color: "#1F2933",
              boxShadow: "0 12px 20px rgba(191,219,254,0.14)",
            }}
          >
            ← Back
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
    
          {/* PROFILE CARD */}
          <div
            className="card border-0"
            style={{
              borderRadius: "24px",
              boxShadow: "0 24px 44px rgba(148,184,255,0.16)",
              overflow: "hidden",
              background: "rgba(255,255,255,0.78)",
              border: "1px solid rgba(255,255,255,0.88)",
              backdropFilter: "blur(18px)",
            }}
          >
           
                {/* Top Strip */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(239,246,255,0.95), rgba(255,255,255,0.82))",
          padding: "28px 24px",
          borderBottom: "1px solid rgba(191,219,254,0.5)",
        }}
      >
        <div className="row align-items-center">
          {/* Profile Image */}
          <div className="col-md-3 text-center">
            <div
              style={{
                display: "inline-block",
                padding: "6px",
                borderRadius: "32px",
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(255,255,255,0.92)",
                boxShadow: "0 18px 30px rgba(191,219,254,0.16)",
              }}
            >
              <img
                src={profileImageSrc}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_PROFILE_IMAGE;
                }}
                 
                className="rounded-circle"
                style={{
                  width: "120px",
                  height: "120px",
                  objectFit: "cover",
                  border: "1px solid rgba(191,219,254,0.82)",
                  boxShadow: "0 12px 24px rgba(148,184,255,0.18)",
                  background: "rgba(255,255,255,0.86)",
                }}
              />
            </div>
            {isEditing && (
              <div className="mt-2">
                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  className="d-none"
                  accept="image/*"
                  onChange={(e) => handleProfilePhotoFileChange(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  style={{ borderRadius: "10px" }}
                  onClick={() => profilePhotoInputRef.current?.click()}
                >
                  Edit Profile Image
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary ms-2"
                  style={{ borderRadius: "10px" }}
                  onClick={handleProfilePhotoUpload}
                  disabled={profilePhotoUploading || !profilePhotoFile}
                >
                  {profilePhotoUploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            )}
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
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(255,255,255,0.88)",
        borderRadius: "20px",
        padding: "18px",
        height: "100%",
        boxShadow: "0 18px 30px rgba(191,219,254,0.14)",
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
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(255,255,255,0.88)",
        borderRadius: "20px",
        padding: "18px",
        height: "100%",
        boxShadow: "0 18px 30px rgba(191,219,254,0.14)",
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
            background: "linear-gradient(135deg, rgba(239,246,255,0.95), rgba(255,255,255,0.82))",
            padding: "12px 16px",
            borderRadius: "18px",
            marginBottom: "16px",
            border: "1px solid rgba(191,219,254,0.7)",
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
      background: "rgba(255,255,255,0.78)",
      border: "1px dashed rgba(191,219,254,0.8)",
      borderRadius: "18px",
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
            background: "rgba(255,255,255,0.82)",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.88)",
            boxShadow: "0 20px 34px rgba(191,219,254,0.16)",
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
          <div className="d-flex justify-content-center mb-2">
            <img
              src={familyPhotoPreviews[f._id] || resolveImageUrl(f.Photo)}
              alt={f.Name || "Family member"}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_PROFILE_IMAGE;
              }}
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "1px solid rgba(191,219,254,0.82)",
                boxShadow: "0 10px 18px rgba(148,184,255,0.16)",
                background: "rgba(255,255,255,0.86)"
              }}
            />
          </div>
          <div
            className="d-flex justify-content-center gap-2 mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={(el) => {
                familyPhotoInputRefs.current[f._id] = el;
              }}
              type="file"
              className="d-none"
              accept="image/*"
              onChange={(e) => handleFamilyPhotoFileChange(f._id, e.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              style={{ borderRadius: "10px" }}
              onClick={(e) => {
                e.stopPropagation();
                familyPhotoInputRefs.current[f._id]?.click();
              }}
            >
              Edit Photo
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ borderRadius: "10px" }}
              onClick={(e) => {
                e.stopPropagation();
                handleFamilyPhotoUpload(f._id);
              }}
              disabled={familyPhotoUploadingId === f._id || !familyPhotoFiles[f._id]}
            >
              {familyPhotoUploadingId === f._id ? "Uploading..." : "Upload"}
            </button>
          </div>
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
