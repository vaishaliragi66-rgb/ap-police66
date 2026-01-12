import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

/* ===============================
   Utility: Abnormal Test Checker
================================*/
const isAbnormal = (value, range) => {
  if (!value || !range) return false;
  const num = parseFloat(value);
  if (isNaN(num)) return false;

  if (range.includes("–")) {
    const [min, max] = range.split("–").map(parseFloat);
    return num < min || num > max;
  }
  if (range.startsWith("<")) return num >= parseFloat(range.slice(1));
  if (range.startsWith(">")) return num <= parseFloat(range.slice(1));
  return false;
};

/* ===============================
   CSV & PDF
================================*/
const downloadCSV = (data) => {
  if (!data.length) return;

  const headers = [
    "Role","Name","District","Age",
    "Communicable Diseases","Non-Communicable Diseases",
    "Tests","Medicines","First Visit","Last Visit"
  ];

  const rows = data.map(r => [
    r.Role,
    r.Name,
    r.District || "",
    r.Age ?? "",
    (r.Communicable_Diseases || []).join("; "),
    (r.NonCommunicable_Diseases || []).join("; "),
    (r.Tests || []).map(t => `${t.Test_Name}:${t.Result_Value}`).join("; "),
    (r.Medicines || []).map(m => `${m.Medicine_Name}(${m.Quantity})`).join("; "),
    r.First_Visit_Date ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB") : "",
    r.Last_Visit_Date ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB") : ""
  ]);

  const csv =
    headers.join(",") +
    "\n" +
    rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Employee_Analytics.csv";
  link.click();
};

