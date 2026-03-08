import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import PatientSelector from "../institutes/PatientSelector";

const DoctorPrescriptionForm = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [lastTwoVisits, setLastTwoVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [instituteName, setInstituteName] = useState("");
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [diseases, setDiseases] = useState([]);
  const [visitId, setVisitId] = useState(null);
  const [testsMaster, setTestsMaster] = useState([]);
  const [diagnosisData, setDiagnosisData] = useState({
    Tests: [{ Test_ID: "", Test_Name: "" }]
  });
  const [employeeReport, setEmployeeReport] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [uniqueMedicines, setUniqueMedicines] = useState([]);
const [xrayMaster, setXrayMaster] = useState([]);
const [xrayData, setXrayData] = useState({
  Xrays: [{ Xray_ID: "", Xray_Type: "" }]
});

  
  
  const communicableDiseases = [
    "Tuberculosis",
    "Malaria",
    "Dengue",
    "COVID-19",
    "Cholera",
    "Typhoid",
    "Hepatitis A",
    "Hepatitis B",
    "Influenza",
    "Chickenpox",
  ];
  
  const nonCommunicableDiseases = [
    "Diabetes",
    "Hypertension",
    "Asthma",
    "Cancer",
    "Heart Disease",
    "Arthritis",
    "Kidney Disease",
    "Migraine",
    "Obesity",
    "Stroke",
  ];
  
  const [diseaseData, setDiseaseData] = useState({
    Category: "Communicable",
    Disease_Name: "",
    Severity_Level: "Mild"
  });
  
  const [showOtherDiseaseInput, setShowOtherDiseaseInput] = useState(false);
  
  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Medicines: [{ Medicine_Name: "", Dosage: "", Duration: "" }],
    Notes: "",
    Disease_Name: "" 
  });
  const formatDateDMY = (value) => {
    if (!value) return "—";

    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
  };

 const loadEmployeeReports = async () => {
  if (!formData.Employee_ID) {
    alert("No employee selected");
    return;
  }
  

  try {
    const res = await axios.get(
      `http://localhost:${BACKEND_PORT}/employee-api/health-report-detailed`,
      {
        params: {
          employeeId: formData.Employee_ID,
          isFamily: formData.IsFamilyMember,
          familyMemberId: formData.IsFamilyMember
            ? formData.FamilyMember_ID
            : null
        }
      }
    );
    console.log(res.data);

    setEmployeeReport(res.data);
    setDiseases(res.data.diseases || []);
    setShowReports(true);

  } catch (err) {
    console.error(err);
    alert("Unable to fetch reports");
  }
};
  useEffect(() => {
    axios
      .get(`http://localhost:${BACKEND_PORT}/diagnosis-api/tests`)
      .then(res => setTestsMaster(res.data || []))
      .catch(() => setTestsMaster([]));
  }, []);
  
