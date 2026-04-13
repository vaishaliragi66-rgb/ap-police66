import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import diagnosticTestsByCategory from "../../data/diagnosticTests";
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
    if (t.Category) return t.Category;
    if (t.Test_ID && t.Test_ID.Group) return t.Test_ID.Group;
    try {
      const allCats = Object.keys(diagnosticTestsByCategory || {});
      for (const c of allCats) {
        const found = (diagnosticTestsByCategory[c] || []).find(x => x.name === t.Test_Name);
        if (found) return c;
      }
    } catch (e) {}
    return "";
  };


<<<<<<< HEAD
  /* ================= LAB REPORT PDF (SARCPL A4 Layout) ================= */
  const downloadLabReport = (report) => {
    const doc = new jsPDF("p", "mm", "a4");

    const left = 14;
    const right = 196;
    let y = 12;

    const instituteName = getReportInstitutionName(report.Institute?.Institute_Name);

    // Auto-generated metadata
    const createdAt = report.createdAt || report.Tests?.[0]?.Timestamp || new Date();
    const createdDate = new Date(createdAt);
    const reportDateStr = createdDate.toISOString().slice(0, 10);
    const reportTimeStr = createdDate.toTimeString().slice(0, 5);
    const reportId = report._id
      ? `SARCPL-DIAG-${reportDateStr.replace(/-/g, "")}-${String(report._id).slice(-6)}`
      : `SARCPL-DIAG-${reportDateStr.replace(/-/g, "")}-${Date.now()}`;

    const downloadedAt = formatReportTimestamp();

    // Header: Logo, Title, QR, Emergency flag
    // Logo placeholder
    doc.setLineWidth(0.3);
    doc.rect(left, 8, 24, 24);
    doc.setFontSize(8);
    doc.text("LOGO", left + 12, 20, { align: "center" });

    // Title centered
=======
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
>>>>>>> 808f4de89d9dec3056674d7f8be3c42218d2c5ba
    addCenteredReportHeader(doc, {
      centerX: 105,
      left,
      right,
<<<<<<< HEAD
      institutionName: "SARCPL Police Hospital",
      title: "DIAGNOSTIC REPORT",
      subtitle: instituteName,
      institutionY: 18,
      titleY: 26,
      lineY: 36
    });

    // QR placeholder (top-right)
    doc.rect(right - 30, 8, 30, 30);
    doc.setFontSize(8);
    doc.text("QR", right - 15, 23, { align: "center" });

    // Emergency flag (optional)
    const isEmergency = Boolean(report.IsCritical || report.IsEmergency || report.priority === "critical" || report.Emergency);
    if (isEmergency) {
      doc.setDrawColor(180, 0, 0);
      doc.setTextColor(180, 0, 0);
      doc.setFontSize(9);
      doc.text("EMERGENCY", right - 60, 18, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }

    // Download / generation timestamp
    addDownloadTimestamp(doc, { x: right, y: 12, align: "right", timestamp: downloadedAt });

    y = 42;

    // Report Metadata box
    doc.setFontSize(9);
    doc.setDrawColor(200);
    doc.rect(left, y - 6, right - left, 22);

    doc.setFont("helvetica", "bold");
    doc.text("Report ID:", left + 3, y);
    doc.setFont("helvetica", "normal");
    doc.text(reportId, left + 30, y);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", left + 110, y);
    doc.setFont("helvetica", "normal");
    doc.text(reportDateStr, left + 125, y);

    doc.setFont("helvetica", "bold");
    doc.text("Time:", left + 150, y);
    doc.setFont("helvetica", "normal");
    doc.text(reportTimeStr, left + 165, y);

    y += 14;

    // Patient Identification
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Patient Identification", left, y);
    doc.setLineWidth(0.3);
    doc.line(left, y + 2, right, y + 2);

    y += 8;
    const patientName = report.Employee?.Name || "-";
    const age = (() => {
      try {
        const dob = report.Employee?.DOB;
        if (!dob) return "-";
        const d = new Date(dob);
        const diff = new Date().getFullYear() - d.getFullYear();
        return diff;
      } catch { return "-"; }
    })();
    const gender = report.Employee?.Gender || (report.IsFamilyMember ? (report.FamilyMember?.Gender || "-") : "-");
    const absNo = report.Employee?.ABS_NO || report.Employee?._id || "-";
    const employeeObjectId = report.Employee?._id || "-";
    const phone = report.Employee?.Phone_No || report.Employee?.Phone || report.Employee?.Contact || "-";
    const email = report.Employee?.Email || "-";
    const address = (report.Employee?.Address && (report.Employee.Address.Street || report.Employee.Address.District))
      ? `${report.Employee.Address.Street || ""} ${report.Employee.Address.District || ""} ${report.Employee.Address.State || ""} ${report.Employee.Address.Pincode || ""}`
      : "-";

    doc.setFont("helvetica", "bold");
    doc.text("Name:", left, y + 8);
    doc.setFont("helvetica", "normal");
    doc.text(String(patientName), left + 24, y + 8);

    doc.setFont("helvetica", "bold");
    doc.text("Age:", left + 110, y + 8);
    doc.setFont("helvetica", "normal");
    doc.text(String(age), left + 125, y + 8);

    doc.setFont("helvetica", "bold");
    doc.text("Gender:", left + 140, y + 8);
    doc.setFont("helvetica", "normal");
    doc.text(String(gender), left + 160, y + 8);

    doc.setFont("helvetica", "bold");
    doc.text("Police ID (ABS_NO):", left, y + 16);
    doc.setFont("helvetica", "normal");
    doc.text(String(absNo), left + 40, y + 16);

    doc.setFont("helvetica", "bold");
    doc.text("Contact:", left + 110, y + 16);
    doc.setFont("helvetica", "normal");
    doc.text(`${phone} ${email !== '-' ? ' | ' + email : ''}`, left + 125, y + 16);

    doc.setFont("helvetica", "bold");
    doc.text("Address:", left, y + 24);
    doc.setFont("helvetica", "normal");
    doc.text(String(address), left + 24, y + 24);

    y += 34;

    // Clinical Information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Clinical Information", left, y);
    doc.line(left, y + 2, right, y + 2);
    y += 8;

    const department = report.Institute?.Institute_Name || "-";
    const consultingDoctor = report.Consulting_Doctor || report.Doctor || report.DoctorName || "-";
    const presentingComplaints = report.Presenting_Complaints || report.symptoms || report.Tests?.[0]?.Remarks || "-";
    const medicalHistory = report.Diagnosis_Notes || "-";

    doc.setFont("helvetica", "bold");
    doc.text("Department / Unit:", left, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(department), left + 36, y);

    doc.setFont("helvetica", "bold");
    doc.text("Consulting Doctor:", left + 110, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(consultingDoctor), left + 150, y);

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Chief Complaint(s):", left, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(presentingComplaints), left + 36, y);

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Medical History / Notes:", left, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(medicalHistory), left + 48, y);

    y += 12;

    // Vital Signs
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Vital Signs", left, y);
    doc.line(left, y + 2, right, y + 2);
    y += 8;

    const vit = report.Visit?.Vitals || report.Vitals || report.visit?.Vitals || {};
    const bp = vit.Blood_Pressure || vit.BP || vit.BloodPressure || "-";
    const pulse = vit.Pulse || vit.HeartRate || "-";
    const temp = vit.Temperature || vit.Temp || "-";
    const spo2 = vit.Oxygen || vit.SpO2 || "-";
    const grbs = vit.GRBS || vit.Sugar || vit.Random_Blood_Sugar || "-";

    doc.setFont("helvetica", "bold");
    doc.text("BP:", left, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(bp), left + 12, y);

    doc.setFont("helvetica", "bold");
    doc.text("Pulse:", left + 40, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(pulse), left + 56, y);

    doc.setFont("helvetica", "bold");
    doc.text("Temp (°C):", left + 80, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(temp), left + 100, y);

    doc.setFont("helvetica", "bold");
    doc.text("SpO2 (%):", left + 122, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(spo2), left + 142, y);

    doc.setFont("helvetica", "bold");
    doc.text("GRBS:", left + 160, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(grbs), left + 173, y);

    y += 12;

    // Examination Findings
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Examination Findings", left, y);
    doc.line(left, y + 2, right, y + 2);
    y += 8;

    const findings = report.Examination_Findings || report.Exam_Findings || report.Clinical_Findings || report.Diagnosis_Notes || "-";
    doc.setFont("helvetica", "normal");
    doc.text(String(findings), left, y);
    y += 12;

    // Diagnosis
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Diagnosis", left, y);
    doc.line(left, y + 2, right, y + 2);
    y += 8;

    const diagNotes = report.Diagnosis_Notes || "";
    const diagLines = String(diagNotes).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const primaryDiag = diagLines[0] || "-";
    const secondaryDiag = diagLines[1] || "-";

    doc.setFont("helvetica", "bold");
    doc.text("Primary Diagnosis:", left, y);
    doc.setFont("helvetica", "normal");
    doc.text(primaryDiag, left + 36, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Secondary Diagnosis:", left, y);
    doc.setFont("helvetica", "normal");
    doc.text(secondaryDiag, left + 44, y);
    y += 12;

    // Investigations Recommended
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Investigations Recommended", left, y);
    doc.line(left, y + 2, right, y + 2);
    y += 8;

    // Render test requests (if any) or leave blank for doctor
    const requested = report.Requested_Tests || report.Investigations || [];
    if (Array.isArray(requested) && requested.length > 0) {
      requested.forEach((r, i) => {
        doc.setFont("helvetica", "normal");
        doc.text(`- ${r}`, left + 2, y);
        y += 6;
      });
    } else {
      doc.setFont("helvetica", "normal");
      doc.text("(No additional investigations recorded)", left + 2, y);
      y += 8;
    }

    // Treatment Plan / Recommendations
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Treatment Plan / Recommendations", left, y);
    doc.line(left, y + 2, right, y + 2);
    y += 8;

    const treatment = report.Treatment || report.Treatment_Plan || "(Not recorded)";
    doc.setFont("helvetica", "normal");
    doc.text(String(treatment), left, y);
    y += 12;

    // Follow-up
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Follow-Up Instructions", left, y);
    doc.line(left, y + 2, right, y + 2);
    y += 8;

    const followUp = report.FollowUp || report.Follow_Up || "(Not specified)";
    doc.setFont("helvetica", "normal");
    doc.text(String(followUp), left, y);
    y += 18;

    // Tests table (results)
    if (Array.isArray(report.Tests) && report.Tests.length > 0) {
      const tableStart = y;
      const tableData = report.Tests.map((t) => {
        const category = t.Category || t.Test_ID?.Group || "";
        const status = getStatus(t.Result_Value, t.Test_ID?.Reference_Range || t.Reference_Range, report.Employee?.Gender) || "-";
        return [category, t.Test_Name, `${t.Result_Value || '-'} ${t.Units || ''}`.trim(), t.Reference_Range || '-', status];
      });

      autoTable(doc, {
        startY: tableStart,
        head: [["Category", "Test Name", "Result", "Reference", "Status"]],
        body: tableData,
        styles: { fontSize: 9 },
        margin: { left, right: 15 }
      });

      y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : y + 40;
    }

    // Attachments & Evidence
    if (report.Tests && report.Tests.some(t => Array.isArray(t.Reports) && t.Reports.length > 0)) {
      doc.setFont("helvetica", "bold");
      doc.text("Attachments:", left, y);
      y += 6;
      report.Tests.forEach((t) => {
        (t.Reports || []).forEach((r) => {
          doc.setFont("helvetica", "normal");
          doc.text(`- ${r.originalname || r.filename}  (${r.uploadedAt ? new Date(r.uploadedAt).toLocaleString() : 'uploaded'})`, left + 4, y);
          y += 6;
        });
      });
      y += 4;
    }

    // Doctor Authentication block
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Doctor Authentication", left, y);
    doc.line(left, y + 2, right, y + 2);
    y += 8;

    const doctorName = consultingDoctor || "";
    const regNo = report.Doctor_Reg_No || report.Registration_No || report.Doctor_Reg || "";
    const signedOn = report.Signed_On || report.signedAt || "";

    doc.setFont("helvetica", "bold");
    doc.text("Doctor:", left, y);
    doc.setFont("helvetica", "normal");
    doc.text(doctorName || "(Not recorded)", left + 18, y);

    doc.setFont("helvetica", "bold");
    doc.text("Reg. No:", left + 110, y);
    doc.setFont("helvetica", "normal");
    doc.text(regNo || "-", left + 135, y);
    y += 10;

    // Signature placeholders
    doc.setFont("helvetica", "normal");
    doc.text("Signature:", left, y);
    doc.line(left + 18, y + 1, left + 70, y + 1);

    doc.text("Seal:", left + 110, y);
    doc.line(left + 125, y + 1, left + 180, y + 1);

    y += 12;

    // Digital signature / audit
    doc.setFontSize(8);
    doc.text(`Digital Sig (hash): ${report.DigitalSignature || report.signatureHash || '-'}`, left, y);
    y += 5;
    doc.text(`Audit ID: ${report.Audit_ID || report.auditId || '-'}`, left, y);

    // Footer: confidentiality
    doc.setFontSize(8);
    doc.text("Confidential — For patient and treating clinician use only.", 105, 287, { align: "center" });

    const fileName = `Diagnosis_Report_${String(report._id || '').slice(-6) || reportId}.pdf`;
    doc.save(fileName);
=======
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
      // determine category: prefer saved Category, else use Test_ID.group, else try to infer from test name
      const category = t.Category || t.Test_ID?.Group || (() => {
        try {
          const allCats = Object.keys(diagnosticTestsByCategory || {});
          for (const c of allCats) {
            const found = (diagnosticTestsByCategory[c] || []).find(x => x.name === t.Test_Name);
            if (found) return c;
          }
        } catch (e) {}
        return "";
      })();

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
>>>>>>> 808f4de89d9dec3056674d7f8be3c42218d2c5ba
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
    style={{
      backgroundColor: "#F8FAFC",
      minHeight: "100vh",
      padding: "40px 0",
      fontFamily: "'Inter', sans-serif",
    }}
  >
    <div className="container">

      {/* Back Button */}
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

      {/* MAIN CARD */}
      <div
        className="card border-0"
        style={{
          borderRadius: "16px",
          boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
        }}
      >
        <div className="card-body">

          {/* Header Strip */}
        <div
          style={{
            background: "linear-gradient(90deg, #F8FAFC, #F3F7FF)",
            padding: "16px 24px",
            borderBottom: "1px solid #D6E0F0",
            borderRadius: "16px 16px 0 0",
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
                    backgroundColor: "#4A70A9",
                    color: "#FFFFFF",
                    borderRadius: "999px",
                    padding: "6px 16px",
                    fontWeight: 500,
                    border: "none",
                    height: "38px"
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
      <div className="modal-content">

        <div className="modal-header bg-primary text-white">
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
            className="btn btn-secondary"
            onClick={() => setShowModal(false)}
          >
            Close
          </button>

          <button
            className="btn btn-primary"
            onClick={() => downloadLabReport(selectedReport)}
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
