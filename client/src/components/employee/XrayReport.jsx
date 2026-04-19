import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addCenteredReportHeader, addDownloadTimestamp, formatReportTimestamp, getReportInstitutionName } from "../../utils/reportPdf";
import PersonFilterDropdown from "../common/PersonFilterDropdown";
import { usePersonFilter } from "../../context/PersonFilterContext";
import DateRangeFilter from "../common/DateRangeFilter";
import PDFDownloadButton from "../common/PDFDownloadButton";
import "bootstrap/dist/css/bootstrap.min.css";

const XrayReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5200}`;

  const resolveUrl = (u) => {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    const base = (BACKEND_URL || '').replace(/\/$/, '');
    return `${base}/${String(u).replace(/^\/+/, '')}`;
  };
  const employeeObjectId = localStorage.getItem("employeeObjectId");
  const employeeId = localStorage.getItem("employeeId") || employeeObjectId;
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { selectedPersonId, setSelectedPersonId, options, loadingFamily } = usePersonFilter(employeeObjectId || employeeId);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filterByPerson = (rows, personId) => {
    const list = Array.isArray(rows) ? rows : [];
    if (personId === "all") return list;
    if (personId === "self") return list.filter((r) => !r.IsFamilyMember);
    return list.filter((r) => r.IsFamilyMember && String(r.FamilyMember?._id || "") === String(personId));
  };

  useEffect(() => {
    if (!employeeObjectId) return;
    setLoading(true);

    axios
      .get(`${BACKEND_URL}/xray-api/records/${employeeObjectId}`, {
        params: {
          employeeId,
          personId: selectedPersonId,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        },
      })
      .then((res) => {
        console.log("X-ray records fetched", res.data);
        setReports(filterByPerson(res.data || [], selectedPersonId));
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setReports([]);
        } else {
          console.error(err);
        }
      })
      .finally(() => setLoading(false));
  }, [employeeObjectId, employeeId, selectedPersonId, refreshKey, fromDate, toDate]);

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
    const instituteName = getReportInstitutionName(report.Institute?.Institute_Name);
    const reportDate = formatDate(report);
    const downloadedAt = formatReportTimestamp();
    const patientName = report.Employee?.Name || "Employee";
    const employeeIdText = report.Employee?.ABS_NO ? `(${report.Employee.ABS_NO})` : "";
    const issuedTo = report.IsFamilyMember ? `${report.FamilyMember?.Name} (${report.FamilyMember?.Relationship})` : "Self";

    addCenteredReportHeader(doc, {
      centerX: 148.5,
      left,
      right,
      institutionName: instituteName,
      title: "X-RAY REPORT",
      lineY: 30
    });
    addDownloadTimestamp(doc, { x: right, y: 12, align: "right", timestamp: downloadedAt });

    doc.setFontSize(10);
    doc.text(`Employee Name: ${patientName} ${employeeIdText}`, left, 40);
    doc.text(`Report For: ${issuedTo}`, left, 46);
    doc.text(`Test Date: ${reportDate}`, left, 52);

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
  const filteredReports = reports || [];

  return (
    <div
      className="employee-xray-page"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(191,219,254,0.62), transparent 24%), radial-gradient(circle at right center, rgba(224,242,254,0.74), transparent 28%), linear-gradient(180deg, #F5FAFF, #EEF6FF)",
        minHeight: "100vh",
        padding: "40px 0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>
        {`
          .employee-xray-page .report-card,
          .employee-xray-page .modal-content {
            background: rgba(255,255,255,0.78);
            border: 1px solid rgba(255,255,255,0.88);
            border-radius: 24px;
            box-shadow: 0 24px 44px rgba(148,184,255,0.18);
            backdrop-filter: blur(18px);
          }

          .employee-xray-page .table {
            --bs-table-bg: transparent;
          }

          .employee-xray-page .table thead th {
            background: #EFF6FF;
            color: #1E3A8A;
            border-color: rgba(191,219,254,0.78);
            white-space: nowrap;
          }

          .employee-xray-page .table tbody tr:hover {
            background: rgba(239,246,255,0.72);
          }
        `}
      </style>
      <div className="container">
        <button
          className="btn mb-3"
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(191,219,254,0.82)",
            borderRadius: "14px",
            padding: "6px 14px",
            fontSize: "14px",
            color: "#1F2933",
            boxShadow: "0 12px 20px rgba(191,219,254,0.14)",
          }}
        >
          ← Back
        </button>

        <div
          className="card border-0 report-card"
          style={{
            borderRadius: "24px",
          }}
        >
          <div className="card-body">
            <div
              style={{
                background: "linear-gradient(135deg, rgba(239,246,255,0.95), rgba(255,255,255,0.82))",
                padding: "16px 24px",
                borderBottom: "1px solid rgba(191,219,254,0.5)",
                borderRadius: "24px 24px 0 0",
              }}
              className="d-flex flex-column gap-2"
            >
              <div className="d-flex justify-content-between align-items-end w-100 flex-wrap gap-3">
                <h4 style={{ fontWeight: 600, color: "#1F2933", margin: 0 }}>
                  X‑ray Reports
                </h4>

                <div className="d-flex gap-3 align-items-end flex-wrap">
                  <div>
                    <PersonFilterDropdown
                      options={options}
                      value={selectedPersonId}
                      onChange={(val) => {
                        setSelectedPersonId(val);
                        setSelectedReport(null);
                      }}
                      loading={loadingFamily}
                    />
                  </div>

                  <div>
                    <DateRangeFilter fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} onApply={() => {
                      if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) return alert('From Date cannot be after To Date');
                      setRefreshKey(k => k + 1);
                    }} />
                  </div>

                  <div>
                    <button
                      className="btn btn-sm"
                      style={{
                        background: "linear-gradient(135deg, #2563EB, #38BDF8)",
                        color: "#FFFFFF",
                        borderRadius: "14px",
                        padding: "6px 16px",
                        fontWeight: 600,
                        border: "none",
                        height: "44px",
                        boxShadow: "0 14px 24px rgba(96,165,250,0.22)"
                      }}
                      onClick={() => setRefreshKey((p) => p + 1)}
                    >
                      Refresh
                    </button>
                  </div>

                  <div>
                    <PDFDownloadButton modulePath="xray-api" params={{ employeeId: employeeObjectId, personId: selectedPersonId, fromDate, toDate }} filenamePrefix={`Xray_${employeeId}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* summary count */}
            <div className="mt-2 mb-3 text-muted small">
              Showing {filteredReports.length} of {reports.length} report{reports.length === 1 ? "" : "s"}
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-secondary" role="status" />
              </div>
            ) : filteredReports.length === 0 ? (
              <p className="text-center text-muted">No records found for selected person.</p>
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
                      <th>Test Date</th>
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
            <div className="modal-content border-0">
              <div
                className="modal-header text-white"
                style={{ background: "linear-gradient(135deg, #2563EB, #38BDF8)", borderBottom: "none", borderRadius: "24px 24px 0 0" }}
              >
                <h5 className="modal-title">X‑ray Details</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>

              <div className="modal-body">
                <p><strong>Employee:</strong> {selectedReport.Employee?.Name}</p>
                <p><strong>Report For:</strong> {selectedReport.IsFamilyMember ? `${selectedReport.FamilyMember?.Name} (${selectedReport.FamilyMember?.Relationship})` : 'Self'}</p>
                <p><strong>Institute:</strong> {selectedReport.Institute?.Institute_Name}</p>
                <p><strong>Test Date:</strong> {formatDate(selectedReport)}</p>

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
                <button className="btn" onClick={() => setShowModal(false)} style={{ borderRadius: "14px", padding: "10px 16px", background: "rgba(255,255,255,0.84)", border: "1px solid rgba(191,219,254,0.82)", color: "#2563EB", fontWeight: 600 }}>Close</button>
                <button className="btn" onClick={() => downloadXrayReport(selectedReport)} style={{ borderRadius: "14px", padding: "10px 16px", background: "linear-gradient(135deg, #2563EB, #38BDF8)", border: "none", color: "#fff", fontWeight: 600, boxShadow: "0 14px 24px rgba(96,165,250,0.22)" }}>Download PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XrayReport;