useEffect(() => {
  axios
    .get(`http://localhost:${BACKEND_PORT}/xray-api/types`)
    .then(res => setXrayMaster(res.data || []))
    .catch(() => setXrayMaster([]));
}, []);


  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    if (!formData.Institute_ID) return;
  
    axios
      .get(`http://localhost:${BACKEND_PORT}/institute-api/inventory/${formData.Institute_ID}`)
      .then(res => {
        const inventory = res.data || [];
  
        const grouped = {};
  
        inventory.forEach(med => {
          const name = med.Medicine_Name;
  
          // Remove only trailing numbers like " 200ml"
          const base = name.replace(/\s\d+.*$/, "").trim().toLowerCase();
  
          if (!grouped[base]) {
            grouped[base] = name.replace(/\s\d+.*$/, "").trim();
          }
        });
  
        setUniqueMedicines(Object.values(grouped));
      })
      .catch(() => setUniqueMedicines([]));
  
  }, [formData.Institute_ID]);
  
  
  useEffect(() => {
    const instituteId = localStorage.getItem("instituteId");
    if (!instituteId) return;

    setFormData((f) => ({ ...f, Institute_ID: instituteId }));
    fetchInstitute(instituteId);
    // fetchEmployees();
    // fetchInventory(instituteId);
  }, []);
  const fetchTopTwoPrescriptions = async (employeeId, familyId = null) => {
    try {
  
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT}/prescription-api/employee/${employeeId}`
      );
  

      let data = res.data || [];
  
      // 🔥 FILTER PROPERLY HERE
      if (familyId) {
        data = data.filter(p =>
          p.IsFamilyMember &&
          String(p.FamilyMember?._id) === String(familyId)
        );
      } else {
        data = data.filter(p => !p.IsFamilyMember);
      }
  
      // 🔥 SORT USING Timestamp (NOT createdAt)
      data.sort(
        (a, b) => new Date(b.Timestamp) - new Date(a.Timestamp)
      );
  
      setLastTwoVisits(data.slice(0, 2));
  
    } catch (err) {
      console.error(err);
      setLastTwoVisits([]);
    }
  };
  /* ================= API CALLS ================= */
  const fetchInstitute = async (id) => {
    const res = await axios.get(
      `http://localhost:${BACKEND_PORT}/institute-api/institution/${id}`
    );
    setInstituteName(res.data?.Institute_Name || "");
  };


  const fetchDiseases = async (employeeId) => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT}/disease-api/employee/${employeeId}`
      );
      setDiseases(reportRes.data.employeeDiseases);
    } catch {
      setDiseases([]);
    }
  };


  useEffect(() => {
    if (!formData.Employee_ID) return;

    axios
      .get(
        `http://localhost:${BACKEND_PORT}/employee-api/profile/${formData.Employee_ID}`
      )
      .then((res) => setEmployeeProfile(res.data))
      .catch(() => setEmployeeProfile(null));
  }, [formData.Employee_ID]);


  /* ================= DISEASE FILTER ================= */
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

const relevantDiseases = diseases.filter((d) => {
  if (formData.IsFamilyMember) {
    return (
      d.IsFamilyMember === true &&
      String(d.FamilyMember_ID) === String(formData.FamilyMember_ID)
    );
  }

  return d.IsFamilyMember === false;
});

  const communicableRecent = relevantDiseases.filter(
    (d) =>
      d.Category === "Communicable" &&
      new Date(d.createdAt) >= twoMonthsAgo
  );

  const addMedicine = () =>
    setFormData((prev) => ({
      ...prev,
      Medicines: [
        ...prev.Medicines,
        { Medicine_Name: "", Dosage: "", Duration: "" }
      ]
    }));

  const removeMedicine = (index) =>
    setFormData((prev) => ({
      ...prev,
      Medicines: prev.Medicines.filter((_, i) => i !== index)
    }));

    
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.Employee_ID) {
      alert("Please select an employee");
      return;
    }

    if (formData.IsFamilyMember && !formData.FamilyMember_ID) {
      alert("Please select a family member");
      return;
    }



    const selectedMedicines = formData.Medicines
      .filter((med) => med.Medicine_Name?.trim())
      .map((med) => ({
        Medicine_Name: med.Medicine_Name,
        Dosage: med.Dosage,
        Duration: med.Duration
      }));

    for (let med of selectedMedicines) {
      if (!uniqueMedicines.includes(med.Medicine_Name)) {
        alert("Invalid medicine selected. Please choose from list.");
        return;
      }
    }
    

    await axios.post(`http://localhost:${BACKEND_PORT}/api/medical-actions`, {
      Institute_ID: formData.Institute_ID,
      employee_id: formData.Employee_ID,
      visit_id: formData.visit_id || null,
      action_type: "DOCTOR_PRESCRIPTION",
      source: "DOCTOR",
      data: {
        IsFamilyMember: formData.IsFamilyMember,
        FamilyMember_ID: formData.IsFamilyMember
          ? formData.FamilyMember_ID
          : null,
          medicines: selectedMedicines.map(m => ({
            Medicine_Name: m.Medicine_Name,
            Dosage: m.Dosage,
            Duration: m.Duration
          })),
        notes: formData.Notes
      }
    });

    // ✅ Save Disease (if selected)
    if (diseaseData.Disease_Name?.trim()) {
      await axios.post(
  `http://localhost:${BACKEND_PORT}/disease-api/diseases`,
  {
    Institute_ID: formData.Institute_ID,
    Employee_ID: formData.Employee_ID,
    IsFamilyMember: formData.IsFamilyMember,
    FamilyMember_ID: formData.IsFamilyMember
      ? formData.FamilyMember_ID
      : null,
    Disease_Name: diseaseData.Disease_Name,
    Category: diseaseData.Category,
    Description: "",
    Symptoms: [],
    Common_Medicines: [],
    Severity_Level: diseaseData.Severity_Level,
    Notes: formData.Notes
  }
);

    }


    alert("✅ Prescription saved successfully");
  };

 
  

  const handleDiagnosisSubmit = async () => {
    if (!formData.Employee_ID) {
      alert("Please select employee first");
      return;
    }
  
    if (diagnosisData.Tests.length === 0) {
      alert("Please add at least one test");
      return;
    }
  
    await axios.post(`http://localhost:${BACKEND_PORT}/api/medical-actions`, {
      employee_id: formData.Employee_ID,
      visit_id: formData.visit_id || null,
      action_type: "DOCTOR_DIAGNOSIS",
      source: "DOCTOR",
      data: {
        Institute_ID: formData.Institute_ID,
        IsFamilyMember: formData.IsFamilyMember,
        FamilyMember_ID: formData.IsFamilyMember
          ? formData.FamilyMember_ID
          : null,
        tests: diagnosisData.Tests,
        notes: formData.Notes   // 🔥 SAME NOTES USED
      }
    });
  
    alert("✅ Diagnosis saved successfully");
  
    setDiagnosisData({
      Tests: [{ Test_ID: "", Test_Name: "" }]
    });
  };
  
