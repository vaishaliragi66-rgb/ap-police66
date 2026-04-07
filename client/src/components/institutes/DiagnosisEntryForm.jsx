import React, { useEffect, useState } from "react";
import axios from "axios";
import PatientSelector from "../institutes/PatientSelector";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import diagnosticTestsByCategory from "../../data/diagnosticTests";

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
    Tests: [{ Category: "", Test_ID: "", Test_Name: "", Result_Value: "", Reference_Range: "", Units: "",ReportFile: null }],
    Diagnosis_Notes: ""
  });

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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
      `${BACKEND_URL}/diagnosis-api/visit/${visitId}/doctor`
    );

    setDoctorDiagnosis(res.data?.tests || []);

  } catch (err) {
    console.error("Failed to fetch doctor diagnosis", err);
    setDoctorDiagnosis([]);
  }
};


useEffect(() => {

  if (!doctorDiagnosis || doctorDiagnosis.length === 0) {
    setFormData(prev => ({
      ...prev,
      Tests: [{
        Category: "",
        Test_ID: "",
        Test_Name: "",
        Result_Value: "",
        Reference_Range: "",
        Units: "",
        ReportFile: null
      }]
    }));
    return;
  }

  const populatedTests = doctorDiagnosis.map(t => {

    const master = testsMaster.find(m => m._id === t.Test_ID);

    return {
      Category: "",
      Test_ID: t.Test_ID || "",
      Test_Name: t.Test_Name || "",
      Result_Value: "",
      Reference_Range: master?.Reference_Range || "",
      Units: master?.Units || "",
    ReportFile: null
    };

  });

  setFormData(prev => ({
    ...prev,
    Tests: populatedTests
  }));

}, [doctorDiagnosis, testsMaster]);

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
      const res = await axios.get(`${BACKEND_URL}/institute-api/institution/${id}`);
      setInstituteName(res.data?.Institute_Name || "");
    } catch (err) {
      console.error("Error fetching institute name:", err);
    }
  };



const fetchTests = async () => {
  try {
    const res = await axios.get(
      `${BACKEND_URL}/diagnosis-api/tests`
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
          ...updated[index],
          Test_ID: sel._id,
          Test_Name: sel.Test_Name,
          Reference_Range: sel.Reference_Range || "",
          Units: sel.Units || "",
          ReportFile: updated[index].ReportFile || null
        };
      }
    } else if (field === "Category") {
      // set category and clear test selection when category changes
      updated[index] = {
        ...updated[index],
        Category: value,
        Test_ID: "",
        Test_Name: "",
        Reference_Range: "",
        Units: ""
      };
    } else if (field === "Test_Name") {
      const cat = updated[index].Category;
      const list = cat && diagnosticTestsByCategory[cat] ? diagnosticTestsByCategory[cat] : [];
      const found = list.find(x => x.name === value);
      if (found) {
        updated[index] = {
          ...updated[index],
          Test_Name: found.name,
          Reference_Range: found.reference || "",
          Units: found.unit || ""
        };
      } else {
        updated[index] = { ...updated[index], Test_Name: value };
      }
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }

    return {
      ...prev,
      Tests: updated
    };

  });
};

