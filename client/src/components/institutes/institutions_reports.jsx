import React, { useEffect, useState } from "react";
import axios from "axios";

const InstituteReports = () => {

  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [recentTodayVisits, setRecentTodayVisits] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [report, setReport] = useState(null);
  const [selectedDiagnosisRec, setSelectedDiagnosisRec] = useState(null);
  const [showRecModal, setShowRecModal] = useState(false);
  const [loadingRec, setLoadingRec] = useState(false);

  // Fetch a fresh diagnosis record (includes Reports) before showing modal
  const viewRecord = async (rec) => {
    try {
      setLoadingRec(true);

      // Determine employee id and family flags
      const empId = rec?.Employee?._id || report?.employee?._id || rec?.Employee || null;
      const isFamily = rec?.IsFamilyMember ? true : false;
      const familyId = rec?.FamilyMember?._id || rec?.FamilyMember || '';

      if (!empId) {
        setSelectedDiagnosisRec(rec);
        setShowRecModal(true);
        return;
      }

      // Fetch records for this employee (these include Reports)
      const recordsRes = await axios.get(
        `http://localhost:${BACKEND_PORT}/diagnosis-api/records/${empId}`,
        { params: { isFamily: isFamily, familyId: familyId } }
      );

      const records = Array.isArray(recordsRes.data) ? recordsRes.data : [];
      const found = records.find(r => String(r._id) === String(rec._id));

      if (found) {
        setSelectedDiagnosisRec(found);
      } else {
        setSelectedDiagnosisRec(rec);
      }
      setShowRecModal(true);
    } catch (err) {
      console.error('Failed to fetch record via records API:', err);
      setSelectedDiagnosisRec(rec);
      setShowRecModal(true);
    } finally {
      setLoadingRec(false);
    }
  };

  /* --------------------------------------------------
      FETCH ALL EMPLOYEES (ABS + NAME)
  -------------------------------------------------- */
 useEffect(() => {
  axios
    .get(`http://localhost:${BACKEND_PORT}/employee-api/all`)
    .then(res => {
      const list =
        Array.isArray(res.data?.employees)
          ? res.data.employees
          : Array.isArray(res.data)
          ? res.data
          : [];

      setEmployees(list);
    })
    .catch(err => console.error("Employee fetch error:", err));
}, []);

 useEffect(() => {
  const instituteId = localStorage.getItem("instituteId");
  if (!instituteId) return;

  axios
    .get(`http://localhost:${BACKEND_PORT}/api/visits/today/${instituteId}`)
    .then(res => {
      const visits = Array.isArray(res.data) ? res.data : [];

      const sortedVisits = [...visits].sort((a, b) => {
        const timeA = new Date(a.created_at || a.visit_date || 0).getTime();
        const timeB = new Date(b.created_at || b.visit_date || 0).getTime();
        return timeB - timeA;
      });

      setRecentTodayVisits(sortedVisits.slice(0, 5));
    })
    .catch(err => {
      console.error("Today visits fetch error:", err);
      setRecentTodayVisits([]);
    });
}, []);


  /* --------------------------------------------------
      LIVE AUTO-SUGGEST SEARCH  (supports 1 digit)
  -------------------------------------------------- */
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEmployees([]);
      return;
    }

    const filtered = employees.filter((emp) =>
      String(emp.ABS_NO || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())   // 👈 partial match
    );

    // show only first 10 suggestions
    setFilteredEmployees(filtered.slice(0, 10));

  }, [searchTerm, employees]);

  /* --------------------------------------------------
      LOAD EMPLOYEE + FAMILY HEALTH REPORT
  -------------------------------------------------- */
  const loadHealthReport = async (absNo) => {
    try {
      const res = await axios.get(
  `http://localhost:${BACKEND_PORT}/employee-api/health-report`,
  { params: { absNo } }
);

      setReport(res.data);
      setSearchTerm(absNo);     // update textbox to selected ABS_NO
      setFilteredEmployees([]); // close dropdown

    } catch (err) {
      console.error("Health report fetch failed:", err);
      alert("❌ Unable to fetch health report");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        padding: "32px 16px"
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
        }}
      >
        {/* HEADER */}
        <h3
          style={{
            fontWeight: 700,
            marginBottom: 20,
            color: "#000",
            borderBottom: "2px solid #000",
            paddingBottom: 10
          }}
        >
          📋 Employee + Family Disease & Diagnosis Report
        </h3>
  
        <div style={{ marginBottom: 24 }}>
          <h5 style={{ fontWeight: 700, color: "#111", marginBottom: 12 }}>
            Recent 5 Visits Today
          </h5>

          {recentTodayVisits.length ? (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead style={{ background: "#f3f4f6" }}>
                  <tr>
                    <th>Token</th>
                    <th>ABS No</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Symptoms</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTodayVisits.map((visit) => {
                    const absNo = visit.abs_no || visit.employee_id?.ABS_NO || "";
                    const displayName = visit.IsFamilyMember
                      ? visit.FamilyMember?.Name || visit.name || "—"
                      : visit.employee_id?.Name || visit.name || "—";

                    return (
                      <tr key={visit._id}>
                        <td>{visit.token_no || "—"}</td>
                        <td>{absNo || "—"}</td>
                        <td>{displayName}</td>
                        <td>
                          {visit.IsFamilyMember
                            ? `Family${visit.FamilyMember?.Relationship ? ` (${visit.FamilyMember.Relationship})` : ""}`
                            : "Employee"}
                        </td>
                        <td>{visit.symptoms || "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-dark"
                            onClick={() => loadHealthReport(absNo)}
                            disabled={!absNo}
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#6b7280", marginBottom: 0 }}>
              No visit records found for today.
            </p>
          )}
        </div>

        {/* SEARCH */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontWeight: 600,
              marginBottom: 6,
              display: "block",
              color: "#111"
            }}
          >
            Employee ABS Number
          </label>
  
          <input
            type="text"
            value={searchTerm}
            placeholder="Type ABS_NO..."
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{
              padding: "12px",
              borderRadius: 8,
              border: "1px solid #d1d5db"
            }}
          />
  
          {/* AUTOCOMPLETE */}
          {searchTerm && filteredEmployees.length > 0 && (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                marginTop: 6,
                background: "#ffffff",
                maxHeight: 220,
                overflowY: "auto"
              }}
            >
              {filteredEmployees.map((emp) => (
                <div
                  key={emp._id}
                  onClick={() => loadHealthReport(emp.ABS_NO)}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f1f5f9"
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f9fafb")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#ffffff")
                  }
                >
                  <strong>{emp.ABS_NO}</strong> — {emp.Name}
                </div>
              ))}
            </div>
          )}
        </div>
  
        {/* ================= REPORT ================= */}
        {report && (
          <div style={{ marginTop: 30 }}>
            {/* EMPLOYEE */}
            <h5 style={{ fontWeight: 700, color: "#000", marginBottom: 12 }}>
              🧑‍💼 Employee: {report.employee.Name} ({report.employee.ABS_NO})
            </h5>
  
            {/* EMPLOYEE DISEASES */}
            <h6 style={{ fontWeight: 600, marginTop: 20 }}>🦠 Diseases</h6>
  
            {report.employeeDiseases?.length ? (
              <div className="table-responsive">
                <table className="table table-bordered align-middle">
                  <thead style={{ background: "#f3f4f6" }}>
                    <tr>
                      <th>Disease</th>
                      <th>Category</th>
                      <th>Severity</th>
                      <th>Diagnosis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.employeeDiseases.map((d, i) => (
                      <tr key={i}>
                        <td>{d.Disease_Name}</td>
                        <td>{d.Category}</td>
                        <td>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 20,
                              background: "#e5e7eb",
                              fontSize: 13
                            }}
                          >
                            {d.Severity_Level}
                          </span>
                        </td>
                        <td>{d.Diagnosis || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "#6b7280" }}>
                No employee disease records.
              </p>
            )}
  
            {/* EMPLOYEE DIAGNOSIS */}
            <h6 style={{ fontWeight: 600, marginTop: 24 }}>
              🩺 Diagnosis Tests
            </h6>
  
            {report.employeeDiagnosis?.length ? (
              <div>
                {report.employeeDiagnosis.map((rec, idx) => (
                  <div key={idx} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <strong>{new Date(rec.updatedAt || rec.createdAt || Date.now()).toLocaleDateString()}</strong>
                        <div className="small text-muted">{rec.visitSummary?.symptoms || ''}</div>
                      </div>
                      <div>
                        <button
                          type="button"
                          className="btn btn-sm btn-dark"
                          onClick={() => viewRecord(rec)}
                          disabled={loadingRec}
                        >
                          {loadingRec ? 'Loading…' : 'View Report'}
                        </button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-bordered align-middle mb-0">
                        <thead style={{ background: "#f3f4f6" }}>
                          <tr>
                            <th>Test</th>
                            <th>Result</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rec.Tests || []).map((t, j) => (
                            <tr key={j}>
                              <td>{t.Test_Name}</td>
                              <td>{t.Result_Value}</td>
                              <td>{t.Remarks || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#6b7280" }}>
                No employee diagnosis records.
              </p>
            )}

            {/* Uploaded reports */}
            {report.employeeDiagnosis && report.employeeDiagnosis.length > 0 && (
              (() => {
                const allReports = report.employeeDiagnosis.flatMap(r => r.Reports || []);
                return allReports.length ? (
                  <div style={{ marginTop: 18 }}>
                    <h6 style={{ fontWeight: 600, marginTop: 12 }}>📎 Uploaded Reports</h6>
                    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                      {allReports.map((rep, idx) => (
                        <li key={idx} style={{ marginBottom: 8 }}>
                          <a href={`http://localhost:${BACKEND_PORT}/${rep.url?.replace(/^\//, '')}`} target="_blank" rel="noreferrer" className="me-2">{rep.originalname || rep.filename}</a>
                          <a href={`http://localhost:${BACKEND_PORT}/${rep.url?.replace(/^\//, '')}`} download className="btn btn-sm btn-outline-secondary">Download</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null;
              })()
            )}

            {/* Diagnosis record modal */}
            {showRecModal && selectedDiagnosisRec && (
              <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
                <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                  <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                      <h5 className="modal-title">Diagnosis Report</h5>
                      <button type="button" className="btn-close btn-close-white" onClick={() => setShowRecModal(false)} />
                    </div>

                    <div className="modal-body">
                      <p><strong>Institute:</strong> {selectedDiagnosisRec.Institute?.Institute_Name || report.employee?.Institute_Name || '-'}</p>
                      <p><strong>Date:</strong> {new Date(selectedDiagnosisRec.updatedAt || selectedDiagnosisRec.createdAt || Date.now()).toLocaleString()}</p>

                      <table className="table table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>Test Name</th>
                            <th>Result</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedDiagnosisRec.Tests || []).map((t, i) => (
                            <tr key={i}>
                              <td>{t.Test_Name}</td>
                              <td>{t.Result_Value} {t.Units || ''}</td>
                              <td>{t.Remarks || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {selectedDiagnosisRec.Reports && selectedDiagnosisRec.Reports.length > 0 && (
                        <div className="mt-3">
                          <h6>Uploaded Reports</h6>
                          <ul className="list-unstyled">
                            {selectedDiagnosisRec.Reports.map((r, i) => {
                              const urlPath = r.url ? r.url.replace(/^\/+/, '') : '';
                              const href = `http://localhost:${BACKEND_PORT}/${urlPath}`;
                              return (
                                <li key={i} className="mb-2">
                                  <a href={href} target="_blank" rel="noreferrer" className="me-2">{r.originalname || r.filename}</a>
                                  <a href={href} download className="btn btn-sm btn-outline-secondary">Download</a>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                    </div>

                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowRecModal(false)}>Close</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

{/* FULL MEDICAL HISTORY */}
{/* <h6 style={{ fontWeight: 600, marginTop: 24 }}>
  📜 Full Medical History
</h6>

{report.employee.Medical_History?.length ? (
  <div className="table-responsive">
    <table className="table table-bordered align-middle">
      <thead style={{ background: "#f3f4f6" }}>
        <tr>
          <th>Date</th>
          <th>Diseases</th>
          <th>Diagnosis</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {report.employee.Medical_History.map((h, i) => (
          <tr key={i}>
            <td>
              {h.Date
                ? new Date(h.Date).toLocaleDateString()
                : "—"}
            </td>

            <td>
              {h.Diseases?.length
                ? h.Diseases.map((d, idx) => (
                    <div key={idx}>{d}</div>
                  ))
                : "—"}
            </td>

            <td>{h.Diagnosis || "—"}</td>

            <td>{h.Notes || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
) : (
  <p style={{ color: "#6b7280" }}>
    No medical history records.
  </p>
)} */}

  
            {/* FAMILY */}
            <h5
              style={{
                fontWeight: 700,
                marginTop: 32,
                color: "#000"
              }}
            >
              👨‍👩‍👧 Family Members
            </h5>
  
            {/* FAMILY DISEASES */}
            <h6 style={{ fontWeight: 600, marginTop: 16 }}>
              🦠 Diseases
            </h6>
  
            {report.familyDiseases?.length ? (
              <div className="table-responsive">
                <table className="table table-bordered align-middle">
                  <thead style={{ background: "#f3f4f6" }}>
                    <tr>
                      <th>Member</th>
                      <th>Disease</th>
                      <th>Category</th>
                      <th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.familyDiseases.map((d, i) => (
                      <tr key={i}>
                        <td>
                          {d.FamilyMember_ID?.Name} (
                          {d.FamilyMember_ID?.Relationship})
                        </td>
                        <td>{d.Disease_Name}</td>
                        <td>{d.Category}</td>
                        <td>{d.Severity_Level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "#6b7280" }}>
                No family disease records.
              </p>
            )}
  
            {/* FAMILY DIAGNOSIS */}
            <h6 style={{ fontWeight: 600, marginTop: 20 }}>
              🩺 Diagnosis Tests
            </h6>
  
            {report.familyDiagnosis?.length ? (
              <div className="table-responsive">
                <table className="table table-bordered align-middle">
                  <thead style={{ background: "#f3f4f6" }}>
                    <tr>
                      <th>Member</th>
                      <th>Test</th>
                      <th>Result</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.familyDiagnosis.flatMap((rec, i) =>
                      rec.Tests.map((t, j) => (
                        <tr key={`${i}-${j}`}>
                          <td>
                            {rec.FamilyMember?.Name} (
                            {rec.FamilyMember?.Relationship})
                          </td>
                          <td>{t.Test_Name}</td>
                          <td>{t.Result_Value}</td>
                          <td>
                            {new Date(t.Timestamp).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "#6b7280" }}>
                No family diagnosis test records.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
  
};

export default InstituteReports;
