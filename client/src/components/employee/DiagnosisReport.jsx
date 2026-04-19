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

const DiagnosisReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  console.log("EmployeeObjectId from localStorage:", localStorage.getItem("employeeObjectId"));
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const employeeObjectId = localStorage.getItem("employeeObjectId");
  const employeeId = localStorage.getItem("employeeId") || employeeObjectId;
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { selectedPersonId, setSelectedPersonId, options, loadingFamily } = usePersonFilter(employeeId);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

const getFamilyMemberId = (row) => {
  if (!row) return "";
  if (typeof row.FamilyMember === "string") return row.FamilyMember;
  if (row.FamilyMember?._id) return row.FamilyMember._id;
  if (row.FamilyMember_ID) return row.FamilyMember_ID;
  return "";
};

const filterReportsByPerson = (rows, personId) => {
  const list = Array.isArray(rows) ? rows : [];
  if (personId === "all") return list;
  if (personId === "self") return list.filter((r) => !r.IsFamilyMember);
  return list.filter((r) => r.IsFamilyMember && String(getFamilyMemberId(r)) === String(personId));
};

useEffect(() => {
  if (!employeeObjectId) return;

  setLoading(true);

  axios
    .get(`${BACKEND_URL}/diagnosis-api/records/${employeeObjectId}`, {
      params: {
        employeeId,
        personId: selectedPersonId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      }
    })
    .then(res => {
      const list = filterReportsByPerson(res.data || [], selectedPersonId);
      setReports(list);
    })
    .catch(err => {
      if (err.response?.status === 404) {
        setReports([]);
      } else {
        console.error(err);
      }
    })
    .finally(() => setLoading(false));
}, [employeeObjectId, employeeId, selectedPersonId, refreshKey, fromDate, toDate]); // ✅ IMPORTANT

  /* ================= DATE FIX (ONLY createdAt) ================= */
  const formatDate = (report) => {
    // Priority:
    // 1. First test timestamp
    // 2. Report-level Timestamp (future-safe)
    // 3. createdAt (future-safe)

    if (report?.Tests?.length > 0 && report.Tests[0].Timestamp) {
      const d = new Date(report.Tests[0].Timestamp);
      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("en-IN");
    }

    if (report.Timestamp) {
      const d = new Date(report.Timestamp);
      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("en-IN");
    }

    if (report.createdAt) {
      const d = new Date(report.createdAt);
      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("en-IN");
    }

    return "N/A";
  };

  /* ================= STATUS ================= */
  const evaluateAgainstRangeExpression = (value, expression) => {
    const exp = String(expression || "").replace(/[–—]/g, "-").trim();
    if (!exp) return null;

    const rangeMatch = exp.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1]);
      const high = parseFloat(rangeMatch[2]);
      return value >= low && value <= high;
    }

    const lessEqMatch = exp.match(/^<=\s*(\d+(?:\.\d+)?)$/);
    if (lessEqMatch) return value <= parseFloat(lessEqMatch[1]);

    const greaterEqMatch = exp.match(/^>=\s*(\d+(?:\.\d+)?)$/);
    if (greaterEqMatch) return value >= parseFloat(greaterEqMatch[1]);

    const lessMatch = exp.match(/^<\s*(\d+(?:\.\d+)?)$/);
    if (lessMatch) return value < parseFloat(lessMatch[1]);

    const greaterMatch = exp.match(/^>\s*(\d+(?:\.\d+)?)$/);
    if (greaterMatch) return value > parseFloat(greaterMatch[1]);

    return null;
  };

  const getStatus = (result, range, gender = "") => {
    try {
      const value = parseFloat(result);
      if (isNaN(value) || !range) return "N/A";

      const normalizedRange = String(range).replace(/[–—]/g, "-");
      const normalizedGender = String(gender || "").trim().toLowerCase();
      const isMale = normalizedGender.startsWith("m");
      const isFemale = normalizedGender.startsWith("f");

      const segments = normalizedRange.split("|").map((s) => s.trim()).filter(Boolean);
      const genderSpecific = [];
      const generic = [];

      segments.forEach((segment) => {
        const labeled = segment.match(/^(male|female|m|f)\s*[:=-]\s*(.+)$/i);
        if (labeled) {
          genderSpecific.push({
            label: labeled[1].toLowerCase(),
            expression: labeled[2].trim(),
          });
        } else {
          generic.push(segment);
        }
      });

      const preferred = [];
      if (genderSpecific.length > 0) {
        const genderMatch = genderSpecific.find((item) => (isMale && (item.label === "m" || item.label === "male")) || (isFemale && (item.label === "f" || item.label === "female")));
        if (genderMatch) preferred.push(genderMatch.expression);
      }
      preferred.push(...generic);

      for (const expression of preferred) {
        const ok = evaluateAgainstRangeExpression(value, expression);
        if (ok !== null) return ok ? "Normal" : "Risk";
      }

      // Fallback for ranges without explicit separator, e.g. "M: 4.7-6.1 F: 4.2-5.4"
      const maleInline = normalizedRange.match(/(?:male|\bm\b)\s*[:=-]\s*([^|,;]+)/i);
      const femaleInline = normalizedRange.match(/(?:female|\bf\b)\s*[:=-]\s*([^|,;]+)/i);
      const inlineExpression = (isMale && maleInline?.[1]) || (isFemale && femaleInline?.[1]) || null;
      if (inlineExpression) {
        const ok = evaluateAgainstRangeExpression(value, inlineExpression);
        if (ok !== null) return ok ? "Normal" : "Risk";
      }

      return "N/A";
    } catch {
      return "N/A";
    }
  };

  // determine category for a test object
  const getCategoryForTest = (t) => {
    if (!t) return "";
    if (t.Group) return t.Group;
    if (t.Category) return t.Category;
    if (t.Test_ID && t.Test_ID.Group) return t.Test_ID.Group;
    return "";
  };


  /* ================= LAB REPORT PDF ================= */
  const downloadLabReport = (report) => {
    const doc = new jsPDF("p", "mm", "a4");

    // Margins
    const left = 15;
    const right = 195;

    const instituteName = getReportInstitutionName(report.Institute?.Institute_Name);

    const reportDate = formatDate(report);
    const downloadedAt = formatReportTimestamp();

    const patientName = report.Employee?.Name || "Employee";
    const employeeIdText = report.Employee?.ABS_NO
      ? `(${report.Employee.ABS_NO})`
      : "";

    const issuedTo = report.IsFamilyMember
      ? `${report.FamilyMember?.Name} (${report.FamilyMember?.Relationship})`
      : "Self";

    /* ---------- HEADER ---------- */
    addCenteredReportHeader(doc, {
      centerX: 105,
      left,
      right,
      institutionName: instituteName,
      title: "DIAGNOSTIC LABORATORY REPORT",
      lineY: 32
    });
    addDownloadTimestamp(doc, { x: right, y: 12, align: "right", timestamp: downloadedAt });

    /* ---------- PATIENT DETAILS ---------- */
    doc.setFontSize(10);
    doc.text(`Employee Name: ${patientName} ${employeeIdText}`, left, 42);
    doc.text(`Report For: ${issuedTo}`, left, 48);
    doc.text(`Test Date: ${reportDate}`, left, 54);

    /* ---------- TEST TABLE ---------- */
    const tableData = report.Tests.map((t) => {
      const category = getCategoryForTest(t);

      return [
        category,
        t.Test_Name,
        `${t.Result_Value} ${t.Units || ""}`,
        t.Test_ID?.Reference_Range || t.Reference_Range || "-",
        getStatus(t.Result_Value, t.Test_ID?.Reference_Range || t.Reference_Range, report.Employee?.Gender)
      ];
    });

    autoTable(doc, {
      startY: 62,
      head: [["Category", "Test Name", "Result", "Reference Range", "Status"]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 40, 40] },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.raw?.[4] === "Risk" && data.column.index === 2) {
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left, right: 15 }
    });

    /* ---------- FOOTER ---------- */
    doc.setFontSize(9);
    doc.text(
      "This is a system-generated diagnostic laboratory report.",
      105,
      doc.lastAutoTable.finalY + 15,
      { align: "center" }
    );

    doc.save(`Lab_Report_${report._id.slice(-6)}.pdf`);
  };

  const splitReportsByDate = (records) => {
  const rows = [];

  records.forEach((record) => {
    if (!record.Tests || record.Tests.length === 0) return;

    const grouped = {};

    record.Tests.forEach((test) => {
      if (!test.Timestamp) return;

      const testDate = new Date(test.Timestamp);
      if (Number.isNaN(testDate.getTime())) return;

      const dateKey = [
        testDate.getFullYear(),
        String(testDate.getMonth() + 1).padStart(2, "0"),
        String(testDate.getDate()).padStart(2, "0")
      ].join("-");

      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(test);
    });

    Object.values(grouped).forEach((testsForDate) => {
      rows.push({
        ...record,
        Tests: testsForDate // ✅ override tests for that date only
      });
    });
  });

  // latest first
  return rows.sort(
    (a, b) =>
      new Date(b.Tests[0].Timestamp) -
      new Date(a.Tests[0].Timestamp)
  );
};

