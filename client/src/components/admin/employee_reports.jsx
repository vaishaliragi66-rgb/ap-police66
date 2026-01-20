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
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        padding: "28px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="container-fluid">
  
        {/* ================= HEADER ================= */}
        <div className="mb-4">
          <h3 style={{ fontWeight: 600, color: "#111827", marginBottom: 4 }}>
            Employee Medical Analytics
          </h3>
          <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
            Consolidated health records across all institutes
          </p>
        </div>
  
        {/* ================= FILTER PANEL ================= */}
        <div
          className="card mb-4 border-0"
          style={{
            borderRadius: 14,
            boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
          }}
        >
          <div className="card-body">
            <div className="row g-3 align-items-center">
  
              {[
                { el: (
                  <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="">All Roles</option>
                    <option value="Employee">Employee</option>
                    <option value="Family">Family</option>
                  </select>
                )},
                { el: <input className="form-control" placeholder="Name" value={name} onChange={e => setName(e.target.value)} /> },
                { el: <input className="form-control" placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} /> },
                { el: <input className="form-control" placeholder="Communicable Disease" value={comm} onChange={e => setComm(e.target.value)} /> },
                { el: <input className="form-control" placeholder="Non-Communicable Disease" value={nonComm} onChange={e => setNonComm(e.target.value)} /> },
                { el: <input className="form-control" placeholder="Medicine" value={medicine} onChange={e => setMedicine(e.target.value)} /> },
                { el: <input className="form-control" placeholder="Test" value={test} onChange={e => setTest(e.target.value)} /> },
              ].map((f, i) => (
                <div className="col-md-2" key={i}>
                  {React.cloneElement(f.el, {
                    style: {
                      height: 42,
                      borderRadius: 10,
                      border: "1px solid #E5E7EB",
                    }
                  })}
                </div>
              ))}
  
              <div className="col-md-1">
                <input className="form-control" placeholder="Age ≥" value={ageMin}
                  onChange={e => setAgeMin(e.target.value)}
                  style={{ height: 42, borderRadius: 10 }} />
              </div>
  
              <div className="col-md-1">
                <input className="form-control" placeholder="Age ≤" value={ageMax}
                  onChange={e => setAgeMax(e.target.value)}
                  style={{ height: 42, borderRadius: 10 }} />
              </div>
  
              <div className="col-md-3">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox"
                    checked={abnormalOnly}
                    onChange={e => setAbnormalOnly(e.target.checked)} />
                  <label className="form-check-label text-muted">
                    Show only abnormal test results
                  </label>
                </div>
              </div>
  
              <div className="col-md-4 text-end">
                <button className="btn btn-success me-2 px-4">Download CSV</button>
                <button className="btn btn-danger px-4">Download PDF</button>
              </div>
  
            </div>
          </div>
        </div>
  
        {/* ================= TABLE ================= */}
        <div
          className="card border-0"
          style={{
            borderRadius: 14,
            boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead style={{ backgroundColor: "#F3F7FF" }}>
                <tr style={{ color: "#374151", fontSize: 14 }}>
                  {["Role","Name","District","Age","Communicable","Non-Communicable","Tests","Medicines","First Visit","Last Visit","Details"]
                    .map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
  
              <tbody>
                {paginatedRows.map((r, i) => {
                  const idx = indexOfFirst + i;
                  const expanded = expandedRow === idx;
  
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #E5E7EB" }}>
                      <td>{r.Role}</td>
                      <td style={{ fontWeight: 600 }}>{r.Name}</td>
                      <td>{r.District || "—"}</td>
                      <td>{r.Age ?? "—"}</td>
  
                      <td>{expanded ? r.Communicable_Diseases?.join(", ") : r.Communicable_Diseases?.[0] || "—"}</td>
                      <td>{expanded ? r.NonCommunicable_Diseases?.join(", ") : r.NonCommunicable_Diseases?.[0] || "—"}</td>
  
                      <td>
                        {expanded
                          ? r.Tests?.map((t, k) => (
                            <div key={k} style={{
                              color: isAbnormal(t.Result_Value, t.Reference_Range) ? "#DC2626" : "#111",
                              fontWeight: isAbnormal(t.Result_Value, t.Reference_Range) ? 600 : 400
                            }}>
                              {t.Test_Name}: {t.Result_Value} {t.Units}
                            </div>
                          ))
                          : r.Tests?.[0]
                          ? `${r.Tests[0].Test_Name}: ${r.Tests[0].Result_Value} ...`
                          : "—"}
                      </td>
  
                      <td>
                        {expanded
                          ? r.Medicines?.map((m, k) => (
                            <div key={k}>{m.Medicine_Name} ({m.Quantity})</div>
                          ))
                          : r.Medicines?.[0]
                          ? `${r.Medicines[0].Medicine_Name} (${r.Medicines[0].Quantity}) ...`
                          : "—"}
                      </td>
  
                      <td>{r.First_Visit_Date ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB") : "—"}</td>
                      <td>{r.Last_Visit_Date ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB") : "—"}</td>
  
                      <td>
                        <button
                          className="btn btn-sm"
                          style={{
                            borderRadius: 999,
                            padding: "4px 14px",
                            border: "1px solid #4F6FAF",
                            background: "#fff",
                            color: "#4F6FAF",
                            fontWeight: 500
                          }}
                          onClick={() => toggleRow(idx)}
                        >
                          {expanded ? "Collapse" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
  
        {/* ================= PAGINATION ================= */}
        <div className="d-flex justify-content-center mt-4">
          <ul className="pagination">
            {[...Array(totalPages)].map((_, i) => (
              <li key={i} className={`page-item ${currentPage === i + 1 ? "active" : ""}`}>
                <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                  {i + 1}
                </button>
              </li>
            ))}
          </ul>
        </div>
  
      </div>
    </div>
  );
  
  
}
