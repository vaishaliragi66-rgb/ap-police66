import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { FaCamera, FaUser } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import { fetchMasterDataMap, getMasterOptions } from "../../utils/masterData_clean";

const FamilyMemberRegistration = () => {
  const employeeId = localStorage.getItem("employeeId");
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    Name: "",
    Gender: "",
    Relationship: "",
    DOB: "",
    Blood_Group: "",
    ABHA_Number: "",
    Height: "",
    Weight: "",
    Phone_No: "",
    Address: {
      Street: "",
      District: "",
      State: "",
      Pincode: "",
    },
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [masterMap, setMasterMap] = useState({});
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    if (!employeeId) return;

    let mounted = true;

    axios
      .get(`${BACKEND_URL}/employee-api/profile/${employeeId}`)
      .then((res) => {
        if (mounted) setEmployeeProfile(res.data || null);
      })
      .catch(() => {
        if (mounted) setEmployeeProfile(null);
      });

    return () => {
      mounted = false;
    };
  }, [BACKEND_URL, employeeId]);

  const relationshipOptions = getMasterOptions(masterMap, "Relationships");
  const bloodGroupOptions = getMasterOptions(masterMap, "Blood Groups");

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("Address.")) {
      const key = name.split(".")[1];
      setFormData({ ...formData, Address: { ...formData.Address, [key]: value } });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5 MB.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSameAsEmployeePhone = () => {
    if (!employeeProfile?.Phone_No) {
      alert("Employee phone number is not available.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      Phone_No: employeeProfile.Phone_No,
    }));
  };

  const handleSameAsEmployeeAddress = () => {
    if (!employeeProfile?.Address) {
      alert("Employee address is not available.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      Address: {
        Street: employeeProfile.Address.Street || "",
        District: employeeProfile.Address.District || "",
        State: employeeProfile.Address.State || "",
        Pincode: employeeProfile.Address.Pincode || "",
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!employeeId) {
      alert("Employee not logged in. Please login again.");
      return;
    }

    if (!formData.Height || Number(formData.Height) <= 0 || Number.isNaN(Number(formData.Height))) {
      alert("Height is required and must be a positive number in cm.");
      return;
    }

    if (!formData.Weight || Number(formData.Weight) <= 0 || Number.isNaN(Number(formData.Weight))) {
      alert("Weight is required and must be a positive number in kg.");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append("EmployeeId", employeeId);
      data.append("Name", formData.Name);
      data.append("Gender", formData.Gender);
      data.append("Relationship", formData.Relationship);
      data.append("DOB", formData.DOB);
      data.append("Blood_Group", formData.Blood_Group);
      data.append("ABHA_Number", formData.ABHA_Number);
      data.append("Height", formData.Height);
      data.append("Weight", formData.Weight);
      data.append("Phone_No", formData.Phone_No);
      data.append("Address", JSON.stringify(formData.Address));
      if (photoFile) data.append("Photo", photoFile);

      const res = await axios.post(
        `${BACKEND_URL}/family-api/register`,
        data,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      alert(res.data.message);

      setFormData({
        Name: "",
        Gender: "",
        Relationship: "",
        DOB: "",
        Blood_Group: "",
        ABHA_Number: "",
        Height: "",
        Weight: "",
        Phone_No: "",
        Address: { Street: "", District: "", State: "", Pincode: "" },
      });
      handleRemovePhoto();
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center family-registration-page"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(191,219,254,0.62), transparent 24%), radial-gradient(circle at right center, rgba(224,242,254,0.74), transparent 28%), linear-gradient(180deg, #F5FAFF, #EEF6FF)",
        fontFamily: "'Inter', sans-serif",
        paddingTop: "60px",
        paddingBottom: "40px"
      }}
    >
      <style>
        {`
          .family-registration-page .form-control,
          .family-registration-page .form-select {
            min-height: 46px;
            border-radius: 14px;
            border: 1px solid rgba(191, 219, 254, 0.75);
            background: rgba(248, 250, 252, 0.96);
            box-shadow: 0 10px 20px rgba(148, 163, 184, 0.08);
          }

          .family-registration-page .form-control:focus,
          .family-registration-page .form-select:focus,
          .family-registration-page .form-check-input:focus {
            border-color: #60A5FA;
            box-shadow: 0 0 0 0.18rem rgba(96, 165, 250, 0.14);
          }
        `}
      </style>

      <div
        className="p-4"
        style={{
          width: "700px",
          background: "rgba(255,255,255,0.78)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.88)",
          boxShadow: "0 24px 44px rgba(148,184,255,0.18)",
          backdropFilter: "blur(18px)",
        }}
      >
              <h3
        className="text-center mb-4"
        style={{
          fontWeight: 600,
          color: "#1F2933",
          paddingBottom: "10px",
          borderBottom: "1px solid rgba(191,219,254,0.5)",
          letterSpacing: "-0.03em",
        }}
      >
        Family Member Registration
      </h3>

        <form onSubmit={handleSubmit}>

          {/* Photo Upload */}
          <div className="d-flex flex-column align-items-center mb-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "110px",
                height: "110px",
                borderRadius: "28px",
                border: "2px dashed #60A5FA",
                background: "linear-gradient(135deg, rgba(219,234,254,0.95), rgba(255,255,255,0.84))",
                cursor: "pointer",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div className="text-center" style={{ color: "#4A70A9" }}>
                  <FaUser size={32} style={{ marginBottom: "4px" }} />
                  <div style={{ fontSize: "11px", fontWeight: 500 }}>Add Photo</div>
                </div>
              )}

              {/* Camera badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "6px",
                  right: "6px",
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #2563EB, #38BDF8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                }}
              >
                <FaCamera size={12} color="#fff" />
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />

            <div className="mt-2 d-flex gap-2 align-items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-sm"
                style={{
                  background: "rgba(255,255,255,0.82)",
                  color: "#2563EB",
                  border: "1px solid rgba(191,219,254,0.82)",
                  borderRadius: "999px",
                  fontSize: "12px",
                  padding: "3px 14px",
                }}
              >
                {photoPreview ? "Change Photo" : "Upload Photo"}
              </button>

              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: "#FEE2E2",
                    color: "#DC2626",
                    border: "1px solid #FCA5A5",
                    borderRadius: "999px",
                    fontSize: "12px",
                    padding: "3px 14px",
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
              JPEG, PNG or WebP · Max 5 MB · Optional
            </p>
          </div>

          {/* Name */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Name</label>
            <input
              type="text"
              className="form-control"
              name="Name"
              value={formData.Name}
              onChange={handleChange}
              required
            />
          </div>
  
          {/* Gender */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Gender</label>
            <div className="d-flex gap-4 mt-1">
              {["Male", "Female","Other"].map((g) => (
                <div className="form-check" key={g}>
                  <input
                    className="form-check-input"
                    type="radio"
                    name="Gender"
                    value={g}
                    checked={formData.Gender === g}
                    onChange={handleChange}
                    required
                  />
                  <label className="form-check-label">{g}</label>
                </div>
              ))}
            </div>
          </div>
  
          {/* Relationship */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Relationship</label>
            <select
              className="form-select"
              name="Relationship"
              value={formData.Relationship}
              onChange={handleChange}
              required
            >
              <option value="">Select Relationship</option>
              {relationshipOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
  
          {/* DOB */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Date of Birth</label>
            <input
              type="date"
              className="form-control"
              name="DOB"
              value={formData.DOB}
              onChange={handleChange}
            />
          </div>
  
          {/* Blood Group */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Blood Group</label>
            <select
              className="form-select"
              name="Blood_Group"
              value={formData.Blood_Group}
              onChange={handleChange}
            >
              <option value="">Select</option>
              {bloodGroupOptions.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">ABHA Number</label>
            <input
              type="text"
              className="form-control"
              name="ABHA_Number"
              placeholder="14-digit ABHA number"
              value={formData.ABHA_Number}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  ABHA_Number: e.target.value.replace(/\D/g, "").slice(0, 14)
                }))
              }
            />
          </div>
  
          {/* Height & Weight */}
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Height (cm)</label>
              <input
                type="number"
                min="1"
                step="0.1"
                className="form-control"
                name="Height"
                value={formData.Height}
                onChange={handleChange}
                required
              />
            </div>
  
            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Weight (kg)</label>
              <input
                type="number"
                min="1"
                step="0.1"
                className="form-control"
                name="Weight"
                value={formData.Weight}
                onChange={handleChange}
                required
              />
            </div>
          </div>
  
          {/* Phone */}
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
              <label className="form-label fw-semibold mb-0">Phone Number</label>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleSameAsEmployeePhone}
                disabled={!employeeProfile}
                style={{
                  backgroundColor: "#EAF2FF",
                  color: "#4A70A9",
                  border: "1px solid #4A70A9",
                  borderRadius: "999px",
                  fontSize: "12px",
                  padding: "3px 12px",
                  whiteSpace: "nowrap",
                }}
              >
                Same as employee
              </button>
            </div>
            <input
              type="text"
              className="form-control"
              name="Phone_No"
              value={formData.Phone_No}
              onChange={handleChange}
            />
          </div>
  
          {/* Address */}
          <div className="d-flex align-items-center justify-content-between gap-2 mt-4 mb-2">
            <h6
              className="fw-semibold mb-0"
              style={{ color: "#2563EB" }}
            >
              Address Details
            </h6>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleSameAsEmployeeAddress}
              disabled={!employeeProfile}
              style={{
                background: "rgba(255,255,255,0.82)",
                color: "#2563EB",
                border: "1px solid rgba(191,219,254,0.82)",
                borderRadius: "999px",
                fontSize: "12px",
                padding: "3px 12px",
                whiteSpace: "nowrap",
              }}
            >
              Same as employee
            </button>
          </div>
  
          <input
            className="form-control mb-2"
            placeholder="Street"
            name="Address.Street"
            value={formData.Address.Street}
            onChange={handleChange}
          />
          <input
            className="form-control mb-2"
            placeholder="District"
            name="Address.District"
            value={formData.Address.District}
            onChange={handleChange}
          />
          <input
            className="form-control mb-2"
            placeholder="State"
            name="Address.State"
            value={formData.Address.State}
            onChange={handleChange}
          />
          <input
            className="form-control mb-3"
            placeholder="Pincode"
            name="Address.Pincode"
            value={formData.Address.Pincode}
            onChange={handleChange}
          />
  
          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn w-100 mt-3"
            style={{
              background: "linear-gradient(135deg, #2563EB, #38BDF8)",
              color: "#FFFFFF",
              fontWeight: 600,
              borderRadius: "16px",
              border: "none",
              boxShadow: "0 14px 28px rgba(96,165,250,0.28)",
            }}
          >
            {loading ? "Registering..." : "Register Family Member"}
          </button>
        </form>
      </div>
    </div>
  );
  
};

export default FamilyMemberRegistration;
