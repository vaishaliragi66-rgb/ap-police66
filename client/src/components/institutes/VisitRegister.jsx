import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";

const VisitRegister = () => {
  const FALLBACK_PROFILE_IMAGE = "/profile-fallback.png";
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:6100";
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState(""); 
  const [filtered, setFiltered] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [isFamily, setIsFamily] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [familyLoading, setFamilyLoading] = useState(false);

  const [previewToken, setPreviewToken] = useState(null);
  const [previewOP, setPreviewOP] = useState(null);
  const [symptoms, setSymptoms] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const instituteId = localStorage.getItem("instituteId");

  const [vitals, setVitals] = useState({
    Temperature: "",
    Blood_Pressure: "",
    Oxygen: "",
    Pulse: "",
    GRBS: "",
    Height: "",
    Weight: ""
  });

  const getEntityId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return String(value?._id || "");
  };

  const calculateBMI = (heightCm, weightKg) => {
    const height = Number(heightCm);
    const weight = Number(weightKg);
    if (!height || !weight || height <= 0 || weight <= 0) return "";
    const heightM = height / 100;
    return (weight / (heightM * heightM)).toFixed(2);
  };

  const resolveImageUrl = (photoPath) => {
    if (!photoPath) return FALLBACK_PROFILE_IMAGE;
    if (/^https?:\/\//i.test(photoPath)) return photoPath;
    const base = String(BACKEND_URL || "").replace(/\/$/, "");
    return `${base}/${String(photoPath).replace(/^\/+/, "")}`;
  };

  /* ================= FETCH EMPLOYEES ================= */
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/employee-api/all`)
      .then(res => setEmployees(res.data.employees || []))
      .catch(err => console.error(err));
  }, []);

  /* ================= SEARCH FILTER ================= */
  useEffect(() => {
    if (!search.trim()) {
      setFiltered([]);
      return;
    }
  
    const q = search.toLowerCase();
  
    const results = employees.filter(emp =>
      emp.ABS_NO?.toString().startsWith(q) ||   // ✅ ABS first
      emp.Name?.toLowerCase().includes(q)
    );
  
    setFiltered(results);
  }, [search, employees]);
  

  /* ================= LOAD FAMILY MEMBERS ================= */
  useEffect(() => {
    if (isFamily && selectedEmployee) {
      setFamilyLoading(true);
      axios.get(
        `${BACKEND_URL}/family-api/family/${selectedEmployee._id}`
      )
        .then(res => setFamilyMembers(res.data || []))
        .catch(() => setFamilyMembers([]))
        .finally(() => setFamilyLoading(false));
    } else {
      setFamilyMembers([]);
      setSelectedFamily(null);
      setFamilyLoading(false);
    }
  }, [isFamily, selectedEmployee]);

  useEffect(() => {
    if (selectedEmployee) {
      axios
        .get(
          `${BACKEND_URL}/api/visits/next-numbers/${instituteId}`
        )
        .then(res => {
          setPreviewToken(res.data.nextToken);
          setPreviewOP(res.data.nextOP);
        })
        .catch(() => {
          setPreviewToken(null);
          setPreviewOP(null);
        });
    }
  }, [selectedEmployee]);

  
  /* ================= REGISTER VISIT ================= */
  const registerVisit = async () => {
    if (!selectedEmployee) {
      alert("Select employee");
      return;
    }
  
    if (isFamily && !selectedFamily) {
      alert("Select family member");
      return;
    }

    if (!vitals.Height || Number(vitals.Height) <= 0) {
      setFormError("Height is required and must be a positive number in cm.");
      return;
    }

    if (!vitals.Weight || Number(vitals.Weight) <= 0) {
      setFormError("Weight is required and must be a positive number in kg.");
      return;
    }
  
    setFormError("");
    setLoading(true);
  
    try {
      const targetEmployeeId = String(selectedEmployee?._id || "");
      const targetFamilyId = isFamily ? String(selectedFamily?._id || "") : "";

      const visitsRes = await axios.get(`${BACKEND_URL}/api/visits/today/${instituteId}`);
      const todayVisits = Array.isArray(visitsRes?.data) ? visitsRes.data : [];

      const duplicateVisit = todayVisits.find((visit) => {
        const visitEmployeeId = getEntityId(visit?.employee_id);
        const visitFamilyId = getEntityId(visit?.FamilyMember);
        const visitIsFamily = Boolean(visit?.IsFamilyMember);

        if (isFamily) {
          return visitIsFamily && visitEmployeeId === targetEmployeeId && visitFamilyId === targetFamilyId;
        }

        return !visitIsFamily && visitEmployeeId === targetEmployeeId;
      });

      if (duplicateVisit) {
        alert(
          `This patient is already registered in this session with Token ${duplicateVisit.token_no}.`
        );
        setLoading(false);
        return;
      }

      const vitalsCopy = { ...vitals };
      if (vitalsCopy.Temperature) {
        const tempValue = Number(vitalsCopy.Temperature);
        if (Number.isNaN(tempValue) || tempValue < 60 || tempValue > 115) {
          setFormError("Temperature must be between 60 and 115 °F.");
          setLoading(false);
          return;
        }
        vitalsCopy.Temperature = tempValue;
      }
      vitalsCopy.BMI = calculateBMI(vitalsCopy.Height, vitalsCopy.Weight);

      await axios.post(
        `${BACKEND_URL}/api/visits/register`,
        {
          Institute_ID: instituteId,
          employee_id: selectedEmployee._id,
          abs_no: selectedEmployee.ABS_NO,
          IsFamilyMember: isFamily,
          FamilyMember: isFamily ? selectedFamily._id : null,
          name: isFamily ? selectedFamily.Name : selectedEmployee.Name,
          symptoms: symptoms,
          Vitals: vitalsCopy
        }
      );
      alert("✅ Visit Registered Successfully");
  
      setSearch("");
      setSelectedEmployee(null);
      setIsFamily(false);
      setFamilyMembers([]);
      setSelectedFamily(null);
      setSymptoms("");
      setVitals({
        Temperature: "",
        Blood_Pressure: "",
        Oxygen: "",
        Pulse: "",
        GRBS: "",
        Height: "",
        Weight: ""
      });
  
    } catch (err) {
      const backendError = err?.response?.data?.error;
      alert(`❌ ${backendError || "Failed to register visit"}`);
    } finally {
      setLoading(false);
    }
  };
  
/* ================= Age calculation ================= */
  const calculateAge = (dob) => {
    if (!dob) return "-";
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };
  

  /* ================= UI ================= */
  return (
    <div
      className="min-vh-100 institutes-theme"
      style={{
        fontFamily: "Inter, sans-serif",
        background: "transparent",
        padding: "24px 0"
      }}
    >
      <div className="container-fluid" style={{ maxWidth: "1200px" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(255,255,255,0.88)",
            borderRadius: "24px",
            padding: "16px 20px",
            marginBottom: "16px",
            boxShadow: "0 24px 44px rgba(148,184,255,0.16)",
            backdropFilter: "blur(18px)"
          }}
        >
          <h4 style={{ margin: 0, color: "#1F2933", fontWeight: 600 }}>Visit Register</h4>
          <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: "14px" }}>
            Register employee and family member visits with vitals
          </p>
        </div>

       {/* Back Button */}
       <button
         className="btn mb-3"
         onClick={() => navigate(-1)}
         style={{
          backgroundColor: "rgba(255,255,255,0.82)",
          border: "1px solid rgba(191,219,254,0.82)",
          borderRadius: "14px",
          padding: "6px 14px",
          fontSize: "14px",
          color: "#1F2933",
          boxShadow: "0 12px 20px rgba(191,219,254,0.14)"
         }}
       >
         ← Back
       </button>
       <div className="col-md-6 mx-auto">
         <div className="card border-0 glass-card">
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">

          {/* LEFT - TOKEN */}
            <div>
              {previewToken && (
                <strong>Token No: {previewToken}</strong>
              )}
            </div>

            {/* CENTER */}
            <div style={{ fontWeight: 600 }}>
              Registration
            </div>

            {/* RIGHT - OP */}
            <div>
              {previewOP && (
                <strong>OP No: {previewOP}</strong>
              )}
            </div>

          </div>
  
          <div className="card-body">
            {/* EMPLOYEE SEARCH */}
            <label className="fw-semibold">Employee ABS / Name</label>
            <input
              className="form-control"
              placeholder="Search employee"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            {filtered.length > 0 && (
              <div className="list-group mt-1">
                {filtered.map(emp => (
                  <button
                    key={emp._id}
                    className="list-group-item list-group-item-action"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setSearch(`${emp.ABS_NO} - ${emp.Name}`);
                      setFiltered([]);
                      setVitals((prev) => ({
                        ...prev,
                        Height: emp.Height || "",
                        Weight: emp.Weight || ""
                      }));
                    
                      // 🔥 RESET FAMILY STATE
                      setIsFamily(false);
                      setFamilyMembers([]);
                      setSelectedFamily(null);
                    }}
                    
                  >
                    {emp.ABS_NO} — {emp.Name}
                  </button>
                ))}
              </div>
            )}

            {/* FAMILY CHECKBOX */}
            <div className="form-check mt-3">
              <input
                type="checkbox"
                className="form-check-input"
                checked={isFamily}
                onChange={e => {
                  const checked = e.target.checked;
                  setIsFamily(checked);
                  if (!checked && selectedEmployee) {
                    setVitals((prev) => ({
                      ...prev,
                      Height: selectedEmployee.Height || "",
                      Weight: selectedEmployee.Weight || ""
                    }));
                  }
                }}
                disabled={!selectedEmployee}
              />
              <label className="form-check-label">
                Register for family member
              </label>
            </div>

            {/* FAMILY DROPDOWN */}
            {isFamily && familyLoading && (
              <div className="mt-3 text-muted" style={{ fontSize: "14px" }}>
                Loading family members...
              </div>
            )}

            {isFamily && !familyLoading && familyMembers.length > 0 && (
              <div className="mt-3">
                <label className="fw-semibold">Family Member</label>
                <select
                  className="form-select"
                  value={selectedFamily?._id || ""}
                  onChange={e =>
                    {
                      const family = familyMembers.find(f => f._id === e.target.value) || null;
                      setSelectedFamily(family);
                      setVitals((prev) => ({
                        ...prev,
                        Height: family?.Height || "",
                        Weight: family?.Weight || ""
                      }));
                    }
                  }
                >
                  <option value="">Select</option>
                  {familyMembers.map(f => (
                    <option key={f._id} value={f._id}>
                      {f.Name} ({f.Relationship})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isFamily && !familyLoading && familyMembers.length === 0 && (
              <div className="alert alert-warning mt-3">
            
                No family members found
              </div>
            )}
        {/* SYMPTOMS */}
        <div className="mt-3">
          <label className="fw-semibold">
            Symptoms (comma separated)
          </label>

          <textarea
            className="form-control"
            rows="3"
            placeholder="Eg: Fever, Cold, Headache"
            value={symptoms}
            onChange={e => setSymptoms(e.target.value)}
          />
        </div>

          {/* ================= VITALS ================= */}
  <div className="mt-4">
    <h6 className="fw-bold">Vitals</h6>
    {formError && <div className="alert alert-danger">{formError}</div>}

    <div className="row">
      <div className="col-md-6 mb-2">
        <label>Temperature (°F)</label>
        <input
          type="number"
          min="60"
          max="115"
          className="form-control"
          value={vitals.Temperature}
          onChange={(e) => {
            setFormError("");
            setVitals({ ...vitals, Temperature: e.target.value });
          }}
        />
      </div>

      <div className="col-md-6 mb-2">
        <label>Blood Pressure (mmHg)</label>
        <input
          type="text"
          className="form-control"
          placeholder="120/80"
          value={vitals.Blood_Pressure}
          onChange={(e) => {
            const value = e.target.value;
            // Allow only format: up to 3 digits, optional slash with up to 2 digits (e.g., "120/80")
            if (value === '' || /^\d{1,3}(\/\d{0,2})?$/.test(value)) {
              setVitals({ ...vitals, Blood_Pressure: value });
            }
          }}
        />
      </div>

      <div className="col-md-6 mb-2">
        <label>Pulse</label>
        <input
          type="number"
          className="form-control"
          value={vitals.Pulse}
          onChange={(e) =>
            setVitals({ ...vitals, Pulse: e.target.value })
          }
        />
      </div>

      <div className="col-md-6 mb-2">
        <label>SPO{<sub>2</sub>}</label>
        <input
          type="number"
          className="form-control"
          value={vitals.Oxygen}
          onChange={(e) =>
            setVitals({ ...vitals, Oxygen: e.target.value })
          }
        />
      </div>
      <div className="col-md-6 mb-2">
        <label>GRBS</label>
        <input
          type="number"
          className="form-control"
          value={vitals.GRBS}
          onChange={(e) =>
            setVitals({ ...vitals, GRBS: e.target.value })
          }
        />
      </div>
      <div className="col-md-6 mb-2">
        <label>Height (cm)</label>
        <input
          type="number"
          min="1"
          step="0.1"
          className="form-control"
          value={vitals.Height}
          onChange={(e) => {
            setFormError("");
            setVitals({ ...vitals, Height: e.target.value });
          }}
          required
        />
      </div>
      <div className="col-md-6 mb-2">
        <label>Weight (kg)</label>
        <input
          type="number"
          min="1"
          step="0.1"
          className="form-control"
          value={vitals.Weight}
          onChange={(e) => {
            setFormError("");
            setVitals({ ...vitals, Weight: e.target.value });
          }}
          required
        />
      </div>
      <div className="col-md-6 mb-2">
        <label>BMI</label>
        <input
          className="form-control"
          value={calculateBMI(vitals.Height, vitals.Weight) || "-"}
          readOnly
        />
      </div>
    </div>
  </div>

            {/* SUBMIT */}
             <button
               className="btn btn-primary w-100 mt-4"
               onClick={registerVisit}
               disabled={loading}
             >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>
        </div>
        {/* ================= PATIENT INFO CARD ================= */}
{selectedEmployee && !isFamily && (
  <div className="card border-0 glass-card mt-3">
    <div className="card-header" style={{ fontWeight: 600, color: "#1F2933" }}>
      Employee Details
    </div>

    <div className="card-body">
      {/* ===== PHOTO (enable later) ===== */}
      {
      <div className="d-flex justify-content-center mb-3">
      <img
        src={resolveImageUrl(selectedEmployee.Photo)}
        alt="Employee"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = FALLBACK_PROFILE_IMAGE;
        }}
        style={{
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid rgba(191,219,254,0.82)",
          boxShadow: "0 12px 24px rgba(148,184,255,0.18)",
          background: "rgba(255,255,255,0.86)"
        }}
      />
    </div>
    
    
      }

      <div className="row">
        {/* LEFT COLUMN */}
        <div className="col-md-6">
          <p><strong>ABS No:</strong> {selectedEmployee.ABS_NO}</p>
          <p><strong>Name:</strong> {selectedEmployee.Name}</p>
          <p><strong>Email:</strong> {selectedEmployee.Email}</p>
          <p><strong>Age:</strong> {calculateAge(selectedEmployee.DOB)}</p>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-md-6">
          <p><strong>Blood Group:</strong> {selectedEmployee.Blood_Group}</p>
          <p><strong>Height:</strong> {vitals.Height || selectedEmployee.Height}</p>
          <p><strong>Weight:</strong> {vitals.Weight || selectedEmployee.Weight}</p>
          <p><strong>BMI:</strong> {calculateBMI(vitals.Height || selectedEmployee.Height, vitals.Weight || selectedEmployee.Weight) || selectedEmployee.BMI || "-"}</p>
          <p><strong>Phone:</strong> {selectedEmployee.Phone_No}</p>
        </div>
      </div>
    </div>
  </div>
)}


{isFamily && selectedFamily && (
  <div className="card border-0 glass-card mt-3">
    <div className="card-header" style={{ fontWeight: 600, color: "#1F2933" }}>
      Family Member Details
    </div>

    <div className="card-body">
      <div className="d-flex justify-content-center mb-3">
        <img
          src={resolveImageUrl(selectedFamily.Photo)}
          alt="Family Member"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_PROFILE_IMAGE;
          }}
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "1px solid rgba(191,219,254,0.82)",
            boxShadow: "0 12px 24px rgba(148,184,255,0.18)",
            background: "rgba(255,255,255,0.86)"
          }}
        />
      </div>

      <div className="row">
        {/* LEFT COLUMN */}
        <div className="col-md-6">
          <p><strong>Employee Name:</strong> {selectedEmployee.Name}</p>
          <p><strong>Name:</strong> {selectedFamily.Name}</p>
          <p><strong>Relationship:</strong> {selectedFamily.Relationship}</p>
          <p><strong>Age:</strong> {calculateAge(selectedFamily.DOB)}</p>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-md-6">
          <p><strong>Gender:</strong> {selectedFamily.Gender}</p>
          <p><strong>Blood Group:</strong> {selectedFamily.Blood_Group}</p>
          <p><strong>Height:</strong> {vitals.Height || selectedFamily.Height}</p>
          <p><strong>Weight:</strong> {vitals.Weight || selectedFamily.Weight}</p>
          <p><strong>BMI:</strong> {calculateBMI(vitals.Height || selectedFamily.Height, vitals.Weight || selectedFamily.Weight) || selectedFamily.BMI || "-"}</p>
        </div>
      </div>
    </div>
  </div>
)}


       </div>
     </div>
    </div>
  );
};

export default VisitRegister;
