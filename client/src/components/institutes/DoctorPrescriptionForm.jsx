import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import PatientSelector from "../institutes/PatientSelector";
import { useNavigate } from "react-router-dom";

const DoctorPrescriptionForm = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const navigate = useNavigate();
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
  const [selectedDiagnosisReport, setSelectedDiagnosisReport] = useState(null);
  const [selectedXrayReport, setSelectedXrayReport] = useState(null); // { record, xray }
  const [uniqueMedicines, setUniqueMedicines] = useState([]);
const [xrayMaster, setXrayMaster] = useState([]);
const [xrayData, setXrayData] = useState({
  Xrays: [{ Xray_ID: "", Xray_Type: "" }]
});

const [diseaseSearch, setDiseaseSearch] = useState("");
const [filteredDiseases, setFilteredDiseases] = useState([]);

const [diseaseMaster, setDiseaseMaster] = useState([]);
const [cdDiseases, setCdDiseases] = useState([]);
const [ncdDiseases, setNcdDiseases] = useState([]);
const [selectedType, setSelectedType] = useState("");
const [selectedSubgroup, setSelectedSubgroup] = useState("");
  
  
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


  const currentDiseaseList =
  diseaseData.Category === "Communicable"
    ? communicableDiseases
    : nonCommunicableDiseases;
  
  const [showOtherDiseaseInput, setShowOtherDiseaseInput] = useState(false);
  
  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Medicines: [{ Medicine_Name: "", Dosage: "", Duration: "", Quantity: 0 }],
    Notes: "",
    Disease_Name: "" 
  });
  
  const calculateQuantity = (dosage, duration) => {
    if (!dosage || !duration) return 0;

    // Example dosage: "1-0-2"
    const parts = dosage.split("-").map(n => Number(n) || 0);
    const perDay = parts.reduce((a, b) => a + b, 0);

    // Example duration: "3 days" or just "3"
    const daysMatch = duration.match(/\d+/);
    const days = daysMatch ? Number(daysMatch[0]) : 0;

    return perDay * days;
  };
  const formatDateDMY = (value) => {
    if (!value) return "—";

    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
  };

  const getReportStatus = (value) => {
    if (!value) return "pending";

    return String(value).trim().toUpperCase() === "PENDING"
      ? "pending"
      : "result out";
  };

  const getDiagnosisReportDate = (record) => {
    const latestTest = [...(record?.Tests || [])].sort(
      (a, b) => new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0)
    )[0];

    return latestTest?.Timestamp || record?.updatedAt || record?.createdAt || null;
  };

  const getXrayReportDate = (record) => {
    const latestXray = [...(record?.Xrays || [])].sort(
      (a, b) => new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0)
    )[0];

    return latestXray?.Timestamp || record?.updatedAt || record?.createdAt || null;
  };

  const buildVisitNotes = (visitSummary) => {
    if (!visitSummary) return "";

    const vitals = visitSummary.vitals || {};
    const noteParts = [
      visitSummary.symptoms ? `Symptoms: ${visitSummary.symptoms}` : "",
      vitals.Temperature != null && vitals.Temperature !== ""
        ? `Temperature: ${vitals.Temperature}`
        : "",
      vitals.Blood_Pressure
        ? `BP: ${vitals.Blood_Pressure}`
        : "",
      vitals.Pulse != null && vitals.Pulse !== ""
        ? `Pulse: ${vitals.Pulse}`
        : "",
      vitals.Oxygen != null && vitals.Oxygen !== ""
        ? `Oxygen: ${vitals.Oxygen}`
        : "",
      vitals.Sugar != null && vitals.Sugar !== ""
        ? `Sugar: ${vitals.Sugar}`
        : "",
      vitals.GRBS != null && vitals.GRBS !== ""
        ? `GRBS: ${vitals.GRBS}`
        : ""
    ].filter(Boolean);

    return noteParts.join(" | ");
  };

 const loadEmployeeReports = async () => {
  if (!formData.Employee_ID) {
    alert("No employee selected");
    return;
  }
  

  try {
    const params = {
      isFamily: formData.IsFamilyMember,
      familyId: formData.IsFamilyMember ? formData.FamilyMember_ID : null
    };

    const [diseaseRes, diagnosisRes, xrayRes] = await Promise.all([
      axios.get(
        `http://localhost:${BACKEND_PORT}/disease-api/employee/${formData.Employee_ID}`
      ),
      axios.get(
        `http://localhost:${BACKEND_PORT}/diagnosis-api/records/${formData.Employee_ID}`,
        { params }
      ),
      axios.get(
        `http://localhost:${BACKEND_PORT}/xray-api/records/${formData.Employee_ID}`,
        { params }
      )
    ]);

    const allDiseases =
  diseaseData.Category === "Communicable"
    ? cdDiseases
    : ncdDiseases;

    const filteredDiseases = allDiseases.filter((disease) => {
      if (formData.IsFamilyMember) {
        return (
          disease.IsFamilyMember === true &&
          String(disease.FamilyMember_ID?._id || disease.FamilyMember_ID) ===
            String(formData.FamilyMember_ID)
        );
      }

      return disease.IsFamilyMember === false;
    });

    const reportPayload = {
      diseases: filteredDiseases,
      diagnosisRecords: diagnosisRes.data || [],
      xrayRecords: xrayRes.data || []
    };

    setEmployeeReport(reportPayload);
    setDiseases(filteredDiseases);
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

  useEffect(() => {
    axios.get(`http://localhost:${BACKEND_PORT}/disease-master-api/cd`)
      .then(res => setCdDiseases(res.data || []))
      .catch(() => setCdDiseases([]));
  
    axios.get(`http://localhost:${BACKEND_PORT}/disease-master-api/ncd`)
      .then(res => setNcdDiseases(res.data || []))
      .catch(() => setNcdDiseases([]));
  }, []);

  const allDiseases = [...cdDiseases, ...ncdDiseases];

  useEffect(() => {
  if (!diseaseSearch.trim()) {
    setFilteredDiseases([]);
    return;
  }

  const search = diseaseSearch.toLowerCase();

  const source =
    diseaseData.Category === "Communicable"
      ? cdDiseases
      : ncdDiseases;

  const filtered = source.filter(d => {
    return (
      d.name?.toLowerCase().includes(search) ||
      d.type?.toLowerCase().includes(search) ||
      d.subgroup?.toLowerCase().includes(search)
    );
  });

  setFilteredDiseases(filtered.slice(0, 20));

}, [diseaseSearch, cdDiseases, ncdDiseases, diseaseData.Category]);


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
        { Medicine_Name: "", Dosage: "", Duration: "", Quantity: 0 }
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
        Duration: med.Duration,
        Quantity: med.Quantity
      }));

    for (let med of selectedMedicines) {
      if (!uniqueMedicines.includes(med.Medicine_Name)) {
        alert("Invalid medicine selected. Please choose from list.");
        return;
      }
    }
    