const addTest = () =>
  setFormData(prev => ({
    ...prev,
    Tests: [
      ...prev.Tests,
      {
          Category: "",
          Test_ID: "",
          Test_Name: "",
          Result_Value: "",
          Reference_Range: "",
          Units: "",
          ReportFile: null
      }
    ]
  }));
  
  const removeTest = (i) => setFormData(prev => ({ 
    ...prev, 
    Tests: prev.Tests.filter((_, idx) => idx !== i) 
  }));

  const handleSubmit = async (e) => {

  e.preventDefault();

  const fd = new FormData();

  fd.append("Institute_ID", formData.Institute_ID);
  fd.append("Employee_ID", formData.Employee_ID);
  fd.append("IsFamilyMember", formData.IsFamilyMember);
  fd.append("FamilyMember_ID", formData.FamilyMember_ID || "");
  fd.append("Diagnosis_Notes", formData.Diagnosis_Notes || "");
  fd.append("visit_id", visitId || "");

  fd.append("Tests", JSON.stringify(formData.Tests));

  formData.Tests.forEach((t) => {

    if (t.ReportFile) {
      fd.append("reports", t.ReportFile);
    }

  });

  try {

    await axios.post(
      `${BACKEND_URL}/diagnosis-api/add`,
      fd,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );

    alert("✅ Diagnosis record saved successfully");

  } catch (err) {

    console.error(err);
    alert("❌ Failed to save diagnosis");

  }

};
  const handlePrint = () => {
    const section = document.getElementById("diagnosis-print-section");
    if (!section) return;

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Diagnosis / Lab Test Entry</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            button { display: none !important; }
          </style>
        </head>
        <body>${section.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

const filteredDoctorDiagnosis = (doctorDiagnosis || []).filter(d => {
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
    `${BACKEND_URL}/visit-api/visit/${visitId}`
  );
  return res.data;
};
const fetchPastRecords = async () => {
  if (!formData.Employee_ID) return;

  try {
    const res = await axios.get(
      `${BACKEND_URL}/diagnosis-api/records/${formData.Employee_ID}?isFamily=${formData.IsFamilyMember}&familyId=${formData.FamilyMember_ID}`
    );
    console.log("Diagnosis Records:", res.data); 

    setPastRecords(res.data || []);
    setShowHistory(true);   // 👈 open modal
  } catch (err) {
    console.error("Error fetching past records:", err);
  }
};


  return (
   
       <div className="container-fluid mt-2">
      {/* Back Button */}
      <button
        className="btn mb-3"
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
        ← Back
      </button>
      <div className="row justify-content-center">
        {/* ================= HISTORY PANEL ================= */}
        {showHistory && (
          <div className="col-lg-4 mb-3">
            <div className="card shadow border-0 h-100">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <strong>📊 Test History</strong>
                <button
                  className="btn btn-sm btn-light"
                  onClick={() => setShowHistory(false)}
                >
                  ✕
                </button>
              </div>
              <div
                className="card-body"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                {!pastRecords || pastRecords.length === 0 ? (
                  <div className="text-muted text-center py-4">
                    📭 No previous records found.
                  </div>
                ) : (
                  pastRecords.map((record, index) => (
                    <div
                      key={record._id || index}
                      className="border-bottom pb-3 mb-3"
                    >
                      <div className="text-muted small mb-2">
                        📅 Date: {record?.createdAt ? formatDateDMY(record.createdAt) : "—"}
                      </div>
                      {record?.Tests?.length > 0 ? (
                        record.Tests.map((t, i) => {

                          const reports = t.Reports || [];

                          return (
                            <div key={i} className="mb-2 p-2 bg-light rounded">

                              <div className="fw-semibold text-dark">
                                {t?.Test_Name || "Test"}
                              </div>

                              <small className="text-muted">
                                Result: {t?.Result_Value || "N/A"}
                                {t?.Units && ` ${t.Units}`}
                              </small>

                              {t?.Reference_Range && (
                                <div className="small text-secondary mt-1">
                                  Ref Range: {t.Reference_Range}
                                </div>
                              )}

                              {/* ✅ REPORT BUTTON IN SAME BLOCK */}
                              {reports.length > 0 && (
                                <div className="mt-2">
                                  {reports.map((r, ri) => (
                                    <a
                                      key={ri}
                                      href={`${BACKEND_URL}${r.url}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-sm btn-outline-primary me-2"
                                    >
                                      📄 View Report
                                    </a>
                                  ))}
                                </div>
                              )}

                            </div>
                          );

                        })
                      ) : (
                        <div className="text-muted small">
                          No test details available
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= FORM ================= */}
        <div
          className={`mb-3 ${showHistory ? "col-lg-8" : "col-lg-10"}`}
          style={{ transition: "all 0.4s ease" }}
        >
          <div className="card shadow border-0">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">🏥 Diagnosis / Lab Test Entry</h5>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={handlePrint}
              >
                🖨️ Print
              </button>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Institute */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">🏥 Institute</label>
                  <input
                    className="form-control"
                    value={instituteName || "Loading..."}
                    readOnly
                  />
                </div>

                {/* Patient Selector */}
                <div className="mb-4">
                  <PatientSelector
                    instituteId={formData.Institute_ID}
                    onlyDiagnosisQueue={true}
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
                </div>

                {/* Selected Patient Info */}
                {selectedEmployee && (
                  <div className="alert alert-info mb-4">
                    <div className="row">
                      <div className="col-md-6">
                        <strong>👨 Employee:</strong> {selectedEmployee.Name}
                      </div>
                      <div className="col-md-3">
                        <strong>ID:</strong> {selectedEmployee.ABS_NO}
                      </div>
                      {tokenNumber && (
                        <div className="col-md-3">
                          <strong>🎫 Token:</strong> {tokenNumber}
                        </div>
                      )}
                    </div>
                    {formData.IsFamilyMember && selectedFamilyMember && (
                      <div className="row mt-2">
                        <div className="col-md-6">
                          <strong>👨‍👩‍👧 Family Member:</strong> {selectedFamilyMember.Name}
                        </div>
                        <div className="col-md-6">
                          <strong>Relation:</strong> {selectedFamilyMember.Relationship}
                        </div>
                      </div>
                    )}
                    <div className="mt-3">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={fetchPastRecords}
                      >
                        📄 View History
                      </button>
                    </div>
                  </div>
                )}

                {/* Doctor Diagnosis Reference */}
                {filteredDoctorDiagnosis.length > 0 && (
                  <div className="alert alert-warning mb-4">
                    <h6 className="alert-heading">👨‍⚕️ Doctor Diagnosis (Reference)</h6>
                    {filteredDoctorDiagnosis.map((d, i) => (
                      <div key={i} className="mt-2">

                        <ul className="mb-2">
                          {(d.data?.tests || []).map((t, idx) => (
                            <li key={idx}>{t.Test_Name}</li>
                          ))}
                        </ul>

                        {d.data?.notes && (
                          <div className="small text-muted">
                            Notes: {d.data.notes}
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}

                {/* Tests Section */}
                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">
                    🧪 Tests
                  </h6>

                  {testsMaster.length === 0 ? (
                    <div className="alert alert-warning">
                      <strong>⚠️ No tests available</strong>
                      <div className="small mt-1">
                        Add tests to the master list first.
                      </div>
                    </div>
                  ) : (
                    <>
                      {formData.Tests.map((t, i) => (
                        <div
                          key={i}
                          className="border rounded p-3 mb-3 bg-light"
                        >
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="mb-0">Test #{i + 1}</h6>
                            {formData.Tests.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => removeTest(i)}
                              >
                                🗑️ Remove
                              </button>
                            )}
                          </div>

                          <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold">Category</label>
                                <select
                                  className="form-select"
                                  value={t.Category || ""}
                                  onChange={e => handleTestChange(i, "Category", e.target.value)}
                                >
                                  <option value="">Select Category</option>
                                  {Object.keys(diagnosticTestsByCategory).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                            </div>

                            <div className="col-md-6">
                              <label className="form-label fw-semibold">Test Name</label>
                                <select
                                  className="form-select"
                                  value={t.Test_Name || ""}
                                  onChange={e => handleTestChange(i, "Test_Name", e.target.value)}
                                  disabled={!t.Category}
                                >
                                  <option value="">Select Test</option>
                                  {(
                                    t.Category && diagnosticTestsByCategory[t.Category]
                                      ? diagnosticTestsByCategory[t.Category]
                                      : []
                                  ).map(testObj => (
                                    <option key={testObj.name} value={testObj.name}>{testObj.name}</option>
                                  ))}
                                </select>
                            </div>

                            <div className="col-md-6">
                              <label className="form-label fw-semibold">Result</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Result (e.g., 14.2)"
                                value={t.Result_Value}
                                onChange={e => handleTestChange(i, "Result_Value", e.target.value)}
                              />
                            </div>

                            <div className="col-md-3">
                              <label className="form-label fw-semibold">Reference Range</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Ref Range"
                                value={t.Reference_Range}
                                onChange={e => handleTestChange(i, "Reference_Range", e.target.value)}
                              />
                            </div>

                            <div className="col-md-3">
                              <label className="form-label fw-semibold">Units</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Units"
                                value={t.Units}
                                onChange={e => handleTestChange(i, "Units", e.target.value)}
                              />
                            </div>
                            <div className="col-md-12">
                              <label className="form-label fw-semibold">
                                Upload Report
                              </label>
                              <input
                                type="file"
                                className="form-control"
                                onChange={(e)=>
                                  handleTestChange(
                                    i,
                                    "ReportFile",
                                    e.target.files[0]
                                  )
                                }
                              />
                            </div>
                          </div>


                          {(t.Reference_Range || t.Units) && (
                            <div className="mt-2 p-2 bg-info bg-opacity-10 rounded small">
                              {t.Reference_Range && <span><strong>Ref Range:</strong> {t.Reference_Range} </span>}
                              {t.Units && <span><strong>Units:</strong> {t.Units}</span>}
                            </div>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        className="btn btn-outline-success me-2"
                        onClick={addTest}
                      >
                        ➕ Add Another Test
                      </button>
                    </>
                  )}
                </div>

                {/* Diagnosis Notes */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">📝 Diagnosis Notes</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Enter diagnosis notes, observations, or comments..."
                    value={formData.Diagnosis_Notes}
                    onChange={e => setFormData(prev => ({ ...prev, Diagnosis_Notes: e.target.value }))}
                  />
                </div>

                {/* Submit Button */}
                <div className="text-center">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg px-5"
                  >
                    💾 Save Diagnosis Record
                  </button>
                </div>
              </form>

              {/* Hidden Print Section */}
              <div id="diagnosis-print-section" style={{ display: "none" }}>
                <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
                  🏥 Diagnosis / Lab Test Entry Report
                </h2>
                
                <div style={{ marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "15px" }}>
                  <h4>Institute Information</h4>
                  <p><strong>Institute Name:</strong> {instituteName || "N/A"}</p>
                </div>

                {selectedEmployee && (
                  <div style={{ marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "15px" }}>
                    <h4>Patient Information</h4>
                    <p><strong>Employee Name:</strong> {selectedEmployee.Name || "N/A"}</p>
                    <p><strong>ABS No:</strong> {selectedEmployee.ABS_NO || "N/A"}</p>
                    {tokenNumber && <p><strong>Token Number:</strong> {tokenNumber}</p>}
                    {formData.IsFamilyMember && selectedFamilyMember && (
                      <>
                        <p><strong>Family Member:</strong> {selectedFamilyMember.Name || "N/A"}</p>
                        <p><strong>Relationship:</strong> {selectedFamilyMember.Relationship || "N/A"}</p>
                      </>
                    )}
                  </div>
                )}

                {formData.Tests.length > 0 && (
                  <div style={{ marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "15px" }}>
                    <h4>Tests</h4>
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f0f0f0", borderBottom: "2px solid #333" }}>
                          <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Test Name</th>
                          <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Result</th>
                          <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Reference Range</th>
                          <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Units</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.Tests.map((t, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{t.Test_Name || "N/A"}</td>
                            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{t.Result_Value || "N/A"}</td>
                            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{t.Reference_Range || "N/A"}</td>
                            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{t.Units || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {formData.Diagnosis_Notes && (
                  <div style={{ marginBottom: "20px" }}>
                    <h4>Diagnosis Notes</h4>
                    <p style={{ whiteSpace: "pre-wrap" }}>{formData.Diagnosis_Notes}</p>
                  </div>
                )}

                <div style={{ marginTop: "30px", textAlign: "center", color: "#666", fontSize: "12px" }}>
                  <p>Generated on: {new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisEntryForm;
