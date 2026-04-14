import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PatientSelector from "../institutes/PatientSelector";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";

const normalizeFilmSize = (value) => {
  const cleaned = String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^0-9X]/g, "")
    .replace(/X+/g, "X");

  const parts = cleaned.split("X").filter(Boolean);
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}X${parts.slice(1).join("")}`;
};

const isValidFilmSize = (value) => /^\d+X\d+$/.test(String(value || "").trim());

const XrayEntryForm = () => {
  const [instituteName, setInstituteName] = useState("");
  const [visitId, setVisitId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null);
  const [pastRecords, setPastRecords] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [tokenNumber, setTokenNumber] = useState(null);
  const [xrayTypes, setXrayTypes] = useState([]);
  const [xrayMaster, setXrayMaster] = useState([]);
  const [doctorXrays, setDoctorXrays] = useState([]);
  const [doctorXrayOrders, setDoctorXrayOrders] = useState([]);
  const [showDoctorNotes, setShowDoctorNotes] = useState({});
  const navigate = useNavigate();

  const xraySource = useMemo(() => xrayMaster, [xrayMaster]);

  const bodyPartOptions = useMemo(() => {
    const parts = new Set();
    xraySource.forEach((item) => {
      const part = String(item?.Body_Part || "").trim();
      if (part) parts.add(part);
    });
    return Array.from(parts).sort((a, b) => a.localeCompare(b));
  }, [xraySource]);



  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Xrays: [
      {
        Xray_Type: "",
        Body_Part: "",
        Side: "NA",
        View: "",
        Film_Size: "",
        Findings: "",
        Impression: "",
        Remarks: "",
      },
    ],
    Xray_Notes: "",
  });

  useEffect(() => {
    const localInstituteId =
      localStorage.getItem("instituteId");
    if (localInstituteId) {
      setFormData((s) => ({
        ...s,
        Institute_ID: localInstituteId,
      }));
      fetchInstituteName(localInstituteId);
        // ADD THIS
  fetchXrayTypes();
    }
  }, []);

  const fetchDoctorXrays = async (visitId) => {
  try {
    // Fetch from medical-actions API like pharmacy and diagnosis
    const res = await axios.get(
      `${BACKEND_URL}/api/medical-actions/visit/${visitId}`
    );

    console.log("Medical actions API Response:", res.data);
    
    const actions = res.data || [];
    
    // Filter for DOCTOR_XRAY actions
    const doctorXrayActions = actions.filter(a => a.action_type === "DOCTOR_XRAY");
    
    console.log("Doctor X-ray actions:", doctorXrayActions);
    
    // Set the orders (each action is an order with data containing xrays and notes)
    setDoctorXrayOrders(doctorXrayActions);
    
    // Extract xrays from all actions for the form
    const allXrays = doctorXrayActions.flatMap(action => action.data?.xrays || []);
    setDoctorXrays(allXrays);

  } catch (err) {
    console.error("Failed to fetch doctor xrays", err);
    setDoctorXrays([]);
    setDoctorXrayOrders([]);
  }
};

  const fetchInstituteName = async (id) => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/institute-api/institution/${id}`
      );
      setInstituteName(res.data?.Institute_Name || "");
    } catch (err) {
      console.error("Error fetching institute name:", err);
    }
  };
