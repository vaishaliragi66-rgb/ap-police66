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
        `http://localhost:${BACKEND_PORT}/employee-api/health-report/${absNo}`
      );
      console.log(res.data);
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
      className="container bg-white shadow-sm rounded-4 p-4 mt-4"
      style={{ maxWidth: "900px" }}
    >
      <h3 className="fw-bold mb-3">
        📋 Employee + Family Disease & Diagnosis Report
      </h3>

      {/* ================= SEARCH EMPLOYEE ================= */}
      <label className="fw-semibold mb-1">Employee ABS Number</label>

      <input
        type="text"
        value={searchTerm}
        placeholder="Type ABS_NO..."
        onChange={(e) => setSearchTerm(e.target.value)}
        className="form-control"
      />

      {/* ================= AUTOCOMPLETE DROPDOWN ================= */}
      {searchTerm && filteredEmployees.length > 0 && (
        <div
          className="border rounded mt-1 bg-light"
          style={{ maxHeight: 200, overflowY: "auto" }}
        >
          {filteredEmployees.map((emp) => (
            <div
              key={emp._id}
              className="p-2 border-bottom"
              style={{ cursor: "pointer" }}
              onClick={() => loadHealthReport(emp.ABS_NO)}
            >
              <strong>{emp.ABS_NO}</strong> — {emp.Name}
            </div>
          ))}
        </div>
      )}

      {/* =======================================================
          EMPLOYEE REPORT
      ======================================================== */}
      {report && (
        <div className="mt-4">

          <h5 className="fw-bold">
            🧑‍💼 Employee: {report.employee.Name} ({report.employee.ABS_NO})
          </h5>

          {/* EMPLOYEE DISEASES */}
          <h6 className="mt-3">🦠 Diseases</h6>

          {report.employeeDiseases?.length ? (
            <table className="table table-bordered">
              <thead className="table-light">
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
                    <td>{d.Severity_Level}</td>
                    <td>{d.Diagnosis || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No employee disease records.</p>
          )}

          {/* EMPLOYEE DIAGNOSIS TESTS */}
          <h6 className="mt-3">🩺 Diagnosis Tests</h6>

          {report.employeeDiagnosis?.length ? (
            <table className="table table-bordered">
              <thead className="table-light">
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
                      <td>{new Date(t.Timestamp).toLocaleDateString()}</td>
                      <td>{t.Test_Name}</td>
                      <td>{t.Result_Value}</td>
                      <td>{t.Remarks || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <p>No employee diagnosis records.</p>
          )}

          {/* =======================================================
              FAMILY SECTION
          ======================================================== */}
          <h5 className="mt-4 fw-bold">👨‍👩‍👧 Family Members</h5>

          {/* FAMILY DISEASES */}
          <h6 className="mt-2">🦠 Diseases</h6>

          {report.familyDiseases?.length ? (
            <table className="table table-bordered">
              <thead className="table-light">
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
          ) : (
            <p>No family disease records.</p>
          )}

          {/* FAMILY DIAGNOSIS TESTS */}
          <h6 className="mt-2">🩺 Diagnosis Tests</h6>

          {report.familyDiagnosis?.length ? (
            <table className="table table-bordered">
              <thead className="table-light">
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
                      <td>{new Date(t.Timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <p>No family diagnosis test records.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default InstituteReports;