const handleXraySubmit = async () => {
  if (!formData.Employee_ID) {
    alert("Please select employee first");
    return;
  }

  if (xrayData.Xrays.length === 0) {
    alert("Please add at least one X-ray");
    return;
  }

  await axios.post(
    `http://localhost:${BACKEND_PORT}/api/medical-actions`,
    {
      employee_id: formData.Employee_ID,
      visit_id: formData.visit_id || null,
      action_type: "DOCTOR_XRAY",
      source: "DOCTOR",
      data: {
        Institute_ID: formData.Institute_ID,
        IsFamilyMember: formData.IsFamilyMember,
        FamilyMember_ID: formData.IsFamilyMember
          ? formData.FamilyMember_ID
          : null,
        xrays: xrayData.Xrays,
        notes: formData.Notes
      }
    }
  );

  alert("✅ X-ray order saved");

  setXrayData({
    Xrays: [{ Xray_ID: "", Xray_Type: "" }]
  });
};


  /* ================= UI ================= */
  return (
    <div className="container-fluid mt-4">
      <div className="row justify-content-center">
        {/* ================= LEFT REPORTS ================= */}
        {showReports && (
          <div className="col-lg-3 mb-3">
            <div className="card shadow border-0 h-100">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <strong>Employee Reports</strong>

                {/* 🔥 Cancel Button */}
                <button
                  className="btn btn-sm btn-light"
                  onClick={() => setShowReports(false)}
                >
                  ✕
                </button>
              </div>
                <div
                  className="card-body"
                  style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
                  {/* ================= DISEASES SECTION ================= */}

                  <h6 className="fw-bold text-dark mb-3">Diseases</h6>

                  {(() => {
                    const allDiseases = employeeReport?.diseases || [];

                    const twoWeeksAgo = new Date();
                    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

                    const nonCommunicable = allDiseases.filter(
                      d => d.Category === "Non-Communicable"
                    );

                    const communicableRecent = allDiseases.filter(
                      d =>
                        d.Category === "Communicable" &&
                        new Date(d.createdAt) >= twoWeeksAgo
                    );

                    return (
                      <>
                        {/* Non Communicable First */}
                        {nonCommunicable.map((d, index) => (
                          <div key={`nc-${index}`} className="border-bottom pb-2 mb-2">
                            <div className="fw-semibold text-secondary">
                              {d.Disease_Name}
                            </div>
                            <small className="text-muted">
                              {new Date(d.createdAt).toLocaleDateString("en-GB")}
                            </small>
                            <div>
                              <span className="badge bg-info mt-1">
                                {d.Severity_Level}
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* Communicable (Last 2 Weeks Only) */}
                        {communicableRecent.map((d, index) => (
                          <div key={`c-${index}`} className="border-bottom pb-2 mb-2">
                            <div className="fw-semibold text-danger">
                              {d.Disease_Name}
                            </div>
                            <small className="text-muted">
                              {new Date(d.createdAt).toLocaleDateString("en-GB")}
                            </small>
                            <div>
                              <span className="badge bg-danger mt-1">
                                {d.Severity_Level}
                              </span>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}

                  <hr className="my-4" />

                  {/* ================= TESTS SECTION ================= */}

 <h6 className="fw-bold text-dark mb-3">Recent Tests</h6>

{(() => {
  const diagnosisActions =
    employeeReport?.medicalActions?.filter(
      a => a.action_type === "DOCTOR_DIAGNOSIS"
    ) || [];

  const tests = diagnosisActions.flatMap(
    a => a.data?.tests || []
  );

  return tests.length > 0 ? (
    tests.slice(0, 5).map((test, index) => (
      <div key={index} className="border-bottom pb-2 mb-3">
        <div className="fw-semibold">
          {test?.Test_Name || "Unknown Test"}
        </div>
        <div>
          Result: {test?.Result_Value || "Pending"}
        </div>
      </div>
    ))
  ) : (
    <div className="text-muted">No tests available</div>
  );
})()}
                </div>

            </div>
          </div>
        )}

        {/* FORM */}
        <div
            className={`mb-3 ${
              showReports ? "col-lg-6" : "col-lg-9"
            }`}
            style={{ transition: "all 0.4s ease" }}
          >

          <div className="card shadow border-0">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Doctor Prescription</h5>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Institute</label>
                  <input className="form-control" value={instituteName} readOnly />
                </div>


                <PatientSelector
                  instituteId={formData.Institute_ID}
                  onSelect={({ employee, visit }) => {

                    setSelectedEmployee(employee);
                    setSelectedVisit(visit); 
                    const isFamily = visit?.IsFamilyMember || false;
                    const familyId = visit?.FamilyMember?._id || null;

                    setFormData(prev => ({
                      ...prev,
                      Employee_ID: employee._id,
                      visit_id: visit?._id || null,
                      IsFamilyMember: isFamily,
                      FamilyMember_ID: familyId
                    }));

                    // 🔥 AUTO NOTES
                    if (visit) {
                      const vitals = visit.Vitals || {};

                      const autoNotes = `
                Symptoms: ${visit.symptoms || "-"}

                Vitals:
                Temperature: ${vitals.Temperature || "-"}
                BP: ${vitals.Blood_Pressure || "-"}
                Pulse: ${vitals.Pulse || "-"}
                Oxygen: ${vitals.Oxygen || "-"}
                GRBS: ${vitals.GRBS || "-"}
                      `;

                      setFormData(prev => ({
                        ...prev,
                        Notes: autoNotes
                      }));
                    }

                    // 🔥 FETCH HISTORY CORRECTLY
                    fetchTopTwoPrescriptions(employee._id, familyId);
                  }}
                />
                {selectedVisit && (
                  <div className="alert alert-info mt-3 d-flex justify-content-between align-items-center">
                    <div>
                      <strong>
                        Token {selectedVisit.token_no} —
                      </strong>{" "}
                      {selectedVisit.IsFamilyMember
                        ? `${selectedVisit.FamilyMember?.Name} (${selectedVisit.FamilyMember?.Relationship})`
                        : selectedVisit.employee_id?.Name}
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-dark"
                      onClick={loadEmployeeReports}
                    >
                      View Reports
                    </button>
                  </div>
                )}

                {communicableRecent.length > 0 && (
                  <div className="alert alert-warning">
                    <strong>Disease History (Reference Only)</strong>
                    <ul className="mb-0 mt-2">
                      {communicableRecent.map((d, i) => (
                        <li key={i}>{d.Disease_Name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <h6 className="fw-bold mt-4">Medicines</h6>

                {formData.Medicines.map((med, i) => (
  <div key={i} className="mb-3">
    <div className="row g-2 align-items-end">

      <div className="col-md-4">
        <label className="form-label">Medicine</label>
        <select
          className="form-select"
          value={med.Medicine_Name}
          onChange={(e) => {
            const copy = [...formData.Medicines];
            copy[i].Medicine_Name = e.target.value;
            setFormData(prev => ({ ...prev, Medicines: copy }));
          }}
        >
          <option value="">Select Medicine</option>

          {uniqueMedicines.map((name, idx) => (
            <option key={idx} value={name}>
              {name}
            </option>
          ))}
        </select>


      </div>

      <div className="col-md-3">
        <label className="form-label">Dosage</label>
        <input
          type="text"
          className="form-control"
          placeholder="1-0-1"
          value={med.Dosage}
          onChange={(e) => {
            const copy = [...formData.Medicines];
            copy[i].Dosage = e.target.value;
            setFormData(prev => ({ ...prev, Medicines: copy }));
          }}
        />
      </div>

      <div className="col-md-3">
        <label className="form-label">Duration</label>
        <input
          type="text"
          className="form-control"
          placeholder="5 days"
          value={med.Duration}
          onChange={(e) => {
            const copy = [...formData.Medicines];
            copy[i].Duration = e.target.value;
            setFormData(prev => ({ ...prev, Medicines: copy }));
          }}
        />
      </div>

      <div className="col-md-2">
        <button
          type="button"
          className="btn btn-outline-danger w-100"
          onClick={() => removeMedicine(i)}
        >
          ✕
        </button>
      </div>

    </div>
  </div>
))}

                <button
                  type="button"
                  className="btn btn-outline-primary mt-2"
                  onClick={addMedicine}
                >
                  + Add Medicine
                </button>

                <hr className="my-4" />
<h6 className="fw-bold">Disease</h6>

<div className="row g-3 mt-2">

  {/* Category */}
  <div className="col-md-4">
    <label className="form-label fw-semibold">Category</label>
    <select
      className="form-select"
      value={diseaseData.Category}
      onChange={(e) => {
        setDiseaseData(prev => ({
          ...prev,
          Category: e.target.value,
          Disease_Name: ""
        }));
        setShowOtherDiseaseInput(false);
      }}
    >
      <option value="Communicable">Communicable</option>
      <option value="Non-Communicable">Non-Communicable</option>
    </select>
  </div>

  {/* Disease Name */}
  <div className="col-md-4">
    <label className="form-label fw-semibold">Disease Name</label>
    <select
      className="form-select"
      value={diseaseData.Disease_Name}
      onChange={(e) => {
        if (e.target.value === "Other") {
          setShowOtherDiseaseInput(true);
          setDiseaseData(prev => ({ ...prev, Disease_Name: "" }));
        } else {
          setShowOtherDiseaseInput(false);
          setDiseaseData(prev => ({
            ...prev,
            Disease_Name: e.target.value
          }));
        }
      }}
    >
      <option value="">Select Disease</option>
      {(diseaseData.Category === "Communicable"
        ? communicableDiseases
        : nonCommunicableDiseases
      ).map((d, i) => (
        <option key={i} value={d}>{d}</option>
      ))}
      <option value="Other">Other</option>
    </select>
  </div>

  {/* Severity */}
  <div className="col-md-4">
    <label className="form-label fw-semibold">Severity</label>
    <select
      className="form-select"
      value={diseaseData.Severity_Level}
      onChange={(e) =>
        setDiseaseData(prev => ({
          ...prev,
          Severity_Level: e.target.value
        }))
      }
    >
      <option>Mild</option>
      <option>Moderate</option>
      <option>Severe</option>
      <option>Chronic</option>
    </select>
  </div>
</div>

{/* Other Disease Input */}
{showOtherDiseaseInput && (
  <div className="mt-3">
    <input
      className="form-control"
      placeholder="Enter disease name"
      value={diseaseData.Disease_Name}
      onChange={(e) =>
        setDiseaseData(prev => ({
          ...prev,
          Disease_Name: e.target.value
        }))
      }
    />
  </div>
)}


                <div className="mt-3">
                  <label className="form-label fw-semibold">Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.Notes}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, Notes: e.target.value }))
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-dark w-100 mt-4"
                //   disabled={Object.values(medicineErrors).some(
                //     (msg) => msg.startsWith("❌")
                //   )}
                >
                  Submit Prescription
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-3">

  {/* Previous 2 Prescriptions */}
  {lastTwoVisits.length > 0 && (
    <div className="card shadow border-0 mb-3">
      <div className="card-header bg-secondary text-white">
        <strong>Previous 2 Prescriptions</strong>
      </div>

      <div className="card-body">
        {lastTwoVisits.map((p, idx) => {
          const formattedDate = p.Timestamp
            ? new Date(p.Timestamp).toLocaleDateString("en-GB")
            : "-";

          return (
            <div key={idx} className="mb-3 border-bottom pb-2">
              <div className="fw-semibold mb-2">
                {formattedDate}
              </div>
              <ul className="small mb-2">
                {p.Medicines?.map((m, i) => (
                  <li key={i}>{m.Medicine_Name}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  )}

  {/* 🔥 ADD A TEST CARD */}
  <div className="card shadow border-0">
    <div className="card-header bg-dark text-white">
      <strong>Add a Test</strong>
    </div>


    <div className="card-body">

      {diagnosisData.Tests.map((t, i) => (
        <div key={i} className="mb-2">

          <select
            className="form-select mb-2"
            value={t.Test_ID}
            onChange={(e) => {
              const selected = testsMaster.find(
                test => test._id === e.target.value
              );

              const copy = [...diagnosisData.Tests];
              copy[i] = {
                Test_ID: selected?._id || "",
                Test_Name: selected?.Test_Name || ""
              };

              setDiagnosisData(prev => ({
                ...prev,
                Tests: copy
              }));
            }}
          >
            <option value="">Select Test</option>
            {testsMaster.map(test => (
              <option key={test._id} value={test._id}>
                {test.Test_Name}
              </option>
            ))}
          </select>

          {diagnosisData.Tests.length > 1 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger w-100"
              onClick={() => {
                const copy = diagnosisData.Tests.filter((_, idx) => idx !== i);
                setDiagnosisData(prev => ({
                  ...prev,
                  Tests: copy
                }));
              }}
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        className="btn btn-outline-primary w-100 mt-2"
        onClick={() =>
          setDiagnosisData(prev => ({
            ...prev,
            Tests: [...prev.Tests, { Test_ID: "", Test_Name: "" }]
          }))
        }
      >
        + Add Test
      </button>

      <button
        type="button"
        className="btn btn-success w-100 mt-3"
        onClick={handleDiagnosisSubmit}
      >
        Submit Test
      </button>

    </div>
  </div>
  {/* ADD AN XRAY CARD */}
<div className="card shadow border-0 mt-3">
  <div className="card-header bg-dark text-white">
    <strong>Add an X-ray</strong>
  </div>

  <div className="card-body">

    {xrayData.Xrays.map((x, i) => (
      <div key={i} className="mb-2">

        <select
          className="form-select mb-2"
          value={x.Xray_ID}
          onChange={(e) => {
            const selected = xrayMaster.find(
              xr => xr._id === e.target.value
            );

            const copy = [...xrayData.Xrays];
            copy[i] = {
              Xray_ID: selected?._id || "",
              Xray_Type: selected?.Xray_Type || ""
            };

            setXrayData(prev => ({
              ...prev,
              Xrays: copy
            }));
          }}
        >
          <option value="">Select X-ray</option>
          {xrayMaster.map(xr => (
            <option key={xr._id} value={xr._id}>
              {xr.Xray_Type} ({xr.Body_Part})
            </option>
          ))}
        </select>

        {xrayData.Xrays.length > 1 && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger w-100"
            onClick={() => {
              const copy = xrayData.Xrays.filter(
                (_, idx) => idx !== i
              );
              setXrayData(prev => ({
                ...prev,
                Xrays: copy
              }));
            }}
          >
            Remove
          </button>
        )}
      </div>
    ))}

    <button
      type="button"
      className="btn btn-outline-primary w-100 mt-2"
      onClick={() =>
        setXrayData(prev => ({
          ...prev,
          Xrays: [
            ...prev.Xrays,
            { Xray_ID: "", Xray_Type: "" }
          ]
        }))
      }
    >
      + Add X-ray
    </button>

    <button
      type="button"
      className="btn btn-success w-100 mt-3"
      onClick={handleXraySubmit}
    >
      Submit X-ray
    </button>

  </div>
</div>

</div>

      </div>
    </div>
  );
};

export default DoctorPrescriptionForm;