const fetchXrayTypes = async () => {
  try {
    const instituteId = localStorage.getItem("instituteId") || "";
    const res = await axios.get(`${BACKEND_URL}/xray-api/types`, {
      params: instituteId ? { instituteId } : {}
    });
    setXrayMaster(Array.isArray(res.data) ? res.data : []);
    console.log("X-ray types fetched:", res.data?.length);
  } catch (err) {
    console.error("Error fetching X-ray types:", err);
    setXrayMaster([]);
  }
};


 const handleXrayChange = (index, field, value) => {
  setFormData(prev => {
    const updated = [...prev.Xrays];

    if (field === "Body_Part") {
      updated[index] = {
        ...updated[index],
        Body_Part: value,
        Xray_ID: "",
        Xray_Type: "",
        Side: "NA",
        View: "",
        Film_Size: ""
      };
    } else if (field === "Xray_ID") {
      const sel = xrayMaster.find(x => x._id === value);

      if (sel) {
        updated[index] = {
          ...updated[index],
          Xray_ID: sel._id,
          Xray_Type: sel.Xray_Type,
          Body_Part: sel.Body_Part,
          Side: sel.Side || "NA",
          View: sel.View || "",
          Film_Size: sel.Film_Size || ""
        };
      } else {
        updated[index] = {
          ...updated[index],
          Xray_ID: value || "",
          Xray_Type: value
            ? updated[index].Xray_Type
            : ""
        };
      }
    } else if (field === "Film_Size") {
      updated[index] = {
        ...updated[index],
        Film_Size: normalizeFilmSize(value)
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }

    return { ...prev, Xrays: updated };
  });
};


  const addXray = () => {
    setFormData((prev) => ({
      ...prev,
      Xrays: [
        ...prev.Xrays,
        {
          Xray_Type: "",
          Body_Part: "",
          Side: "NA",
          View: "",
          Film_Size: "",
          Findings: "",
          Impression: "",
          Remarks: "",
        },
      ],
    }));
  };

  const removeXray = (i) => {
    setFormData((prev) => ({
      ...prev,
      Xrays: prev.Xrays.filter(
        (_, idx) => idx !== i
      ),
    }));
  };

  const fetchPastRecords = async () => {
    if (!formData.Employee_ID) return;

    try {
      const res = await axios.get(
        `${BACKEND_URL}/xray-api/records/${formData.Employee_ID}?isFamily=${formData.IsFamilyMember}&familyId=${formData.FamilyMember_ID}`
      );
      setPastRecords(res.data || []);
      setShowHistory(true);
    } catch (err) {
      console.error(
        "Error fetching past records:",
        err
      );
    }
  };


  const handleSubmit = async (e) => {

e.preventDefault();

const invalidFilmSizeIndex = formData.Xrays.findIndex(
  (xray) => !isValidFilmSize(xray.Film_Size)
);

if (invalidFilmSizeIndex !== -1) {
  alert(`Please enter a valid Film Size in format like 10X8 or 16X16 for X-ray #${invalidFilmSizeIndex + 1}`);
  return;
}

const fd = new FormData();

fd.append("Institute_ID",formData.Institute_ID);
fd.append("Employee_ID",formData.Employee_ID);
fd.append("IsFamilyMember",formData.IsFamilyMember);
fd.append("FamilyMember_ID",formData.FamilyMember_ID);
fd.append("Xray_Notes",formData.Xray_Notes);

// send xray data
fd.append("Xrays",JSON.stringify(formData.Xrays));

// send files
formData.Xrays.forEach((x,i)=>{

if(x.ReportFile){
fd.append("reports",x.ReportFile);
}

});

await axios.post(
`${BACKEND_URL}/xray-api/add`,
fd,
{
headers:{
"Content-Type":"multipart/form-data"
}
}
);

alert("✅ Xray saved");

};

  const handlePrint = () => {
    const section = document.getElementById("xray-print-section");
    if (!section) return;

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>X-ray Entry</title>
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

  const formatDateDMY = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";

    const day = String(date.getDate()).padStart(
      2,
      "0"
    );
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

  useEffect(() => {

  if (!doctorXrays || doctorXrays.length === 0) return;

  const populated = doctorXrays.map(x => {

    const master = xrayMaster.find(m => m._id === x.Xray_ID);

    return {
      Xray_ID: x.Xray_ID || "",
      Xray_Type: x.Xray_Type || "",
      Body_Part: master?.Body_Part || "",
      Side: master?.Side || "NA",
      View: master?.View || "",
      Film_Size: master?.Film_Size || "",
      Findings: "",
      Impression: "",
      Remarks: ""
    };

  });

  setFormData(prev => ({
    ...prev,
    Xrays: populated
  }));

}, [doctorXrays, xrayMaster]);

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
                <strong>🩻 X-ray History</strong>
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
                      {record?.Xrays?.length > 0 ? (
                        record.Xrays.map((x, i) => (
                          <div key={i} className="mb-2 p-2 bg-light rounded">
                            <div className="fw-semibold text-dark">
                              {x?.Xray_Type || "X-ray"}
                            </div>
                            <small className="text-muted">
                              {x?.Body_Part || "N/A"}
                              {x?.View && ` (${x.View})`}
                            </small>
                            {x?.Findings && (
                              <div className="small text-secondary mt-1">
                                Findings: {x.Findings}
                              </div>
                            )}
                            {x?.Impression && (
                              <div className="small text-secondary">
                                Impression: {x.Impression}
                              </div>
                            )}
                            {x?.Reports?.length > 0 && (
                              <div className="mt-2">
                              {x.Reports.map((r,ri)=>(
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
                        ))
                      ) : (
                        <div className="text-muted small">
                          No X-ray details available
                        </div>
                      )}
                      {record?.Xray_Notes && (
                        <div className="mt-2 p-2 bg-light rounded small">
                          📝 Notes: {record.Xray_Notes}
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
              <h5 className="mb-0">🩻 X-ray Entry Form</h5>
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
                    onlyXrayQueue={true}
                    onSelect={({ employee, visit }) => {
                      const vId = visit?._id || null;
                      const token =
                        visit?.token_no ||
                        visit?.Token_Number ||
                        null;

                      setVisitId(vId);
                      setTokenNumber(token);
                      setSelectedEmployee(employee);
                      setSelectedFamilyMember(
                        visit?.IsFamilyMember
                          ? visit.FamilyMember
                          : null
                      );
                      if (vId) {
                        fetchDoctorXrays(vId);
                      }
                      setFormData((prev) => ({
                        ...prev,
                        Employee_ID: employee._id,
                        IsFamilyMember: Boolean(
                          visit?.IsFamilyMember
                        ),
                        FamilyMember_ID:
                          visit?.IsFamilyMember
                            ? visit.FamilyMember?._id
                            : "",
                      }));
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

                {/* Doctor X-ray Orders with Notes */}
                {doctorXrayOrders.length > 0 && (
                  <div className="alert alert-warning mb-4">
                    <h6 className="alert-heading">👨‍⚕️ Doctor X-ray Orders (Reference)</h6>
                    
                    {doctorXrayOrders.map((action, i) => (
                      <div key={i} className="mt-2">
                        <ul className="mb-2">
                          {(action.data?.xrays || []).map((xray, idx) => (
                            <li key={idx}>
                              {xray.Xray_Type} {xray.Body_Part ? `(${xray.Body_Part})` : ''}
                            </li>
                          ))}
                        </ul>

                        {action.data?.notes && (
                          <div className="mt-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-info"
                              onClick={() => setShowDoctorNotes(prev => ({ ...prev, [i]: !prev[i] }))}
                            >
                              {showDoctorNotes[i] ? "Hide Doctor Notes" : "Show Doctor Notes"}
                            </button>
                            {showDoctorNotes[i] && (
                              <div className="alert alert-info mt-2 mb-0 p-2">
                                <small><strong>Doctor Notes:</strong> {action.data.notes}</small>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* X-ray Details */}
                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">
                    🩻 X-ray Details
                  </h6>

                  {formData.Xrays.map((x, i) => (
                    <div
                      key={i}
                      className="border rounded p-3 mb-3 bg-light"
                    >
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">X-ray #{i + 1}</h6>
                        {formData.Xrays.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeXray(i)}
                          >
                            🗑️ Remove
                          </button>
                        )}
                      </div>

                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label fw-semibold">Body Part</label>
                          <select
                            className="form-select"
                            value={x.Body_Part || ""}
                            onChange={(e) => handleXrayChange(i, "Body_Part", e.target.value)}
                          >
                            <option value="">Select body part</option>
                            {bodyPartOptions.map((part) => (
                              <option key={part} value={part}>
                                {part}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-md-8">
                          <label className="form-label fw-semibold">X-ray Selection</label>
                          <select
                            className="form-select"
                            value={x.Xray_ID || ""}
                            onChange={(e) => handleXrayChange(i, "Xray_ID", e.target.value)}
                            disabled={!x.Body_Part}
                          >
                            <option value="">{x.Body_Part ? "Select X-ray test" : "Select body part first"}</option>
                            {xraySource
                              .filter(
                                (xm) =>
                                  String(xm?.Body_Part || "").trim().toLowerCase() ===
                                  String(x.Body_Part || "").trim().toLowerCase()
                              )
                              .sort((a, b) => String(a?.Xray_Type || "").localeCompare(String(b?.Xray_Type || "")))
                              .map((xm) => (
                                <option key={xm._id} value={xm._id}>
                                  {xm.Xray_Type}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label fw-semibold">Film Size</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="10X8"
                            value={x.Film_Size}
                            onChange={(e) => handleXrayChange(i, "Film_Size", e.target.value)}
                            inputMode="text"
                            autoComplete="off"
                            onBlur={(e) => handleXrayChange(i, "Film_Size", e.target.value)}
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Findings</label>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Enter findings..."
                            value={x.Findings}
                            onChange={(e) => handleXrayChange(i, "Findings", e.target.value)}
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Impression</label>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Enter impression..."
                            value={x.Impression}
                            onChange={(e) => handleXrayChange(i, "Impression", e.target.value)}
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold">Remarks</label>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Enter remarks..."
                            value={x.Remarks}
                            onChange={(e) => handleXrayChange(i, "Remarks", e.target.value)}
                          /><br/>
                          <div className="col-12">
                            <label className="form-label fw-semibold">
                            Upload X-ray Report
                            </label>

                            <input
                            type="file"
                            className="form-control"
                            onChange={(e)=>
                            handleXrayChange(
                            i,
                            "ReportFile",
                            e.target.files[0]
                            )
                            }
                            />

                            </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-outline-success me-2"
                    onClick={addXray}
                  >
                    ➕ Add Another X-ray
                  </button>
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">📝 X-ray Notes</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Enter X-ray notes..."
                    value={formData.Xray_Notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        Xray_Notes: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Submit Button */}
                <div className="text-center">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg px-5"
                  >
                    💾 Save X-ray Record
                  </button>
                </div>
              </form>

              {/* Hidden Print Section */}
              <div id="xray-print-section" style={{ display: "none" }}>
                <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
                  🩻 X-ray Entry Report
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

                {formData.Xrays.length > 0 && (
                  <div style={{ marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "15px" }}>
                    <h4>X-ray Details</h4>
                    {formData.Xrays.map((x, i) => (
                      <div key={i} style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
                        <h6 style={{ marginBottom: "10px" }}>X-ray #{i + 1}</h6>
                        <table style={{ width: "100%", fontSize: "13px", marginBottom: "10px" }}>
                          <tbody>
                            <tr>
                              <td style={{ width: "30%", fontWeight: "bold", paddingBottom: "5px" }}>Type:</td>
                              <td style={{ paddingBottom: "5px" }}>{x.Xray_Type || "N/A"}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: "bold", paddingBottom: "5px" }}>Body Part:</td>
                              <td style={{ paddingBottom: "5px" }}>{x.Body_Part || "N/A"}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: "bold", paddingBottom: "5px" }}>View:</td>
                              <td style={{ paddingBottom: "5px" }}>{x.View || "N/A"}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: "bold", paddingBottom: "5px" }}>Film Size:</td>
                              <td style={{ paddingBottom: "5px" }}>{x.Film_Size || "N/A"}</td>
                            </tr>
                            {x.Findings && (
                              <tr>
                                <td style={{ fontWeight: "bold", paddingBottom: "5px", verticalAlign: "top" }}>Findings:</td>
                                <td style={{ paddingBottom: "5px", whiteSpace: "pre-wrap" }}>{x.Findings}</td>
                              </tr>
                            )}
                            {x.Impression && (
                              <tr>
                                <td style={{ fontWeight: "bold", paddingBottom: "5px", verticalAlign: "top" }}>Impression:</td>
                                <td style={{ paddingBottom: "5px", whiteSpace: "pre-wrap" }}>{x.Impression}</td>
                              </tr>
                            )}
                            {x.Remarks && (
                              <tr>
                                <td style={{ fontWeight: "bold", paddingBottom: "5px", verticalAlign: "top" }}>Remarks:</td>
                                <td style={{ paddingBottom: "5px", whiteSpace: "pre-wrap" }}>{x.Remarks}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}

                {formData.Xray_Notes && (
                  <div style={{ marginBottom: "20px" }}>
                    <h4>X-ray Notes</h4>
                    <p style={{ whiteSpace: "pre-wrap" }}>{formData.Xray_Notes}</p>
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
export default XrayEntryForm;