if (selectedMedicines.length === 0) {
  alert("Please add at least one medicine");
  return;
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
            Duration: m.Duration,
            Quantity: m.Quantity
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
  
  const validTests = diagnosisData.Tests.filter(t => t.Test_ID);

if (validTests.length === 0) {
  alert("Please select at least one test");
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

 const validXrays = xrayData.Xrays.filter(x => x.Xray_ID);

if (validXrays.length === 0) {
  alert("Please select at least one X-ray");
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
    
    <div className="container-fluid mt-1">
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
  const diagnosisRecords = employeeReport?.diagnosisRecords || [];
  const recentTests = diagnosisRecords
    .flatMap(record =>
      (record?.Tests || []).map((test, index) => ({
        key: `${record._id}-${test.Test_ID?._id || test.Test_ID || index}`,
        record,
        test,
        reportDate: test?.Timestamp || getDiagnosisReportDate(record)
      }))
    )
    .sort(
      (a, b) => new Date(b.reportDate || 0) - new Date(a.reportDate || 0)
    )
    .slice(0, 5);

  return recentTests.length > 0 ? (
    recentTests.map(({ key, record, test, reportDate }) => {
      const status = getReportStatus(test?.Result_Value);
      const visitNotes = buildVisitNotes(record?.visitSummary);

      return (
        <div key={key} className="border-bottom pb-2 mb-3">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div className="fw-semibold">
                {test?.Test_Name || test?.Test_ID?.Test_Name || "Unknown Test"}
              </div>
              <small className="text-muted">
                {formatDateDMY(reportDate)}
              </small>
            </div>
            <span className={`badge ${status === "result out" ? "bg-success" : "bg-warning text-dark"}`}>
              {status}
            </span>
          </div>

          <div className="small mt-2">
            Result: {status === "result out" ? `${test?.Result_Value || "-"} ${test?.Units || test?.Test_ID?.Units || ""}`.trim() : "Pending"}
          </div>

          {visitNotes && (
            <div className="small text-muted mt-1">
              Notes: {visitNotes}
            </div>
          )}

          {test?.Reports && test.Reports.length > 0 ? (
            test.Reports.map((r, ri) => (
              <a
                key={ri}
                href={`http://localhost:${BACKEND_PORT}${r.url}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-outline-dark mt-2 me-2"
              >
                View Report
              </a>
            ))
          ) : (
            <button
              className="btn btn-sm btn-outline-secondary mt-2"
              disabled
            >
              No Report
            </button>
          )}
        </div>
      );
    })
  ) : (
    <div className="text-muted">No tests available</div>
  );
})()}

                  <hr className="my-4" />

                  <h6 className="fw-bold text-dark mb-3">Recent X-rays</h6>

{(() => {
  const xrayRecords = employeeReport?.xrayRecords || [];
  const recentXrays = xrayRecords
    .flatMap(record =>
      (record?.Xrays || []).map((xray, index) => ({
        key: `${record._id}-${xray.Xray_ID || xray.Xray_Type || index}`,
        record,
        xray,
        reportDate: xray?.Timestamp || getXrayReportDate(record)
      }))
    )
    .sort(
      (a, b) => new Date(b.reportDate || 0) - new Date(a.reportDate || 0)
    )
    .filter(({ xray }) => {
      // only show xrays where results are out
      const status = xray?.Findings || xray?.Impression || xray?.Remarks ? "result out" : "pending";
      return status === "result out";
    })
    .slice(0, 5);

  return recentXrays.length > 0 ? (
    recentXrays.map(({ key, record, xray, reportDate }) => {
      const status =
        xray?.Findings || xray?.Impression || xray?.Remarks
          ? "result out"
          : "pending";

      return (
        <div key={key} className="border-bottom pb-2 mb-3">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div className="fw-semibold">
                {xray?.Xray_Type || "X-ray"}
              </div>
              <small className="text-muted">
                {formatDateDMY(reportDate)}
              </small>
            </div>
            <span className={`badge ${status === "result out" ? "bg-success" : "bg-warning text-dark"}`}>
              {status}
            </span>
          </div>

          <div className="small mt-2">
            {xray?.Body_Part || "Body part not available"}
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-dark mt-2"
            disabled={status !== "result out"}
            onClick={() => {
              // remove any other modal elements from the DOM so they don't appear behind
              try {
                document.querySelectorAll('.modal').forEach(el => {
                  el.remove();
                });
              } catch (e) {
                // ignore
              }
              setSelectedXrayReport({ record, xray });
            }}
          >
            View
          </button>
        </div>
      );
    })
  ) : (
    <div className="text-muted">No X-rays available</div>
  );
})()}
                </div>

            </div>
          </div>
        )}

          {/* X-ray single-item modal */}
          {selectedXrayReport && (
            <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 2050 }}>
              <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ zIndex: 2060, maxWidth: '90%' }}>
                <div className="modal-content">
                  <div className="modal-header bg-primary text-white">
                    <h5 className="modal-title">X‑ray Detail</h5>
                    <button className="btn-close btn-close-white" onClick={() => setSelectedXrayReport(null)} />
                  </div>

                  <div className="modal-body">
                    {(() => {
                      const { record, xray } = selectedXrayReport;
                      const status = xray?.Findings || xray?.Impression || xray?.Remarks ? "result out" : "pending";

                      return (
                        <>
                          <p><strong>Employee:</strong> {record?.Employee?.Name}</p>
                          <p><strong>Report For:</strong> {record?.IsFamilyMember ? `${record?.FamilyMember?.Name} (${record?.FamilyMember?.Relationship})` : 'Self'}</p>
                          <p><strong>Institute:</strong> {record?.Institute?.Institute_Name || ''}</p>
                          <p><strong>Date:</strong> {formatDateDMY(xray?.Timestamp || getXrayReportDate(record))}</p>

                          <hr />

                          <table className="table table-bordered">
                            <thead className="table-light">
                              <tr>
                                <th>Type</th>
                                <th>Body Part</th>
                                <th>Side</th>
                                <th>View</th>
                                <th>Size</th>
                                <th>Findings</th>
                                <th>Impression</th>
                                <th>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>{xray?.Xray_Type || '-'}</td>
                                <td>{xray?.Body_Part || '-'}</td>
                                <td>{xray?.Side || '-'}</td>
                                <td>{xray?.View || '-'}</td>
                                <td>{xray?.Film_Size || '-'}</td>
                                <td>{xray?.Findings || '-'}</td>
                                <td>{xray?.Impression || '-'}</td>
                                <td>{xray?.Remarks || '-'}</td>
                              </tr>
                            </tbody>
                          </table>

                          <div className="mt-3">
                            {/* Show report links only when results are out and report exists */}
                            {status === 'result out' && xray?.Reports && xray.Reports.length > 0 ? (
                              xray.Reports.map((r, idx) => (
                                <div key={idx} className="mb-2 d-flex align-items-center gap-2">
                                  <div className="flex-grow-1">{r?.originalname || r?.filename}</div>
                                  <button className="btn btn-sm btn-outline-primary" onClick={async () => {
                                    try {
                                      // open report in new tab
                                      const url = `http://localhost:${BACKEND_PORT}${r.url}`;
                                      window.open(url, '_blank');
                                    } catch (err) {
                                      console.error(err);
                                      alert('Unable to open report');
                                    }
                                  }}>View</button>
                                  <a className="btn btn-sm btn-outline-secondary" href={`http://localhost:${BACKEND_PORT}${r.url}`} download>Download</a>
                                </div>
                              ))
                            ) : (
                              <div className="text-muted">No report file available.</div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setSelectedXrayReport(null)}>Close</button>
                  </div>
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

                <h6 className="fw-bold" style={{ marginTop: "20px" }}>Disease</h6>

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

  <div className="position-relative">

    {/* ✅ INPUT FIELD (YOU MISSED THIS) */}
    <input
      type="text"
      className="form-control"
      placeholder="Search disease..."
      value={diseaseSearch}
      onChange={(e) => {
        setDiseaseSearch(e.target.value);
      }}
    />

    {/* ✅ SUGGESTIONS */}
    {filteredDiseases.length > 0 && (
      <ul
        className="list-group position-absolute w-100"
        style={{ zIndex: 1000, maxHeight: "200px", overflowY: "auto" }}
      >
        {filteredDiseases.map((d, i) => (
          <li
            key={i}
            className="list-group-item list-group-item-action"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setDiseaseSearch(d.name);
              setDiseaseData(prev => ({
                ...prev,
                Disease_Name: d.name
              }));
              setFilteredDiseases([]);
            }}
          >
            {/* 🔥 FINAL FORMAT */}
            {d.subgroup
              ? `${d.type} - ${d.subgroup} - ${d.name}`
              : `${d.type} - ${d.name}`}
          </li>
        ))}
      </ul>
    )}

  </div>
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

                <h6 className="fw-bold mt-4">Medicines</h6>

                {formData.Medicines.map((med, i) => (
  <div key={i} className="mb-3">
    <div className="row g-2 align-items-end">

      <div className="col-md-3">
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
            copy[i].Quantity = calculateQuantity(e.target.value, copy[i].Duration);
            setFormData(prev => ({ ...prev, Medicines: copy }));
          }}
        />
      </div>

      <div className="col-md-2">
        <label className="form-label">Duration</label>
        <input
          type="text"
          className="form-control"
          placeholder="5 days"
          value={med.Duration}
          onChange={(e) => {
            const copy = [...formData.Medicines];
            copy[i].Duration = e.target.value;
            copy[i].Quantity = calculateQuantity(copy[i].Dosage, e.target.value);
            setFormData(prev => ({ ...prev, Medicines: copy }));
          }}
        />
      </div>

      <div className="col-md-2">
        <label className="form-label">Quantity</label>
        <input
          type="number"
          className="form-control"
          value={med.Quantity}
          readOnly
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
      {selectedXrayReport && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">X-ray Report</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedXrayReport(null)}
                />
              </div>

              <div className="modal-body">
                <p><strong>Institute:</strong> {selectedXrayReport?.Institute?.Institute_Name || instituteName || "-"}</p>
                <p><strong>Date:</strong> {formatDateDMY(getXrayReportDate(selectedXrayReport))}</p>

                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Type</th>
                      <th>Body Part</th>
                      <th>View</th>
                      <th>Findings</th>
                      <th>Impression</th>
                       <th>Reports</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedXrayReport?.Xrays || []).map((xray, index) => {
                      const status =
                        xray?.Findings || xray?.Impression || xray?.Remarks
                          ? "result out"
                          : "pending";

                      return (
                        <tr key={`${xray?.Xray_ID || xray?.Xray_Type || index}`}>

                          <td>{xray?.Xray_Type || "-"}</td>

                          <td>{xray?.Body_Part || "-"}</td>

                          <td>{xray?.View || "-"}</td>

                          <td>{xray?.Findings || "-"}</td>

                          <td>{xray?.Impression || "-"}</td>

                          {/* REPORTS COLUMN */}
                          <td>
                            {xray?.Reports && xray.Reports.length > 0 ? (
                              xray.Reports.map((r, i) => (
                                <div key={i} className="mb-1">
                                  <a
                                    href={`http://localhost:${BACKEND_PORT}${r.url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-sm btn-outline-primary me-1"
                                  >
                                    View
                                  </a>

                                  <a
                                    href={`http://localhost:${BACKEND_PORT}${r.url}`}
                                    download
                                    className="btn btn-sm btn-outline-secondary"
                                  >
                                    Download
                                  </a>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted">No file</span>
                            )}
                          </td>

                          <td>
                            <span
                              className={`badge ${
                                status === "result out"
                                  ? "bg-success"
                                  : "bg-warning text-dark"
                              }`}
                            >
                              {status}
                            </span>
                          </td>

                        </tr>
                      );

                    })}
                  </tbody>
                </table>

                {selectedXrayReport?.Xray_Notes && (
                  <div className="mt-3">
                    <strong>Notes:</strong>
                    <div className="border rounded p-2 bg-light mt-1">
                      {selectedXrayReport.Xray_Notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedXrayReport(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPrescriptionForm;