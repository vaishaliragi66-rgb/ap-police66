import React, { useEffect, useState } from "react";
import axios from "axios";
import PatientSelector from "../institutes/PatientSelector";
import { useNavigate } from "react-router-dom";

const DiagnosisEntryForm = () => {
  const [testsMaster, setTestsMaster] = useState([]);
  const [doctorDiagnosis, setDoctorDiagnosis] = useState([]);
  // const [searchTerm, setSearchTerm] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [loading, setLoading] = useState(false);
  const [visitId, setVisitId] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const navigate = useNavigate();
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null);
const [selectedEmployee, setSelectedEmployee] = useState(null);
const [pastRecords, setPastRecords] = useState([]);
const [showHistory, setShowHistory] = useState(false);
const [tokenNumber, setTokenNumber] = useState(null);


  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Tests: [{ Test_ID: "", Test_Name: "", Result_Value: "", Reference_Range: "", Units: "" }],
    Diagnosis_Notes: ""
  });

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

const fetchDoctorDiagnosis = async (visitId) => {
  try {
    const res = await axios.get(
      `http://localhost:${BACKEND_PORT_NO}/diagnosis-api/visit/${visitId}/doctor`
    );

    setDoctorDiagnosis(res.data ? [res.data] : []);
  } catch (err) {
    console.error("Failed to fetch doctor diagnosis", err);
    setDoctorDiagnosis([]);
  }
};


useEffect(() => {
  if (doctorDiagnosis.length === 0) {
    // reset to single empty row
    setFormData(prev => ({
      ...prev,
      Tests: [{
        Test_ID: "",
        Test_Name: "",
        Result_Value: "",
        Reference_Range: "",
        Units: ""
      }]
    }));
    return;
  }

  // 🧠 get latest doctor prescription
  const latestPrescription = doctorDiagnosis[0]; 

  const latestTests = (latestPrescription.data?.tests || []).map(t => ({
    Test_ID: t.Test_ID || "",
    Test_Name: t.Test_Name || "",
    Result_Value: "",
    Reference_Range: t.Reference_Range || "",
    Units: t.Units || "",
    Remarks: ""
  }));

  setFormData(prev => ({
    ...prev,
    Tests: latestTests.length > 0 ? latestTests : [{
      Test_ID: "",
      Test_Name: "",
      Result_Value: "",
      Reference_Range: "",
      Units: ""
    }]
  }));

}, [doctorDiagnosis]);



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



