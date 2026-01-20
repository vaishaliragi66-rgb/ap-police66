import React, { useEffect, useState } from "react";
import axios from "axios";
import PatientSelector from "../institutes/PatientSelector";

const DoctorDiagnosisForm = () => {
//   const [employees, setEmployees] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [testsMaster, setTestsMaster] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
//   const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [instituteName, setInstituteName] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Tests: [{ Test_ID: "", Test_Name: "", Result_Value: null, Reference_Range: "", Units: "" }],
    Diagnosis_Notes: ""
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [visitId, setVisitId] = useState(null);

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || "6100";

  const formatDateDMY = (dateValue) => {
  if (!dateValue) return "—";

  const date = new Date(dateValue);
  if (isNaN(date)) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`; // ✅ DD-MM-YYYY
};

  useEffect(() => {
    const localInstituteId = localStorage.getItem("instituteId");
    if (localInstituteId) {
      setFormData((s) => ({ ...s, Institute_ID: localInstituteId }));
      fetchInstituteName(localInstituteId);
      fetchTests();
    } else {
      console.warn("No instituteId in localStorage");
    }
    // fetchEmployees();
  }, []);

  const fetchInstituteName = async (id) => {
    try {
      const res = await axios.get(`http://localhost:${BACKEND_PORT_NO}/institute-api/institution/${id}`);
      setInstituteName(res.data?.Institute_Name || "");
    } catch (err) {
      console.error("Error fetching institute name:", err);
    }
  };

//   const fetchEmployees = async () => {
//     try {
//       const res = await axios.get(`http://localhost:${BACKEND_PORT_NO}/employee-api/all`);
//       const employeesData = res.data?.employees || res.data || [];
//       setEmployees(employeesData);
//       console.log("Employees fetched:", employeesData.length);
//     } catch (err) {
//       console.error("Error fetching employees:", err);
//       // Try alternative endpoint
//       try {
//         const altRes = await axios.get(`http://localhost:${BACKEND_PORT_NO}/employee-api/employees`);
//         setEmployees(altRes.data || []);
//       } catch (altErr) {
//         console.error("Alternative endpoint also failed:", altErr);
//       }
//     }
//   };

  const fetchTests = async () => {
    try {
      const res = await axios.get(`http://localhost:${BACKEND_PORT_NO}/diagnosis-api/tests`);
      setTestsMaster(res.data || []);
      console.log("Tests fetched:", res.data?.length);
    } catch (err) {
      console.error("Error fetching tests:", err);
    }
  };

  // Filter employees
//   useEffect(() => {
//     if (!searchTerm.trim()) return setFilteredEmployees([]);
//     const q = searchTerm.toLowerCase();
//     setFilteredEmployees(
//       employees.filter(e => 
//         String(e.ABS_NO || "").toLowerCase().startsWith(q) ||
//         String(e.Name || "").toLowerCase().includes(q)
//       )
//     );
//   }, [searchTerm, employees]);

  const handleTestChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.Tests];
      if (field === "Test_ID") {
        const sel = testsMaster.find(t => t._id === value);
        if (sel) {
          updated[index] = {
            Test_ID: sel._id,
            Test_Name: sel.Test_Name,
            Result_Value: null,
            Reference_Range: sel.Reference_Range || "",
            Units: sel.Units || "",
            Remarks: ""
          };
        } else {
          updated[index] = { 
            ...updated[index], 
            Test_ID: value || "", 
            Test_Name: value ? updated[index].Test_Name : "" 
          };
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, Tests: updated };
    });
  };

  const addTest = () => setFormData(prev => ({ 
    ...prev, 
    Tests: [...prev.Tests, { 
      Test_ID: "", 
      Test_Name: "", 
      Result_Value: null, 
      Reference_Range: "", 
      Units: "" 
    }] 
  }));
  
  const removeTest = (i) => setFormData(prev => ({ 
    ...prev, 
    Tests: prev.Tests.filter((_, idx) => idx !== i) 
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.Institute_ID) {
      alert("Institute ID is missing");
      return;
    }
    
    if (!formData.Employee_ID) {
      alert("Please select an employee");
      return;
    }
    
    if (formData.Tests.length === 0) {
      alert("Please add at least one test");
      return;
    }
    
    // Validate each test
    for (let i = 0; i < formData.Tests.length; i++) {
      const test = formData.Tests[i];
      if (!test.Test_Name || test.Test_Name.trim() === "") {
        alert(`Test name is required for test #${i + 1}`);
        return;
      }
    }

    const payload = {
      Institute_ID: formData.Institute_ID,
      Employee_ID: formData.Employee_ID,
      IsFamilyMember: formData.IsFamilyMember,
      FamilyMember_ID: formData.IsFamilyMember ? formData.FamilyMember_ID : null,
      Tests: formData.Tests.map(t => ({
        Test_ID: t.Test_ID || null,
        Test_Name: t.Test_Name,
        Result_Value: t.Result_Value,
        Reference_Range: t.Reference_Range || "",
        Units: t.Units || "",
        Remarks: t.Remarks || ""
      })),
      Diagnosis_Notes: formData.Diagnosis_Notes || ""
    };

    console.log("Submitting payload:", payload);

    try {
      await axios.post(`http://localhost:${BACKEND_PORT_NO}/api/medical-actions`, {
        employee_id: formData.Employee_ID,
        visit_id: visitId,
        action_type: "DOCTOR_DIAGNOSIS",
        source: "DOCTOR",
        data: {
          Institute_ID: formData.Institute_ID,
          IsFamilyMember: formData.IsFamilyMember,
          FamilyMember_ID: formData.IsFamilyMember
            ? formData.FamilyMember_ID
            : null,
          tests: payload.Tests,
          notes: payload.Diagnosis_Notes
        }
      });

      alert("✅ Diagnosis record saved successfully!");
      
      // Reset form (keep institute ID)
      setFormData(prev => ({
        ...prev,
        Employee_ID: "",
        Tests: [{
          Test_ID: "",
          Test_Name: "",
          Result_Value: null,
          Reference_Range: "",
          Units: ""
        }],
        Diagnosis_Notes: ""
      }));
      setVisitId(null);

      setSearchTerm("");
      setFamilyMembers([]);
    } catch (err) {
      console.error("Error saving diagnosis:", err?.response?.data || err);
      alert("❌ Error saving diagnosis: " + (err?.response?.data?.message || err?.message || "Server error"));
    }
  };




  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f8fe" ,   // ❌ removed blue bg
        padding: "40px 16px"
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: 32,
          background: "#ffffff",
          borderRadius: 14,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
        }}
      >
        {/* HEADER */}
        <h2
          style={{
            textAlign: "center",
            marginBottom: 32,
            color: "#000",
            fontWeight: 700
          }}
        >
          🏥 Diagnosis / Lab Test Entry
        </h2>
  
        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Institute */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
                color: "#000"
              }}
            >
              Institute
            </label>
            <input
              type="text"
              value={instituteName || "Loading..."}
              readOnly
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "1px solid #ddd",
                backgroundColor: "#f9fafb"
              }}
            />
          </div>
  
          {/* Patient Selector */}
          <div style={{ marginBottom: 24 }}>
            <PatientSelector
              instituteId={formData.Institute_ID}
              onSelect={({ employee, visit_id }) => {
                setSelectedEmployee(employee);
                setVisitId(visit_id || null);
                setFormData(prev => ({
                  ...prev,
                  Employee_ID: employee._id,
                  IsFamilyMember: false,
                  FamilyMember_ID: ""
                }));
              }}
            />
          </div>
  
          {/* Selected Employee */}
          {formData.Employee_ID && (
            <div
              style={{
                marginBottom: 24,
                padding: "14px",
                borderRadius: 8,
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                fontSize: 14
              }}
            >
              <strong>Selected Employee:</strong>{" "}
              {selectedEmployee?.Name} (ABS_NO: {selectedEmployee?.ABS_NO})
            </div>
          )}
  
          {/* TESTS */}
          <h4
            style={{
              marginBottom: 16,
              color: "#000",
              fontWeight: 600,
              borderBottom: "2px solid #000",
              paddingBottom: 8
            }}
          >
            Tests
          </h4>
  
          {formData.Tests.map((t, i) => (
            <div
              key={i}
              style={{
                padding: 16,
                marginBottom: 16,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fafafa"
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr auto",
                  gap: 12,
                  alignItems: "end"
                }}
              >
                <div>
                  <label style={{ fontSize: 12, color: "#000", fontWeight: 600 }}>
                    Test Selection
                  </label>
                  <select
                    value={t.Test_ID || ""}
                    onChange={e =>
                      handleTestChange(i, "Test_ID", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: 6,
                      border: "1px solid #ccc"
                    }}
                  >
                    <option value="">Select Test</option>
                    {testsMaster.map(tm => (
                      <option key={tm._id} value={tm._id}>
                        {tm.Test_Name}
                      </option>
                    ))}
                  </select>
                </div>
  
                <div>
                  <label style={{ fontSize: 12, color: "#000", fontWeight: 600 }}>
                    Test Name
                  </label>
                  <input
                    type="text"
                    value={t.Test_Name}
                    onChange={e =>
                      handleTestChange(i, "Test_Name", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: 6,
                      border: "1px solid #ccc"
                    }}
                  />
                </div>
  
                {formData.Tests.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTest(i)}
                    style={{
                      padding: "10px 14px",
                      background: "#000",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer"
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
  
          <button
            type="button"
            onClick={addTest}
            style={{
              marginBottom: 28,
              padding: "12px 18px",
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer"
            }}
          >
            + Add Another Test
          </button>
  
          {/* NOTES */}
          <div style={{ marginBottom: 28 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
                color: "#000"
              }}
            >
              Diagnosis Notes
            </label>
            <textarea
              rows={4}
              value={formData.Diagnosis_Notes}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  Diagnosis_Notes: e.target.value
                }))
              }
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ccc"
              }}
            />
          </div>
  
          {/* SUBMIT */}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "16px",
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            💾 Save Diagnosis Record
          </button>
        </form>
      </div>
    </div>
  );
  
};

export default DoctorDiagnosisForm;