const downloadPDF = (data) => {
  if (!data.length) return;
  const doc = new jsPDF("l", "mm", "a4");

  autoTable(doc, {
    head: [[
      "Role","Name","District","Age",
      "Communicable","Non-Communicable",
      "Tests","Medicines","First Visit","Last Visit"
    ]],
    body: data.map(r => [
      r.Role,
      r.Name,
      r.District || "",
      r.Age ?? "",
      (r.Communicable_Diseases || []).join(", "),
      (r.NonCommunicable_Diseases || []).join(", "),
      (r.Tests || []).map(t => `${t.Test_Name}:${t.Result_Value}`).join("; "),
      (r.Medicines || []).map(m => `${m.Medicine_Name} (${m.Quantity})`).join("; "),
      r.First_Visit_Date ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB") : "",
      r.Last_Visit_Date ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB") : ""
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [33, 37, 41] }
  });

  doc.save("Employee_Analytics.pdf");
};

/* ===============================
   COMPONENT
================================*/
export default function EmployeeReports() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Filters */
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [comm, setComm] = useState("");
  const [nonComm, setNonComm] = useState("");
  const [medicine, setMedicine] = useState("");
  const [test, setTest] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [abnormalOnly, setAbnormalOnly] = useState(false);

  /* Pagination & Expand */
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    axios
      .get(`http://localhost:${BACKEND_PORT}/admin-api/analytics/all`)
      .then(res => {
        setRows(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredRows = rows.filter(r => {
    const match = (v, f) =>
      !f || (v && v.toString().toLowerCase().includes(f.toLowerCase()));

    const ageOK =
      (!ageMin || r.Age >= ageMin) &&
      (!ageMax || r.Age <= ageMax);

    const hasAbnormal =
      r.Tests?.some(t => isAbnormal(t.Result_Value, t.Reference_Range));

    return (
      (!role || r.Role === role) &&
      match(r.Name, name) &&
      match(r.District, district) &&
      match((r.Communicable_Diseases || []).join(" "), comm) &&
      match((r.NonCommunicable_Diseases || []).join(" "), nonComm) &&
      match((r.Medicines || []).map(m => m.Medicine_Name).join(" "), medicine) &&
      match((r.Tests || []).map(t => t.Test_Name).join(" "), test) &&
      ageOK &&
      (!abnormalOnly || hasAbnormal)
    );
  });

  /* Pagination logic */
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const paginatedRows = filteredRows.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  const toggleRow = (idx) => {
    setExpandedRow(expandedRow === idx ? null : idx);
  };

  if (loading) return <div className="text-center mt-5">Loading…</div>;

  return (
    <div className="container-fluid mt-4">
      <h4 className="text-center mb-3">
        Employee Medical Analytics Dashboard (All Institutes)
      </h4>
      {/* ===============================
    FILTER PANEL
================================*/}
<div className="card mb-3">
  <div className="card-body">
    <div className="row g-2 align-items-center">
      <div className="col-md-2">
        <select
          className="form-control"
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="Employee">Employee</option>
          <option value="Family">Family</option>
        </select>
      </div>

      <div className="col-md-2">
        <input
          className="form-control"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="col-md-2">
        <input
          className="form-control"
          placeholder="District"
          value={district}
          onChange={e => setDistrict(e.target.value)}
        />
      </div>

      <div className="col-md-2">
        <input
          className="form-control"
          placeholder="Communicable Disease"
          value={comm}
          onChange={e => setComm(e.target.value)}
        />
      </div>

      <div className="col-md-2">
        <input
          className="form-control"
          placeholder="Non-Communicable Disease"
          value={nonComm}
          onChange={e => setNonComm(e.target.value)}
        />
      </div>

      <div className="col-md-2">
        <input
          className="form-control"
          placeholder="Medicine"
          value={medicine}
          onChange={e => setMedicine(e.target.value)}
        />
      </div>

      <div className="col-md-2 mt-2">
        <input
          className="form-control"
          placeholder="Test"
          value={test}
          onChange={e => setTest(e.target.value)}
        />
      </div>

      <div className="col-md-1 mt-2">
        <input
          className="form-control"
          placeholder="Age ≥"
          value={ageMin}
          onChange={e => setAgeMin(e.target.value)}
        />
      </div>

      <div className="col-md-1 mt-2">
        <input
          className="form-control"
          placeholder="Age ≤"
          value={ageMax}
          onChange={e => setAgeMax(e.target.value)}
        />
      </div>

      <div className="col-md-3 mt-3">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={abnormalOnly}
            onChange={e => setAbnormalOnly(e.target.checked)}
          />
          <label className="form-check-label">
            Show only abnormal test results
          </label>
        </div>
      </div>

      <div className="col-md-4 mt-3 text-end">
        <button
          className="btn btn-success me-2"
          onClick={() => downloadCSV(filteredRows)}
        >
          Download CSV
        </button>

        <button
          className="btn btn-danger"
          onClick={() => downloadPDF(filteredRows)}
        >
          Download PDF
        </button>
      </div>
    </div>
  </div>
</div>


      {/* TABLE */}
      <div className="table-responsive">
        <table className="table table-bordered table-hover align-middle">
          <thead className="table-dark">
            <tr>
              <th>Role</th>
              <th>Name</th>
              <th>District</th>
              <th>Age</th>
              <th>Communicable</th>
              <th>Non-Communicable</th>
              <th>Tests</th>
              <th>Medicines</th>
              <th>First Visit</th>
              <th>Last Visit</th>
              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            {paginatedRows.map((r, i) => {
              const globalIndex = indexOfFirst + i;
              const expanded = expandedRow === globalIndex;

              return (
                <tr key={globalIndex}>
                  <td>{r.Role}</td>
                  <td>{r.Name}</td>
                  <td>{r.District || "—"}</td>
                  <td>{r.Age ?? "—"}</td>

                  <td>{expanded ? r.Communicable_Diseases?.join(", ") : r.Communicable_Diseases?.[0] || "—"}</td>
                  <td>{expanded ? r.NonCommunicable_Diseases?.join(", ") : r.NonCommunicable_Diseases?.[0] || "—"}</td>

                  <td>
                    {expanded
                      ? r.Tests?.map((t, idx) => (
                          <div
                            key={idx}
                            style={{
                              color: isAbnormal(t.Result_Value, t.Reference_Range) ? "red" : "inherit",
                              fontWeight: isAbnormal(t.Result_Value, t.Reference_Range) ? "bold" : "normal"
                            }}
                          >
                            {t.Test_Name}: {t.Result_Value} {t.Units}
                          </div>
                        ))
                      : r.Tests?.[0]
                      ? `${r.Tests[0].Test_Name}: ${r.Tests[0].Result_Value} ...`
                      : "—"}
                  </td>

                  <td>
                    {expanded
                      ? r.Medicines?.map((m, idx) => (
                          <div key={idx}>{m.Medicine_Name} ({m.Quantity})</div>
                        ))
                      : r.Medicines?.[0]
                      ? `${r.Medicines[0].Medicine_Name} (${r.Medicines[0].Quantity}) ...`
                      : "—"}
                  </td>

                  <td>{r.First_Visit_Date ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB") : "—"}</td>
                  <td>{r.Last_Visit_Date ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB") : "—"}</td>

                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => toggleRow(globalIndex)}
                    >
                      {expanded ? "Collapse" : "View More"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <nav>
        <ul className="pagination justify-content-center">
          <li className={`page-item ${currentPage === 1 && "disabled"}`}>
            <button className="page-link" onClick={() => setCurrentPage(p => p - 1)}>
              Prev
            </button>
          </li>

          {[...Array(totalPages)].map((_, i) => (
            <li key={i} className={`page-item ${currentPage === i + 1 ? "active" : ""}`}>
              <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                {i + 1}
              </button>
            </li>
          ))}

          <li className={`page-item ${currentPage === totalPages && "disabled"}`}>
            <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}>
              Next
            </button>
          </li>
        </ul>
      </nav>

      
    </div>
  );
}