const fetchTests = async () => {
  try {
    const res = await axios.get(
      `http://localhost:${BACKEND_PORT_NO}/diagnosis-api/tests`
    );

    setTestsMaster(res.data || []);
    console.log("Tests fetched:", res.data?.length);
  } catch (err) {
    console.error("Error fetching tests:", err);
  }
};




  const handleTestChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.Tests];
      if (field === "Test_ID") {
        const sel = testsMaster.find(t => t._id === value);
        if (sel) {
          updated[index] = {
            Test_ID: sel._id,
            Test_Name: sel.Test_Name,
            Result_Value: "",
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
      Result_Value: "", 
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
      if (!test.Result_Value || test.Result_Value.trim() === "") {
        alert(`Result value is required for test #${i + 1}`);
        return;
      }
    }

    // const payload = {
    //   Institute_ID: formData.Institute_ID,
    //   Employee_ID: formData.Employee_ID,
    //   IsFamilyMember: formData.IsFamilyMember,
    //   FamilyMember_ID: formData.IsFamilyMember ? formData.FamilyMember_ID : null,
    //   Tests: formData.Tests.map(t => ({
    //     Test_ID: t.Test_ID || null,
    //     Test_Name: t.Test_Name,
    //     Result_Value: t.Result_Value,
    //     Reference_Range: t.Reference_Range || "",
    //     Units: t.Units || "",
    //     Remarks: t.Remarks || ""
    //   })),
    //   Diagnosis_Notes: formData.Diagnosis_Notes || ""
    // };

    // console.log("Submitting payload:", payload);

    try {
      await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/diagnosis-api/add`,
        {
          Institute_ID: formData.Institute_ID,
          Employee_ID: formData.Employee_ID,
          IsFamilyMember: formData.IsFamilyMember,
          FamilyMember_ID: formData.IsFamilyMember
            ? formData.FamilyMember_ID
            : null,
          Tests: formData.Tests.map(t => ({
            Test_ID: t.Test_ID,
            Test_Name: t.Test_Name,
            Result_Value: t.Result_Value,
            Reference_Range: t.Reference_Range,
            Units: t.Units
          })),
          Diagnosis_Notes: formData.Diagnosis_Notes,
          visit_id: visitId
        }
      );
        alert("✅ Diagnosis record saved successfully!");
        
        // Reset form (keep institute ID)
        setFormData(prev => ({ 
          ...prev,
          Employee_ID: "",
          Tests: [{
            Test_ID: "",
            Test_Name: "",
            Result_Value: "",
            Reference_Range: "",
            Units: ""
          }],
          Diagnosis_Notes: ""
        }));
        // setSearchTerm("");
        setFamilyMembers([]);
        setVisitId(null);
      } catch (err) {
        console.error("Error saving diagnosis:", err?.response?.data || err);
        alert("❌ Error saving diagnosis: " + (err?.response?.data?.message || err?.message || "Server error"));
      }
    };

const filteredDoctorDiagnosis = doctorDiagnosis.filter(d => {
  const isFamily =
    d.data?.is_family_member ??
    d.data?.IsFamilyMember ??
    false;

  const familyId =
    d.data?.family_member_id ??
    d.data?.FamilyMember_ID ??
    null;

  // Employee self
  if (!formData.IsFamilyMember) {
    return isFamily === false;
  }

  // Family member
  return isFamily === true && familyId === formData.FamilyMember_ID;
});

const fetchVisitDetails = async (visitId) => {
  const res = await axios.get(
    `http://localhost:${BACKEND_PORT_NO}/visit-api/visit/${visitId}`
  );
  return res.data;
};
const fetchPastRecords = async () => {
  if (!formData.Employee_ID) return;

  try {
    const res = await axios.get(
      `http://localhost:${BACKEND_PORT_NO}/diagnosis-api/records/${formData.Employee_ID}?isFamily=${formData.IsFamilyMember}&familyId=${formData.FamilyMember_ID}`
    );

    setPastRecords(res.data || []);
    setShowHistory(true);   // 👈 open modal
  } catch (err) {
    console.error("Error fetching past records:", err);
  }
};




  return (
<div style={{ display: "flex", position: "relative" }}>

    {/* FORM SIDE */}
    <div
      style={{
        width: showHistory ? "65%" : "100%",
        transition: "0.3s ease",
        padding: "40px",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 30, color: "#333" }}>🏥 Diagnosis / Lab Test Entry</h2>
      
      <form onSubmit={handleSubmit} autoComplete="off">
        {/* Institute */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: "bold", color: "#555" }}>Institute</label>
          <input 
            type="text" 
            value={instituteName || "Loading..."} 
            readOnly 
            style={{ 
              width: "100%", 
              padding: "10px 12px", 
              borderRadius: 8, 
              border: "1px solid #ddd",
              backgroundColor: "#f9f9f9" 
            }} 
          />
        </div>

        {/* Employee Search */}
<PatientSelector
  instituteId={formData.Institute_ID}
  onSelect={({ employee, visit }) => {
console.log("VISIT OBJECT:", visit);

    const vId = visit?._id || null;
const token = visit?.token_no || visit?.Token_Number || null;
    setVisitId(vId);
    setTokenNumber(token);

    setSelectedFamilyMember(
      visit?.IsFamilyMember ? visit.FamilyMember : null
    );

    setSelectedEmployee(employee);

    setFormData(prev => ({
      ...prev,
      Employee_ID: employee._id,
      IsFamilyMember: Boolean(visit?.IsFamilyMember),
      FamilyMember_ID: visit?.IsFamilyMember
        ? visit.FamilyMember?._id
        : ""
    }));

    // 🔥 THIS IS THE IMPORTANT PART
    if (vId) {
      fetchDoctorDiagnosis(vId);
    }

  }}
/>

{selectedEmployee && (
  <div
    style={{
      marginBottom: 20,
      padding: "14px",
      backgroundColor: "#eef6ff",
      borderRadius: "8px",
      border: "1px solid #cfe2ff"
    }}
  >
    <div><strong>Employee Name:</strong> {selectedEmployee.Name}</div>
    <div><strong>ABS No:</strong> {selectedEmployee.ABS_NO}</div>
    {tokenNumber && (
  <div><strong>Token Number:</strong> {tokenNumber}</div>
)}

    {formData.IsFamilyMember && selectedFamilyMember && (
      <>
        <div><strong>Family Member:</strong> {selectedFamilyMember.Name}</div>
        <div><strong>Relationship:</strong> {selectedFamilyMember.Relationship}</div>
      </>
    )}
<button
  type="button"
  onClick={fetchPastRecords}
  style={{
    marginTop: "10px",
    padding: "8px 16px",
    background: "linear-gradient(135deg, #2563eb, #1e40af)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    boxShadow: "0 4px 10px rgba(37, 99, 235, 0.3)",
    transition: "0.2s ease"
  }}
  onMouseEnter={(e) =>
    (e.target.style.transform = "translateY(-2px)")
  }
  onMouseLeave={(e) =>
    (e.target.style.transform = "translateY(0)")
  }
>
  📄 View History
</button>


  </div>
)}





{formData.IsFamilyMember && selectedFamilyMember && (
  <div style={{ marginTop: 10 }}>
    <strong>Family Member:</strong> {selectedFamilyMember.Name} ({selectedFamilyMember.Relationship})
  </div>
)}


        {filteredDoctorDiagnosis.length > 0 && (
          <div style={{
            marginBottom: 20,
            padding: 12,
            backgroundColor: "#eef6ff",
            borderRadius: 8,
            border: "1px solid #cfe2ff"
          }}>
            <strong>Doctor Diagnosis (Reference)</strong>

            {filteredDoctorDiagnosis.map((d, i) => (
              <div key={i} style={{ marginTop: 8 }}>
                <ul style={{ marginBottom: 4 }}>
                  {d.data.tests.map((t, idx) => (
                    <li key={idx}>
                      {t.Test_Name}
                    </li>
                  ))}
                </ul>

                {d.data.notes && (
                  <div style={{ fontSize: 12, color: "#555" }}>
                    Notes: {d.data.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* {formData.Employee_ID && (
          <div style={{ 
            marginBottom: 20, 
            padding: "12px", 
            backgroundColor: "#e8f5e9", 
            borderRadius: "8px",
            border: "1px solid #c8e6c9"
          }}>
            <div style={{ fontSize: "13px", color: "#2e7d32" }}>
              <strong>Selected Employee:</strong> {
                employees.find(e => e._id === formData.Employee_ID)?.Name || "Unknown"
              } (ABS_NO: {
                employees.find(e => e._id === formData.Employee_ID)?.ABS_NO || "N/A"
              })
            </div>
          </div>
        )} */}

        {/* Tests Section */}
        <div style={{ marginBottom: 30 }}>
          <h4 style={{ 
            marginBottom: 20, 
            color: "#333", 
            borderBottom: "2px solid #eee", 
            paddingBottom: 10 
          }}>
            Tests
          </h4>
          
          {testsMaster.length === 0 ? (
            <div style={{ 
              padding: "15px", 
              backgroundColor: "#fff8e1", 
              borderRadius: "8px", 
              border: "1px solid #ffecb3", 
              marginBottom: 20 
            }}>
              <div style={{ color: "#ff6f00", fontWeight: "bold" }}>⚠️ No tests available</div>
              <div style={{ fontSize: "13px", color: "#666", marginTop: 5 }}>
                Add tests to the master list first.
              </div>
            </div>
          ) : (
            <>
              {formData.Tests.map((t, i) => (
                <div key={i} style={{ 
                  marginBottom: 20, 
                  padding: "15px", 
                  backgroundColor: "#f8f9fa", 
                  borderRadius: "8px",
                  border: "1px solid #e9ecef"
                }}>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1fr 1fr 1fr auto", 
                    gap: "10px", 
                    alignItems: "center" 
                  }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: 4 }}>Test Selection</div>
                      <select 
                        value={t.Test_ID || ""} 
                        onChange={e => handleTestChange(i, "Test_ID", e.target.value)} 
                        style={{ 
                          width: "100%", 
                          padding: "8px 10px", 
                          borderRadius: "6px", 
                          border: "1px solid #ddd" 
                        }}
                      >
                        <option value="">Select Test (or type below)</option>
                        {testsMaster.map(tm => (
                          <option key={tm._id} value={tm._id}>
                            {tm.Test_Name} {tm.Group ? `(${tm.Group})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: 4 }}>Test Name</div>
                      <input 
                        type="text" 
                        placeholder="Test Name" 
                        value={t.Test_Name} 
                        onChange={e => handleTestChange(i, "Test_Name", e.target.value)} 
                        style={{ 
                          width: "100%", 
                          padding: "8px 10px", 
                          borderRadius: "6px", 
                          border: "1px solid #ddd" 
                        }} 
                      />
                    </div>
                    
                    <div>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: 4 }}>Result</div>
                      <input 
                        type="text" 
                        placeholder="Result (e.g., 14.2)" 
                        value={t.Result_Value} 
                        onChange={e => handleTestChange(i, "Result_Value", e.target.value)} 
                        style={{ 
                          width: "100%", 
                          padding: "8px 10px", 
                          borderRadius: "6px", 
                          border: "1px solid #ddd" 
                        }} 
                      />
                    </div>
                    
                    {formData.Tests.length > 1 && (
                      <div style={{ alignSelf: "flex-end" }}>
                        <button 
                          type="button" 
                          onClick={() => removeTest(i)}
                          style={{ 
                            background: "#dc3545", 
                            color: "#fff", 
                            border: "none", 
                            borderRadius: "6px", 
                            padding: "8px 12px",
                            cursor: "pointer"
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {(t.Reference_Range || t.Units) && (
                    <div style={{ 
                      marginTop: 10, 
                      padding: "8px", 
                      backgroundColor: "#e7f3ff", 
                      borderRadius: "4px",
                      fontSize: "12px"
                    }}>
                      {t.Reference_Range && <span><strong>Ref Range:</strong> {t.Reference_Range} </span>}
                      {t.Units && <span><strong>Units:</strong> {t.Units}</span>}
                    </div>
                  )}
                </div>
              ))}
              
              <button 
                type="button" 
                onClick={addTest} 
                style={{ 
                  padding: "10px 16px", 
                  background: "#007bff", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                + Add Another Test
              </button>
            </>
          )}
        </div>

        {/* Diagnosis Notes */}
        <div style={{ marginBottom: 30 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: "bold", color: "#555" }}>Diagnosis Notes</label>
          <textarea 
            value={formData.Diagnosis_Notes} 
            onChange={e => setFormData(prev => ({ ...prev, Diagnosis_Notes: e.target.value }))} 
            placeholder="Enter diagnosis notes, observations, or comments..."
            rows={4} 
            style={{ 
              width: "100%", 
              padding: "12px", 
              borderRadius: "8px", 
              border: "1px solid #ddd",
              resize: "vertical" 
            }} 
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          style={{ 
            marginTop: 10, 
            width: "100%", 
            padding: "14px", 
            background: "#28a745", 
            color: "white", 
            border: "none", 
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "background-color 0.2s"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#218838"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#28a745"}
        >
          💾 Save Diagnosis Record
        </button>
      </form>
          </div>


      {showHistory && (
  <div
    style={{
      position: "fixed",
      top: 0,
      right: 0,
      height: "100vh",
      width: "40%",
      background: "#ffffff",
      boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
      padding: "25px",
      overflowY: "auto",
      zIndex: 2000,
      transition: "0.3s ease-in-out"
    }}
  >
    {/* Header */}
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center",
      marginBottom: 20 
    }}>
      <h3 style={{ margin: 0 }}>📊 Test History</h3>
      <button
        onClick={() => setShowHistory(false)}
        style={{
          background: "#dc3545",
          color: "#fff",
          border: "none",
          padding: "6px 10px",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        Close ✖
      </button>
    </div>

    {pastRecords.length === 0 ? (
      <div style={{ color: "#777" }}>No previous records found.</div>
    ) : (
      pastRecords.map((record, index) => (
        <div
          key={index}
          style={{
            marginBottom: 20,
            padding: 15,
            borderRadius: 10,
            background: "#f8f9fa",
            border: "1px solid #e0e0e0"
          }}
        >
          <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
            Date: {formatDateDMY(record.createdAt)}
          </div>

          {record.Tests.map((t, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <strong>{t.Test_Name}</strong> — {t.Result_Value}
              {t.Units && ` ${t.Units}`}
            </div>
          ))}

          {record.Diagnosis_Notes && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
              Notes: {record.Diagnosis_Notes}
            </div>
          )}
        </div>
      ))
    )}
  </div>
)}

    </div>
  );
};

export default DiagnosisEntryForm;