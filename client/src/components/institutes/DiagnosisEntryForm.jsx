import React, { useEffect, useState } from "react";
import axios from "axios";
import PatientSelector from "../institutes/PatientSelector";

const DiagnosisEntryForm = () => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [testsMaster, setTestsMaster] = useState([]);
  const [doctorDiagnosis, setDoctorDiagnosis] = useState([]);
  // const [searchTerm, setSearchTerm] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [loading, setLoading] = useState(false);
  const [visitId, setVisitId] = useState(null);
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
      `http://localhost:${BACKEND_PORT_NO}/api/medical-actions/visit/${visitId}`
    );

    const actions = res.data || [];

    // store all doctor diagnosis (raw)
    setDoctorDiagnosis(
      actions.filter(
        a =>
          a.action_type === "DOCTOR_DIAGNOSIS" &&
          a.source === "DOCTOR"
      )

    );
  } catch (err) {
    console.error("Failed to fetch doctor diagnosis", err);
    setDoctorDiagnosis([]);
  }
};


  // useEffect(() => {
  // if (doctorDiagnosis.length > 0) {
  //   const testsFromDoctor = doctorDiagnosis[0].data.tests.map(t => ({
  //     Test_ID: t.Test_ID || "",
  //     Test_Name: t.Test_Name,
  //     Result_Value: "",
  //     Reference_Range: t.Reference_Range || "",
  //     Units: t.Units || ""
  //   }));

//     setFormData(prev => ({
//       ...prev,
//       Tests: testsFromDoctor
//     }));
//   }
// }, [doctorDiagnosis]);

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

  // const fetchEmployees = async () => {
  //   try {
  //     const res = await axios.get(`http://localhost:${BACKEND_PORT_NO}/employee-api/all`);
  //     const employeesData = res.data?.employees || res.data || [];
  //     setEmployees(employeesData);
  //     console.log("Employees fetched:", employeesData.length);
  //   } catch (err) {
  //     console.error("Error fetching employees:", err);
  //     // Try alternative endpoint
  //     try {
  //       const altRes = await axios.get(`http://localhost:${BACKEND_PORT_NO}/employee-api/employees`);
  //       setEmployees(altRes.data || []);
  //     } catch (altErr) {
  //       console.error("Alternative endpoint also failed:", altErr);
  //     }
  //   }
  // };

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
  // useEffect(() => {
  //   if (!searchTerm.trim()) return setFilteredEmployees([]);
  //   const q = searchTerm.toLowerCase();
  //   setFilteredEmployees(
  //     employees.filter(e => 
  //       String(e.ABS_NO || "").toLowerCase().startsWith(q) ||
  //       String(e.Name || "").toLowerCase().includes(q)
  //     )
  //   );
  // }, [searchTerm, employees]);

  // Fetch family members - FIXED VERSION
  useEffect(() => {
    const fetchFamily = async () => {
      if (!formData.Employee_ID) {
        setFamilyMembers([]);
        return;
      }
      
      setLoading(true);
      try {
        console.log("Fetching family for employee ID:", formData.Employee_ID);
        
        // Method 1: Direct family API
        const res = await axios.get(`http://localhost:${BACKEND_PORT_NO}/family-api/family/${formData.Employee_ID}`);
        
        console.log("Family API response:", res.data);
        
        if (res.data && res.data.length > 0) {
          setFamilyMembers(res.data);
        } else {
          // Method 2: Try through employee endpoint
          console.log("No direct family found, checking employee profile...");
          const employeeRes = await axios.get(
            `http://localhost:${BACKEND_PORT_NO}/employee-api/profile/${formData.Employee_ID}`
          );
          
          if (employeeRes.data?.FamilyMembers && employeeRes.data.FamilyMembers.length > 0) {
            // Fetch details for each family member
            const familyDetails = await Promise.all(
              employeeRes.data.FamilyMembers.map(async (memberId) => {
                try {
                  const memberRes = await axios.get(
                    `http://localhost:${BACKEND_PORT_NO}/family-api/member/${memberId}`
                  );
                  return memberRes.data;
                } catch (err) {
                  console.error(`Error fetching family member ${memberId}:`, err);
                  return null;
                }
              })
            );
            
            const validMembers = familyDetails.filter(m => m !== null);
            setFamilyMembers(validMembers);
          } else {
            setFamilyMembers([]);
          }
        }
      } catch (err) {
        console.error("Error fetching family members:", err);
        setFamilyMembers([]);
        
        // Try debug endpoint
        try {
          const debugRes = await axios.get(`http://localhost:${BACKEND_PORT_NO}/debug/family-data`);
          console.log("Debug family data:", debugRes.data);
        } catch (debugErr) {
          console.error("Debug endpoint failed:", debugErr);
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (formData.Employee_ID) {
      fetchFamily();
    } else {
      setFamilyMembers([]);
    }
  }, [formData.Employee_ID]);

  // const handleEmployeeSelect = (emp) => {
  //   console.log("Selected employee:", emp);
  //   setFormData(prev => ({ ...prev, Employee_ID: emp._id }));
  //   // setSearchTerm(emp.ABS_NO || "");
  //   // setFilteredEmployees([]);
  // };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: checked,
      ...(name === "IsFamilyMember" && !checked ? { FamilyMember_ID: "" } : {})
    }));
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
          IsFamilyMember: false, 
          FamilyMember_ID: "", 
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

  return (
    <div style={{ 
      maxWidth: 800, 
      margin: "40px auto", 
      padding: 30, 
      background: "#fff", 
      borderRadius: 12, 
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)" 
    }}>
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
          onSelect={({ employee, visit_id }) => {
            setVisitId(visit_id);
            setFormData(prev => ({
              ...prev,
              Employee_ID: employee._id,
              IsFamilyMember: false,
              FamilyMember_ID: ""
            }));
            if (visit_id) {
              fetchDoctorDiagnosis(visit_id);
            }
          }}
        />
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

        {/* Family Member Checkbox */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              name="IsFamilyMember"
              checked={formData.IsFamilyMember} 
              onChange={handleCheckboxChange} 
              style={{ marginRight: 10, transform: "scale(1.2)" }} 
            /> 
            <span style={{ fontWeight: "bold", color: "#555" }}>Diagnosis for Family Member?</span>
          </label>
        </div>

        {/* Family Member Select */}
        {formData.IsFamilyMember && (
          <div style={{ marginBottom: 25 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold", color: "#555" }}>Select Family Member</label>
            <select 
              value={formData.FamilyMember_ID} 
              onChange={e => setFormData(prev => ({ ...prev, FamilyMember_ID: e.target.value }))} 
              required={formData.IsFamilyMember}
              disabled={loading}
              style={{ 
                width: "100%", 
                padding: "10px 12px", 
                borderRadius: 8, 
                border: "1px solid #ddd",
                backgroundColor: loading ? "#f5f5f5" : "white"
              }}
            >
              <option value="">{loading ? "Loading family members..." : "Select Family Member"}</option>
              {familyMembers.length === 0 && !loading && (
                <option value="" disabled>No family members registered</option>
              )}
              {familyMembers.map(f => (
                <option key={f._id} value={f._id}>
                  {f.Name} ({f.Relationship || "Family"}) {f.DOB ? ` - DOB: ${formatDateDMY(new Date(f.DOB))}` : ""}
                </option>
              ))}
            </select>
            
            {familyMembers.length === 0 && formData.Employee_ID && !loading && (
              <div style={{ fontSize: "12px", color: "#666", marginTop: 6 }}>
                This employee has no registered family members. Register family members first.
              </div>
            )}
          </div>
        )}

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
  );
};

export default DiagnosisEntryForm;