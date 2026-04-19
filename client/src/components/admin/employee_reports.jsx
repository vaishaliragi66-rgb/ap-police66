import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./AdminDashboard.css";
import { fetchMasterDataMap, getMasterOptions } from "../../utils/masterData_clean";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addCenteredReportHeader, addDownloadTimestamp, formatReportTimestamp, getReportInstitutionName } from "../../utils/reportPdf";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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
    "Role",
    "ABS Number",
    "Name",
    "Gender",
    "District",
    "State",
    "Age",
    "Blood Group",
    "Phone Number",
    "Height",
    "Weight",
    "Communicable Diseases",
    "Non-Communicable Diseases",
    "Tests",
    "Medicines",
    "First Visit",
    "Last Visit"
  ];

  const rows = data.map(r => [
    r.Role,
    r.ABS_NO || "",
    r.Name,
    r.Gender || "",
    r.District || "",
    r.State || "",
    r.Age ?? "",
    r.Blood_Group || "",
    r.Phone_No || "",
    r.Height || "",
    r.Weight || "",
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
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = "Employee_Analytics.csv";
  link.click();
  URL.revokeObjectURL(objectUrl);
};

const downloadPDF = (data) => {
  if (!data.length) return;
  const doc = new jsPDF("l", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const downloadedAt = formatReportTimestamp();

  addCenteredReportHeader(doc, {
    centerX: pageWidth / 2,
    left: 14,
    right: pageWidth - 14,
    institutionName: getReportInstitutionName("POLICE HOSPITAL MANAGEMENT"),
    title: "EMPLOYEE ANALYTICS REPORT",
    lineY: 28
  });
  addDownloadTimestamp(doc, { x: pageWidth - 14, y: 12, align: "right", timestamp: downloadedAt });

  autoTable(doc, {
    startY: 35,
    head: [[
      "Role",
      "ABS Number",
      "Name",
      "Gender",
      "District",
      "State",
      "Age",
      "Blood Group",
      "Phone Number",
      "Height",
      "Weight",
      "Communicable",
      "Non-Communicable",
      "Tests",
      "Medicines",
      "First Visit",
      "Last Visit"
    ]],
    body: data.map(r => [
      r.Role,
      r.ABS_NO || "—",
      r.Name,
      r.Gender || "—",
      r.District || "—",
      r.State || "—",
      r.Age ?? "—",
      r.Blood_Group || "—",
      r.Phone_No || "—",
      r.Height || "—",
      r.Weight || "—",
      (r.Communicable_Diseases || []).join(", "),
      (r.NonCommunicable_Diseases || []).join(", "),
      (r.Tests || []).map(t => `${t.Test_Name}:${t.Result_Value}`).join("; "),
      (r.Medicines || []).map(m => `${m.Medicine_Name} (${m.Quantity})`).join("; "),
      r.First_Visit_Date ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB") : "—",
      r.Last_Visit_Date ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB") : "—"
    ]),
    styles: { fontSize: 6 },
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
  const [heightMin, setHeightMin] = useState("");
  const [heightMax, setHeightMax] = useState("");
  const [weightMin, setWeightMin] = useState("");
  const [weightMax, setWeightMax] = useState("");
  const [masterMap, setMasterMap] = useState({});

  const roleOptions = getMasterOptions(masterMap, "Employee Report Roles");

  useEffect(() => {
    let mounted = true;
    const loadMaster = async () => {
      try {
        const data = await fetchMasterDataMap({ force: true });
        if (mounted) setMasterMap(data || {});
      } catch {
        if (mounted) setMasterMap({});
      }
    };

    loadMaster();
    const onMasterUpdated = () => loadMaster();
    window.addEventListener("master-data-updated", onMasterUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("master-data-updated", onMasterUpdated);
    };
  }, []);
  const [abnormalOnly, setAbnormalOnly] = useState(false);

  /* Pagination & Expand */
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/admin-api/analytics/all`)
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

    const toNumber = (v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };

    const hMin = toNumber(heightMin);
    const hMax = toNumber(heightMax);
    const wMin = toNumber(weightMin);
    const wMax = toNumber(weightMax);

    const heightOK =
      (hMin === null || (r.Height !== undefined && r.Height !== null && Number(r.Height) >= hMin)) &&
      (hMax === null || (r.Height !== undefined && r.Height !== null && Number(r.Height) <= hMax));

    const weightOK =
      (wMin === null || (r.Weight !== undefined && r.Weight !== null && Number(r.Weight) >= wMin)) &&
      (wMax === null || (r.Weight !== undefined && r.Weight !== null && Number(r.Weight) <= wMax));

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
      heightOK &&
      weightOK &&
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
      className="employee-reports-page"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(191,219,254,0.62), transparent 28%), radial-gradient(circle at right center, rgba(224,242,254,0.66), transparent 30%), linear-gradient(180deg, #F5FAFF, #EEF6FF)",
        minHeight: "100vh",
        padding: "28px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>
        {`
          .employee-reports-page .health-card {
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.74);
            border: 1px solid rgba(255, 255, 255, 0.85);
            box-shadow: 0 24px 44px rgba(148, 184, 255, 0.16);
            backdrop-filter: blur(18px);
          }

          .employee-reports-page .form-control,
          .employee-reports-page .form-check-input {
            border-color: rgba(191, 219, 254, 0.72);
          }

          .employee-reports-page .form-control {
            background: rgba(248, 250, 252, 0.96);
            box-shadow: 0 10px 22px rgba(148, 163, 184, 0.10);
          }

          .employee-reports-page .form-control:focus,
          .employee-reports-page .form-check-input:focus {
            border-color: #60A5FA;
            box-shadow: 0 0 0 0.18rem rgba(96, 165, 250, 0.14);
          }

          .employee-reports-page .table {
            --bs-table-bg: transparent;
          }

          .employee-reports-page .table thead th {
            background: #eff6ff;
            color: #1e3a8a;
            border-bottom: 1px solid rgba(191, 219, 254, 0.8);
            white-space: nowrap;
          }

          .employee-reports-page .table tbody tr:hover {
            background: rgba(239, 246, 255, 0.72);
          }

          .employee-reports-page .page-link {
            border-radius: 12px;
            margin: 0 4px;
            border-color: rgba(191, 219, 254, 0.8);
            color: #2563eb;
            box-shadow: 0 10px 20px rgba(191, 219, 254, 0.12);
          }

          .employee-reports-page .page-item.active .page-link {
            background: linear-gradient(135deg, #2563EB, #38BDF8);
            border-color: transparent;
          }
        `}
      </style>
      <div className="container-fluid">
  
        {/* ================= HEADER ================= */}
        <div className="mb-4 mt-4">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "7px 14px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(255,255,255,0.85)",
              color: "#2563EB",
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              marginBottom: 14,
              boxShadow: "0 12px 26px rgba(147,197,253,0.18)",
            }}
          >
            Health Analytics
          </div>
          <h3 style={{ fontWeight: 600, color: "#111827", marginBottom: 4, letterSpacing: "-0.03em" }}>
            Employee Medical Analytics
          </h3>
          <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
            Consolidated health records across all institutes
          </p>
        </div>
  
        {/* ================= FILTER PANEL ================= */}
        <div
          className="card mb-4 border-0 health-card"
        >
          <div className="card-body">
            <div className="row g-3 align-items-center">
  
              {[
                { el: (
                  <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="">All Roles</option>
                    {roleOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
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

              <div className="col-md-1">
                <input className="form-control" placeholder="Height ≥ (cm)" value={heightMin}
                  onChange={e => setHeightMin(e.target.value)}
                  style={{ height: 42, borderRadius: 10 }} />
              </div>

              <div className="col-md-1">
                <input className="form-control" placeholder="Height ≤ (cm)" value={heightMax}
                  onChange={e => setHeightMax(e.target.value)}
                  style={{ height: 42, borderRadius: 10 }} />
              </div>

              <div className="col-md-1">
                <input className="form-control" placeholder="Weight ≥ (kg)" value={weightMin}
                  onChange={e => setWeightMin(e.target.value)}
                  style={{ height: 42, borderRadius: 10 }} />
              </div>

              <div className="col-md-1">
                <input className="form-control" placeholder="Weight ≤ (kg)" value={weightMax}
                  onChange={e => setWeightMax(e.target.value)}
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
                <button
                  className="btn me-2 px-4"
                  onClick={() => downloadCSV(filteredRows)}
                  disabled={!filteredRows.length}
                  style={{
                    borderRadius: "16px",
                    paddingTop: "10px",
                    paddingBottom: "10px",
                    background: "linear-gradient(135deg, #059669, #2DD4BF)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                    boxShadow: "0 14px 28px rgba(45,212,191,0.22)",
                  }}
                >
                  Download CSV
                </button>
                <button
                  className="btn px-4"
                  onClick={() => downloadPDF(filteredRows)}
                  disabled={!filteredRows.length}
                  style={{
                    borderRadius: "16px",
                    paddingTop: "10px",
                    paddingBottom: "10px",
                    background: "linear-gradient(135deg, #2563EB, #38BDF8)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                    boxShadow: "0 14px 28px rgba(96,165,250,0.24)",
                  }}
                >
                  Download PDF
                </button>
              </div>
  
            </div>
          </div>
        </div>
  
        {/* ================= TABLE ================= */}
        <div
          className="card border-0 health-card"
        >
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead style={{ backgroundColor: "#F3F7FF" }}>
                <tr style={{ color: "#374151", fontSize: 14 }}>
                  {[
                    "Role",
                    "ABS Number",
                    "Name",
                    "Gender",
                    "District",
                    "State",
                    "Age",
                    "Blood Group",
                    "Phone Number",
                    "Height",
                    "Weight",
                    "Communicable",
                    "Non-Communicable",
                    "Tests",
                    "Medicines",
                    "First Visit",
                    "Last Visit",
                    "Details"
                  ].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
  
              <tbody>
                {paginatedRows.map((r, i) => {
                  const idx = indexOfFirst + i;
                  const expanded = expandedRow === idx;
  
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid #E5E7EB",
                        background: expanded ? "rgba(239,246,255,0.78)" : "transparent"
                      }}
                    >
                      <td>{r.Role}</td>
                      <td>{r.ABS_NO || "—"}</td>
                      <td style={{ fontWeight: 600 }}>{r.Name}</td>
                      <td>{r.Gender || "—"}</td>
                      <td>{r.District || "—"}</td>
                      <td>{r.State || "—"}</td>
                      <td>{r.Age ?? "—"}</td>
                      <td>{r.Blood_Group || "—"}</td>
                      <td>{r.Phone_No || "—"}</td>
                      <td>{r.Height || "—"}</td>
                      <td>{r.Weight || "—"}</td>

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
                          className="btn btn-sm admin-view-btn"
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
