import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "bootstrap/dist/css/bootstrap.min.css";

const XrayReport = () => {
  const [reports, setReports] = useState([]);
  const [showType, setShowType] = useState("ALL"); // ALL | SELF | FAMILY
  const [familyFilter, setFamilyFilter] = useState("ALL");

  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5200}`;

  const resolveUrl = (u) => {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    const base = (BACKEND_URL || '').replace(/\/$/, '');
    return `${base}/${String(u).replace(/^\/+/, '')}`;
  };
  const employeeObjectId = localStorage.getItem("employeeObjectId");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!employeeObjectId) return;

    axios
      .get(`${BACKEND_URL}/xray-api/records/${employeeObjectId}`)
      .then((res) => {
        console.log("X-ray records fetched", res.data);
        setReports(res.data || []);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setReports([]);
        } else {
          console.error(err);
        }
      });
  }, [employeeObjectId, refreshKey]);

  const formatDate = (record) => {
    if (record?.Xrays?.length > 0 && record.Xrays[0].Timestamp) {
      const d = new Date(record.Xrays[0].Timestamp);
      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("en-IN");
    }
    if (record.Timestamp) {
      const d = new Date(record.Timestamp);
      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("en-IN");
    }
    if (record.createdAt) {
      const d = new Date(record.createdAt);
      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("en-IN");
    }
    return "N/A";
  };

  const splitReportsByDate = (records) => {
    const rows = [];

    records.forEach((record) => {
      if (!record.Xrays || record.Xrays.length === 0) return;

      const grouped = {};

      record.Xrays.forEach((x) => {
        if (!x.Timestamp) return;
        const dateKey = new Date(x.Timestamp).toISOString().split("T")[0];
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(x);
      });

      Object.values(grouped).forEach((xraysForDate) => {
        rows.push({
          ...record,
          Xrays: xraysForDate // override only the xrays for that date
        });
      });
    });

    return rows.sort((a, b) => new Date(b.Xrays[0].Timestamp) - new Date(a.Xrays[0].Timestamp));
  };

  const downloadXrayReport = (report) => {
    const doc = new jsPDF("l", "mm", "a4");

    const left = 15;
    const right = 282;
    const instituteName = report.Institute?.Institute_Name || "Medical Institute";
    const reportDate = formatDate(report);
    const patientName = report.Employee?.Name || "Employee";
    const employeeIdText = report.Employee?.ABS_NO ? `(${report.Employee.ABS_NO})` : "";
    const issuedTo = report.IsFamilyMember ? `${report.FamilyMember?.Name} (${report.FamilyMember?.Relationship})` : "Self";

    doc.setFontSize(16);
    doc.text(instituteName.toUpperCase(), 148.5, 18, { align: "center" });

    doc.setFontSize(12);
    doc.text("X-RAY REPORT", 148.5, 26, { align: "center" });

    doc.line(left, 30, right, 30);

    doc.setFontSize(10);
    doc.text(`Employee Name: ${patientName} ${employeeIdText}`, left, 40);
    doc.text(`Report For: ${issuedTo}`, left, 46);
    doc.text(`Report Date: ${reportDate}`, left, 52);

    const tableData = report.Xrays.map((x) => [
      x.Xray_Type || "-",
      x.Body_Part || "-",
      x.Side || "-",
      x.View || "-",
      x.Film_Size || "-",
      x.Findings || "-",
      x.Impression || "-",
      x.Remarks || "-"
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["Type", "Body Part", "Side", "View", "Size", "Findings", "Impression", "Remarks"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 40, 40] },
      margin: { left, right: 15 }
    });

    doc.setFontSize(9);
    doc.text("This is a system-generated X-ray report.", 148.5, doc.lastAutoTable.finalY + 12, { align: "center" });

    doc.save(`Xray_Report_${report._id.slice(-6)}.pdf`);
  };

  // derive filtered list
  const filteredReports = React.useMemo(() => {
    let list = reports || [];

    if (showType === "SELF") {
      list = list.filter(r => !r.IsFamilyMember);
    } else if (showType === "FAMILY") {
      list = list.filter(r => r.IsFamilyMember);
    }

    if (familyFilter !== "ALL") {
      list = list.filter(r => r.FamilyMember?._id === familyFilter);
    }

    return list;
  }, [reports, showType, familyFilter]);

  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        padding: "40px 0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="container">
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

        <div
          className="card border-0"
          style={{
            borderRadius: "16px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div className="card-body">
            <div
              style={{
                background: "linear-gradient(90deg, #F8FAFC, #F3F7FF)",
                padding: "16px 24px",
                borderBottom: "1px solid #D6E0F0",
                borderRadius: "16px 16px 0 0",
              }}
              className="d-flex flex-column gap-2"
            >
              <div className="d-flex justify-content-between align-items-center">
                <h4 style={{ fontWeight: 600, color: "#1F2933", margin: 0 }}>
                  X‑ray Reports
                </h4>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm"
                    style={{
                      backgroundColor: "#4A70A9",
                      color: "#FFFFFF",
                      borderRadius: "999px",
                      padding: "6px 16px",
                      fontWeight: 500,
                      border: "none",
                    }}
                    onClick={() => setRefreshKey((p) => p + 1)}
                  >
                    Refresh
                  </button>

                  </div>
              </div>

              {/* filter section */}
              <div className="d-flex gap-3 align-items-center">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 140 }}
                  value={showType}
                  onChange={(e) => setShowType(e.target.value)}
                >
                  <option value="ALL">Show: All</option>
                  <option value="SELF">Self</option>
                  <option value="FAMILY">Family</option>
                </select>

                {showType !== "SELF" && (
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 200 }}
                    value={familyFilter}
                    onChange={(e) => setFamilyFilter(e.target.value)}
                  >
                    <option value="ALL">Any family member</option>
                    {reports
                      .map(r => r.FamilyMember)
                      .filter(Boolean)
                      .filter((v, i, a) => a.findIndex(x => x._id === v._id) === i)
                      .map(fm => (
                        <option key={fm._id} value={fm._id}>
                          {fm.Name} ({fm.Relationship})
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            {/* summary count */}
            <div className="mt-2 mb-3 text-muted small">
              Showing {filteredReports.length} of {reports.length} report{reports.length === 1 ? "" : "s"}
            </div>

            {filteredReports.length === 0 ? (
              <p className="text-center text-muted">No x‑ray reports found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle" style={{ border: "1px solid #D6E0F0", borderRadius: "12px", overflow: "hidden" }}>
                  <thead style={{ backgroundColor: "#F3F7FF", color: "#1F2933", fontWeight: 600 }}>
                    <tr>
                      <th>#</th>
                      <th>Patient</th>
                      <th>Report For</th>
                      <th>Institute</th>
                      <th>No. of X‑rays</th>
                      <th>Report Date</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {splitReportsByDate(filteredReports).map((report, index) => (
                      <tr key={report._id + report.Xrays[0]?.Timestamp}>
                        <td>{index + 1}</td>
                        <td>
                          {report.Employee?.Name}
                          {report.Employee?.ABS_NO && ` (${report.Employee.ABS_NO})`}
                        </td>
                        <td>{report.IsFamilyMember ? `${report.FamilyMember?.Name} (${report.FamilyMember?.Relationship})` : "Self"}</td>
                        <td>{report.Institute?.Institute_Name || "Medical Institute"}</td>
                        <td>{report.Xrays.length}</td>
                        <td>{formatDate(report)}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm" style={{ borderRadius: "999px", border: "1px solid #4A70A9", backgroundColor: "#4A70A9", color: "#FFFFFF", fontWeight: 500 }} onClick={() => { setSelectedReport(report); setShowModal(true); }}>View</button>
                            <button className="btn btn-sm" style={{ borderRadius: "999px", border: "1px solid #4A70A9", backgroundColor: "#FFFFFF", color: "#4A70A9", fontWeight: 500 }} onClick={() => downloadXrayReport(report)}>Download</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && selectedReport && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">X‑ray Details</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>

              <div className="modal-body">
                <p><strong>Employee:</strong> {selectedReport.Employee?.Name}</p>
                <p><strong>Report For:</strong> {selectedReport.IsFamilyMember ? `${selectedReport.FamilyMember?.Name} (${selectedReport.FamilyMember?.Relationship})` : 'Self'}</p>
                <p><strong>Institute:</strong> {selectedReport.Institute?.Institute_Name}</p>
                <p><strong>Date:</strong> {formatDate(selectedReport)}</p>

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
                    {selectedReport.Xrays.map((x, i) => (
                      <tr key={i}>
                        <td>{x.Xray_Type || '-'}</td>
                        <td>{x.Body_Part || '-'}</td>
                        <td>{x.Side || '-'}</td>
                        <td>{x.View || '-'}</td>
                        <td>{x.Film_Size || '-'}</td>
                        <td>{x.Findings || '-'}</td>
                        <td>{x.Impression || '-'}</td>
                        <td>{x.Remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Per-Xray reports grouped under the table */}
                {selectedReport.Xrays && selectedReport.Xrays.some(x => x?.Reports && x.Reports.length > 0) && (
                  <div className="mt-3">
                    <strong>Uploaded Reports:</strong>
                    {selectedReport.Xrays.map((x, idx) => (
                      x?.Reports && x.Reports.length > 0 ? (
                        <div key={idx} className="mt-2">
                          <div className="fw-semibold">X‑ray #{idx + 1}: {x.Xray_Type || x.Body_Part || 'X‑ray'}</div>
                          <ul className="list-unstyled mt-1 mb-0">
                            {x.Reports.map((r, j) => {
                              const url = resolveUrl(r?.url);
                              return (
                                <li key={j} className="mb-1">
                                  {url ? (
                                    <>
                                      <a href={url} target="_blank" rel="noreferrer" className="me-2">{r?.originalname || r?.filename}</a>
                                      <a href={url} download className="btn btn-sm btn-outline-secondary">Download</a>
                                    </>
                                  ) : (
                                    <span className="text-muted">{r?.originalname || r?.filename}</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null
                    ))}
                  </div>
                )}

                {/* Record-level fallback reports */}
                {selectedReport?.Reports && selectedReport.Reports.length > 0 && (
                  <div className="mt-3">
                    <strong>Uploaded Reports (record-level):</strong>
                    <ul className="list-unstyled mt-2 mb-0">
                      {selectedReport.Reports.map((r, idx) => {
                        const url = resolveUrl(r?.url);
                        return (
                          <li key={idx} className="mb-1">
                            {url ? (
                              <>
                                <a href={url} target="_blank" rel="noreferrer" className="me-2">{r?.originalname || r?.filename}</a>
                                <a href={url} download className="btn btn-sm btn-outline-secondary">Download</a>
                              </>
                            ) : (
                              <span className="text-muted">{r?.originalname || r?.filename}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                <button className="btn btn-primary" onClick={() => downloadXrayReport(selectedReport)}>Download PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XrayReport;