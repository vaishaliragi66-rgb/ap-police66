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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!employeeId) {
      alert("Employee not logged in. Please login again.");
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
        className="d-flex justify-content-center"
        style={{
          backgroundColor: "#F8FAFC",
          fontFamily: "'Inter', sans-serif",
          paddingTop: "60px",   // ✅ space from top
          paddingBottom: "40px"
        }}
      >

      <div
        className="p-4"
        style={{
          width: "700px",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #D6E0F0",
          boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
        }}
      >
              <h3
        className="text-center mb-4"
        style={{
          fontWeight: 600,
          color: "#1F2933",
          paddingBottom: "10px",
          borderBottom: "1px solid #D6E0F0",
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
                borderRadius: "50%",
                border: "2px dashed #4A70A9",
                backgroundColor: "#EAF2FF",
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
                  backgroundColor: "#4A70A9",
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
                  backgroundColor: "#EAF2FF",
                  color: "#4A70A9",
                  border: "1px solid #4A70A9",
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
  
          {/* Height & Weight */}
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Height (cm)</label>
              <input
                type="text"
                className="form-control"
                name="Height"
                value={formData.Height}
                onChange={handleChange}
              />
            </div>
  
            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Weight (kg)</label>
              <input
                type="text"
                className="form-control"
                name="Weight"
                value={formData.Weight}
                onChange={handleChange}
              />
            </div>
          </div>
  
          {/* Phone */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Phone Number</label>
            <input
              type="text"
              className="form-control"
              name="Phone_No"
              value={formData.Phone_No}
              onChange={handleChange}
            />
          </div>
  
          {/* Address */}
          <h6
            className="fw-semibold mt-4 mb-2"
            style={{ color: "#4A70A9" }}
          >
            Address Details
          </h6>
  
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
              backgroundColor: "#4A70A9",
              color: "#FFFFFF",
              fontWeight: 500,
              borderRadius: "999px",
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