import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "bootstrap/dist/css/bootstrap.min.css";

const DiagnosisReport = () => {
  const [reports, setReports] = useState([]);
  const navigate = useNavigate();
  console.log("EmployeeObjectId from localStorage:", localStorage.getItem("employeeObjectId"));
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const employeeObjectId = localStorage.getItem("employeeObjectId")
  const [refreshKey, setRefreshKey] = useState(0);

useEffect(() => {
  if (!employeeObjectId) return;

  axios
    .get(`http://localhost:${BACKEND_PORT}/diagnosis-api/records/${employeeObjectId}`)
    .then(res => setReports(res.data || []))
    .catch(err => {
      if (err.response?.status === 404) {
        setReports([]);
      } else {
        console.error(err);
      }
    });
}, [employeeObjectId, refreshKey]); // ✅ IMPORTANT

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
  const getStatus = (result, range) => {
    try {
      const value = parseFloat(result);
      const match = range?.match(/(\d+\.?\d*)-(\d+\.?\d*)/);
      if (!match || isNaN(value)) return "N/A";

      const low = parseFloat(match[1]);
      const high = parseFloat(match[2]);
      return value >= low && value <= high ? "Normal" : "Risk";
    } catch {
      return "N/A";
    }
  };

  /* ================= LAB REPORT PDF ================= */
  const downloadLabReport = (report) => {
    const doc = new jsPDF("p", "mm", "a4");

    // Margins
    const left = 15;
    const right = 195;

    const instituteName =
      report.Institute?.Institute_Name || "Medical Institute";

    const reportDate = formatDate(report);

    const patientName = report.Employee?.Name || "Employee";
    const employeeIdText = report.Employee?.ABS_NO
      ? `(${report.Employee.ABS_NO})`
      : "";

    const issuedTo = report.IsFamilyMember
      ? `${report.FamilyMember?.Name} (${report.FamilyMember?.Relationship})`
      : "Self";

    /* ---------- HEADER ---------- */
    doc.setFontSize(16);
    doc.text(instituteName.toUpperCase(), 105, 20, {
      align: "center"
    });

    doc.setFontSize(12);
    doc.text("DIAGNOSTIC LABORATORY REPORT", 105, 28, {
      align: "center"
    });

    doc.line(left, 32, right, 32);

    /* ---------- PATIENT DETAILS ---------- */
    doc.setFontSize(10);
    doc.text(`Employee Name: ${patientName} ${employeeIdText}`, left, 42);
    doc.text(`Report For: ${issuedTo}`, left, 48);
    doc.text(`Report Date: ${reportDate}`, left, 54);

    /* ---------- TEST TABLE ---------- */
    const tableData = report.Tests.map((t) => [
      t.Test_Name,
      `${t.Result_Value} ${t.Units || ""}`,
      t.Reference_Range || "-",
      getStatus(t.Result_Value, t.Reference_Range)
    ]);

    autoTable(doc, {
      startY: 62,
      head: [["Test Name", "Result", "Reference Range", "Status"]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 40, 40] },
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

      // group by yyyy-mm-dd
      const dateKey = new Date(test.Timestamp)
        .toISOString()
        .split("T")[0];

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
    <div className="container mt-5">
      <button
        className="btn btn-outline-dark mb-3"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="card shadow-sm">
        <div className="card-body">
          <h4 className="text-center mb-4 fw-bold">
            Diagnosis Reports
          </h4>
          <div className="text-end mb-3">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setRefreshKey(prev => prev + 1)}
            >
              Refresh Reports
            </button>
          </div>
          {reports.length === 0 ? (
            <p className="text-center text-muted">
              No diagnosis reports found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Patient</th>
                    <th>Report For</th>
                    <th>Institute</th>
                    <th>No. of Tests</th>
                    <th>Report Date</th>
                    <th>Lab Report</th>
                  </tr>
                </thead>
                <tbody>
                  {splitReportsByDate(reports).map((report, index) => (
                    <tr key={report._id}>
                      <td>{index + 1}</td>
                      <td>
                        {report.Employee?.Name}{" "}
                        {report.Employee?.ABS_NO
                          ? `(${report.Employee.ABS_NO})`
                          : ""}
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
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() =>
                            downloadLabReport(report)
                          }
                        >
                          Download Report
                        </button>
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
  );
};

export default DiagnosisReport;
