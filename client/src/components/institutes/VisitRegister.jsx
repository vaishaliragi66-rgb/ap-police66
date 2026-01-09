import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const VisitRegister = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState(""); 
  const [filtered, setFiltered] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [isFamily, setIsFamily] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);

  const [symptoms, setSymptoms] = useState("");

  const [loading, setLoading] = useState(false);

  /* ================= FETCH EMPLOYEES ================= */
  useEffect(() => {
    axios
      .get(`http://localhost:${BACKEND_PORT}/employee-api/all`)
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
      axios.get(
        `http://localhost:${BACKEND_PORT}/family-api/family/${selectedEmployee._id}`
      )
      
        .then(res => setFamilyMembers(res.data || []))
        .catch(() => setFamilyMembers([]));
    } else {
      setFamilyMembers([]);
      setSelectedFamily(null);
    }
  }, [isFamily, selectedEmployee]);

  
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
  
    const finalSymptoms = symptoms.trim(); // string
  
    const patient = isFamily
      ? {
          type: "FAMILY",
          name: selectedFamily.Name,
          relation: selectedFamily.Relationship,
          age: selectedFamily.DOB
            ? new Date().getFullYear() -
              new Date(selectedFamily.DOB).getFullYear()
            : null,
          symptoms: finalSymptoms || ""
        }
      : {
          type: "EMPLOYEE",
          name: selectedEmployee.Name,
          age: selectedEmployee.DOB
            ? new Date().getFullYear() -
              new Date(selectedEmployee.DOB).getFullYear()
            : null,
          symptoms: finalSymptoms || ""
        };
  
    setLoading(true);
    try {
      await axios.post(
        `http://localhost:${BACKEND_PORT}/api/visits/register`,
        {
          employee_id: selectedEmployee._id,
          abs_no: selectedEmployee.ABS_NO,
          patient
        }
      );
  
      alert("✅ Visit Registered Successfully");
  
      setSearch("");
      setSelectedEmployee(null);
      setIsFamily(false);
      setFamilyMembers([]);
      setSelectedFamily(null);
      setSymptoms("");
    } catch (err) {
      alert("❌ Failed to register visit");
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
    <div className="container mt-5">
      <div className="col-md-6 mx-auto">
        <div className="card shadow">
          <div className="card-header bg-dark text-white">
            Register Visit
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
                onChange={e => setIsFamily(e.target.checked)}
                disabled={!selectedEmployee}
              />
              <label className="form-check-label">
                Register for family member
              </label>
            </div>

            {/* FAMILY DROPDOWN */}
            {isFamily && familyMembers.length > 0 && (
              <div className="mt-3">
                <label className="fw-semibold">Family Member</label>
                <select
                  className="form-select"
                  value={selectedFamily?._id || ""}
                  onChange={e =>
                    setSelectedFamily(
                      familyMembers.find(f => f._id === e.target.value)
                    )
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

            {isFamily && familyMembers.length === 0 && (
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

            {/* SUBMIT */}
            <button
              className="btn btn-dark w-100 mt-4"
              onClick={registerVisit}
              disabled={loading}
            >
              {loading ? "Registering..." : "Register Visit"}
            </button>
          </div>
        </div>
        {/* ================= PATIENT INFO CARD ================= */}
        {selectedEmployee && !isFamily && (
  <div className="card mt-3 border-success">
    <div className="card-header bg-success text-white">
      Employee Details
    </div>

    <div className="card-body">
      {/* ===== PHOTO (enable later) ===== */}
      {
      <div className="d-flex justify-content-center mb-3">
      <img
        src={`http://localhost:${BACKEND_PORT}${selectedEmployee.Photo}`}
        alt="Employee"
        style={{
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid #198754"
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
          <p><strong>Height:</strong> {selectedEmployee.Height}</p>
          <p><strong>Weight:</strong> {selectedEmployee.Weight}</p>
          <p><strong>Phone:</strong> {selectedEmployee.Phone_No}</p>
        </div>
      </div>
    </div>
  </div>
)}


{isFamily && selectedFamily && (
  <div className="card mt-3 border-primary">
    <div className="card-header bg-primary text-white">
      Family Member Details
    </div>

    <div className="card-body">
      {/* ===== PHOTO (enable later) ===== */}
      {/*
      <div className="text-center mb-3">
        <img
          src={`http://localhost:${BACKEND_PORT}${selectedFamily.Photo}`}
          alt="Family Member"
          className="rounded-circle"
          width="120"
          height="120"
        />
      </div>
      */}

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
          <p><strong>Height:</strong> {selectedFamily.Height}</p>
          <p><strong>Weight:</strong> {selectedFamily.Weight}</p>
        </div>
      </div>
    </div>
  </div>
)}


      </div>
    </div>
  );
};

export default VisitRegister;
