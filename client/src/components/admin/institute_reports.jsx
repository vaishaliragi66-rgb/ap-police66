import React, { useEffect, useState } from "react";
import axios from "axios";

const InstituteReports = () => {

  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [report, setReport] = useState(null);

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

            {/* EMPLOYEE BASIC INFO CARD */}
<div
  style={{
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 18,
    marginBottom: 20
  }}
>
  <div className="row">
    <div className="col-md-4 mb-2">
      <strong>Gender:</strong>{" "}
      <span style={{ color: "#374151" }}>
        {report.employee.Gender || "—"}
      </span>
    </div>

    <div className="col-md-4 mb-2">
      <strong>Age:</strong>{" "}
      <span style={{ color: "#374151" }}>
        {report.employee.DOB
          ? new Date().getFullYear() -
            new Date(report.employee.DOB).getFullYear()
          : "—"}
      </span>
    </div>

    <div className="col-md-4 mb-2">
      <strong>Blood Group:</strong>{" "}
      <span style={{ color: "#374151" }}>
        {report.employee.Blood_Group || "—"}
      </span>
    </div>

    <div className="col-md-4 mb-2">
      <strong>Height:</strong>{" "}
      <span style={{ color: "#374151" }}>
        {report.employee.Height
          ? `${report.employee.Height} cm`
          : "—"}
      </span>
    </div>

    <div className="col-md-4 mb-2">
      <strong>Weight:</strong>{" "}
      <span style={{ color: "#374151" }}>
        {report.employee.Weight
          ? `${report.employee.Weight} kg`
          : "—"}
      </span>
    </div>
  </div>
</div>
  
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
              <div className="table-responsive">
                <table className="table table-bordered align-middle">
                  <thead style={{ background: "#f3f4f6" }}>
                    <tr>
                      <th>Date</th>
                      <th>Test</th>
                      <th>Result</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.employeeDiagnosis.flatMap((rec, i) =>
                      rec.Tests.map((t, j) => (
                        <tr key={`${i}-${j}`}>
                          <td>
                            {new Date(t.Timestamp).toLocaleDateString()}
                          </td>
                          <td>{t.Test_Name}</td>
                          <td>{t.Result_Value}</td>
                          <td>{t.Remarks || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "#6b7280" }}>
                No employee diagnosis records.
              </p>
            )}

            {/* FULL MEDICAL HISTORY */}
<h6 style={{ fontWeight: 600, marginTop: 28 }}>
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
          <th>Medicines</th>
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

            <td>
              {h.Medicines?.length
                ? h.Medicines.map((m, idx) => (
                    <div key={idx}>{m}</div>
                  ))
                : "—"}
            </td>

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
)}

  
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