return (
  <div
    className="employee-diagnosis-page"
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
        .employee-diagnosis-page .report-card,
        .employee-diagnosis-page .modal-content {
          background: rgba(255,255,255,0.78);
          border: 1px solid rgba(255,255,255,0.88);
          border-radius: 24px;
          box-shadow: 0 24px 44px rgba(148,184,255,0.18);
          backdrop-filter: blur(18px);
        }

        .employee-diagnosis-page .table {
          --bs-table-bg: transparent;
        }

        .employee-diagnosis-page .table thead th {
          background: #EFF6FF;
          color: #1E3A8A;
          border-color: rgba(191,219,254,0.78);
          white-space: nowrap;
        }

        .employee-diagnosis-page .table tbody tr:hover {
          background: rgba(239,246,255,0.72);
        }
      `}
    </style>
    <div className="container">

      {/* Back Button */}
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

      {/* MAIN CARD */}
      <div
        className="card border-0 report-card"
        style={{
          borderRadius: "24px",
        }}
      >
        <div className="card-body">

          {/* Header Strip */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(239,246,255,0.95), rgba(255,255,255,0.82))",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(191,219,254,0.5)",
            borderRadius: "24px 24px 0 0",
          }}
          className="d-flex justify-content-between align-items-center"
        >
          <div className="d-flex align-items-center justify-content-between gap-3 w-100 flex-wrap">
            <h4 style={{ fontWeight: 600, color: "#1F2933", margin: 0 }}>
              Diagnosis Reports
            </h4>
            <div className="d-flex gap-3 align-items-end">
              <PersonFilterDropdown
                options={options}
                value={selectedPersonId}
                onChange={(val) => {
                  setSelectedPersonId(val);
                  setSelectedReport(null);
                }}
                loading={loadingFamily}
                className="mb-0"
              />

              <div className="d-flex align-items-end">
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
                <PDFDownloadButton modulePath="diagnosis-api" params={{ employeeId: employeeObjectId, personId: selectedPersonId, fromDate, toDate }} filenamePrefix={`Diagnosis_${employeeObjectId}`} />
              </div>

            </div>
          </div>
        </div>


          {/* Empty State */}
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-secondary" role="status" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-center text-muted">
              No records found for selected person.
            </p>
          ) : (
            <div className="table-responsive">
                    <table
        className="table align-middle"
        style={{
          border: "1px solid #D6E0F0",
          borderRadius: "12px",
          overflow: "hidden",
        }}
            >

            <thead
              style={{
                backgroundColor: "#F3F7FF",
                color: "#1F2933",
                fontWeight: 600,
              }}
            >

                  <tr>
                    <th>#</th>
                    <th>Patient</th>
                    <th>Report For</th>
                    <th>Institute</th>
                    <th>No. of Tests</th>
                    <th>Test Date</th>
                    <th>Lab Report</th>
                  </tr>
                </thead>

                <tbody>
                  {splitReportsByDate(reports).map((report, index) => (
                    <tr key={report._id + report.Tests[0]?.Timestamp}>
                      <td>{index + 1}</td>

                      <td>
                        {report.Employee?.Name}
                        {report.Employee?.ABS_NO &&
                          ` (${report.Employee.ABS_NO})`}
                      </td>

                      <td>
                        {report.IsFamilyMember
                          ? `${report.FamilyMember?.Name} (${report.FamilyMember?.Relationship})`
                          : "Self"}
                      </td>

                      <td>
                        {report.Institute?.Institute_Name ||
                          "Medical Institute"}
                      </td>

                      <td>{report.Tests.length}</td>

                      <td>{formatDate(report)}</td>

                      <td>
                        <div className="d-flex gap-2">

                          {/* VIEW BUTTON */}
                          <button
                            className="btn btn-sm"
                            style={{
                              borderRadius: "999px",
                              border: "1px solid #4A70A9",
                              backgroundColor: "#4A70A9",
                              color: "#FFFFFF",
                              fontWeight: 500,
                            }}
                            onClick={() => {
                              setSelectedReport(report);
                              setShowModal(true);
                            }}
                          >
                            View
                          </button>

                          {/* DOWNLOAD BUTTON */}
                          <button
                            className="btn btn-sm"
                            style={{
                              borderRadius: "999px",
                              border: "1px solid #4A70A9",
                              backgroundColor: "#FFFFFF",
                              color: "#4A70A9",
                              fontWeight: 500,
                            }}
                            onClick={() => downloadLabReport(report)}
                          >
                            Download
                          </button>

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
          <h5 className="modal-title">
            Diagnosis Report Details
          </h5>
          <button
            className="btn-close btn-close-white"
            onClick={() => setShowModal(false)}
          />
        </div>

        <div className="modal-body">

          <p><strong>Employee:</strong> {selectedReport.Employee?.Name}</p>
          <p>
            <strong>Report For:</strong>{" "}
            {selectedReport.IsFamilyMember
              ? `${selectedReport.FamilyMember?.Name} (${selectedReport.FamilyMember?.Relationship})`
              : "Self"}
          </p>
          <p><strong>Institute:</strong> {selectedReport.Institute?.Institute_Name}</p>
          <p><strong>Test Date:</strong> {formatDate(selectedReport)}</p>

          <hr />

          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th>Category</th>
                <th>Test Name</th>
                <th>Result</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Report</th>
              </tr>
            </thead>
            <tbody>
              {selectedReport.Tests.map((t, i) => {

                const reports = t.Reports || [];

                const category = getCategoryForTest(t);

                return (
                  <tr key={i}>
                    <td>{category}</td>
                    <td>{t.Test_Name}</td>

                    <td>{t.Result_Value} {t.Units}</td>

                    <td>{t.Test_ID?.Reference_Range || t.Reference_Range}</td>

                    <td>
                      <span className={`badge ${
                        getStatus(
                          t.Result_Value,
                          t.Test_ID?.Reference_Range || t.Reference_Range,
                          selectedReport.Employee?.Gender
                        ) === "Normal"
                          ? "bg-success"
                          : "bg-danger"
                      }`}>
                        {getStatus(
                          t.Result_Value,
                          t.Test_ID?.Reference_Range || t.Reference_Range,
                          selectedReport.Employee?.Gender
                        )}
                      </span>
                    </td>

                    {/* REPORT BUTTON COLUMN */}
                    <td>
                      {reports.length > 0 ? (
                        reports.map((r, ri) => (
                          <a
                            key={ri}
                            href={`${BACKEND_URL}${r.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-outline-primary me-1"
                          >
                            View
                          </a>
                        ))
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          disabled
                        >
                          No Report
                        </button>
                      )}
                    </td>
                  </tr>
                );

              })}
            </tbody>
          </table>

        </div>

        <div className="modal-footer">
          <button
            className="btn"
            onClick={() => setShowModal(false)}
            style={{
              borderRadius: "14px",
              padding: "10px 16px",
              background: "rgba(255,255,255,0.84)",
              border: "1px solid rgba(191,219,254,0.82)",
              color: "#2563EB",
              fontWeight: 600,
            }}
          >
            Close
          </button>

          <button
            className="btn"
            onClick={() => downloadLabReport(selectedReport)}
            style={{
              borderRadius: "14px",
              padding: "10px 16px",
              background: "linear-gradient(135deg, #2563EB, #38BDF8)",
              border: "none",
              color: "#fff",
              fontWeight: 600,
              boxShadow: "0 14px 24px rgba(96,165,250,0.22)",
            }}
          >
            Download PDF
          </button>
        </div>

      </div>
    </div>
  </div>
)}

  </div>
);

};

export default DiagnosisReport;
