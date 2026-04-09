const express = require("express");
const mongoose = require("mongoose");
const diagnosisApp = express.Router();
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DiagnosisTest = require("../models/diagnostics_test");
const DiagnosisRecord = require("../models/diagnostics_record");
const Institute = require("../models/master_institute");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");
const MedicalAction = require("../models/medical_action");
const DailyVisit = require("../models/daily_visit");

const parseDateInput = (value, endOfDay = false) => {
  if (!value) return null;

  const raw = String(value).trim();
  const ddmmyyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const yyyymmdd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let parsed = null;

  if (ddmmyyyy) {
    parsed = new Date(
      parseInt(ddmmyyyy[3], 10),
      parseInt(ddmmyyyy[2], 10) - 1,
      parseInt(ddmmyyyy[1], 10)
    );
  } else if (yyyymmdd) {
    parsed = new Date(
      parseInt(yyyymmdd[1], 10),
      parseInt(yyyymmdd[2], 10) - 1,
      parseInt(yyyymmdd[3], 10)
    );
  } else {
    parsed = new Date(raw);
  }

  if (Number.isNaN(parsed.getTime())) return null;

  if (endOfDay) parsed.setHours(23, 59, 59, 999);
  else parsed.setHours(0, 0, 0, 0);

  return parsed;
};

const buildDateRange = (fromDate, toDate) => {
  let start = parseDateInput(fromDate, false);
  let end = parseDateInput(toDate, true);

  if (start && end && start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  return { start, end };
};

const isWithinDateRange = (value, start, end) => {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;

  return true;
};

const filterDiagnosisTestsByDate = (record, start, end) => {
  const tests = Array.isArray(record?.Tests) ? record.Tests : [];
  if (!start && !end) return tests;

  return tests.filter((test) =>
    isWithinDateRange(test?.Timestamp, start, end)
  );
};

const filterDiagnosisRecordsByDate = (records, start, end) => {
  const list = Array.isArray(records) ? records : [];

  return list
    .map((record) => {
      const filteredTests = filterDiagnosisTestsByDate(record, start, end);
      if (filteredTests.length === 0) return null;

      return {
        ...record,
        Tests: filteredTests
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = new Date(a.Tests[a.Tests.length - 1]?.Timestamp || a.createdAt || 0).getTime();
      const bTime = new Date(b.Tests[b.Tests.length - 1]?.Timestamp || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
};

const splitDiagnosisRecordsByDate = (records) => {
  const rows = [];

  (records || []).forEach((record) => {
    const tests = Array.isArray(record?.Tests) ? record.Tests : [];
    const groupedByDate = new Map();

    tests.forEach((test) => {
      const timestamp = test?.Timestamp ? new Date(test.Timestamp) : null;
      if (!timestamp || Number.isNaN(timestamp.getTime())) return;

      const key = timestamp.toISOString().split("T")[0];
      if (!groupedByDate.has(key)) groupedByDate.set(key, []);
      groupedByDate.get(key).push(test);
    });

    groupedByDate.forEach((groupedTests) => {
      rows.push({
        ...record,
        Tests: groupedTests
      });
    });
  });

  return rows.sort((a, b) => {
    const aTime = new Date(a.Tests[0]?.Timestamp || a.createdAt || 0).getTime();
    const bTime = new Date(b.Tests[0]?.Timestamp || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
};

const formatPdfDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(date);
};

const reportStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, reportsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const name = 'diag-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const reportUpload = multer({
  storage: reportStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

diagnosisApp.get("/tests", async (req, res) => {
  try {
    const tests = await DiagnosisTest.find().sort({ Group: 1, Test_Name: 1 });
    res.status(200).json(tests);
  } catch (err) {
    console.error("Error fetching tests:", err);
    res.status(500).json({ error: "Failed to fetch tests" });
  }
});

diagnosisApp.get("/visit/:visitId/doctor", async (req, res) => {
  try {
    const { visitId } = req.params;

    const actions = await MedicalAction.find({
      visit_id: visitId,
      action_type: "DOCTOR_DIAGNOSIS"
    }).sort({ created_at: -1 });

    if (!actions.length) {
      return res.json({
        visit_id: visitId,
        orders: []
      });
    }

    res.json({
      visit_id: visitId,
      orders: actions.map((action) => ({
        id: action._id,
        created_at: action.created_at,
        notes: action.data?.notes || action.remarks || "",
        tests: action.data?.tests || [],
        isFamilyMember:
          action.data?.is_family_member ??
          action.data?.IsFamilyMember ??
          false,
        familyMemberId:
          action.data?.family_member_id ??
          action.data?.FamilyMember_ID ??
          null
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch doctor tests" });
  }
});

diagnosisApp.get("/queue/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const visits = await DailyVisit.find({
      Institute_ID: instituteId,
      visit_date: { $gte: start, $lte: end }
    })
      .populate("employee_id")
      .populate("FamilyMember");

    const actions = await MedicalAction.find({
      action_type: "DOCTOR_DIAGNOSIS"
    });

    const visitIds = actions.map((action) => String(action.visit_id));

    const diagnosisVisits = visits.filter((visit) =>
      visitIds.includes(String(visit._id))
    );

    res.json(diagnosisVisits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch diagnosis queue" });
  }
});

diagnosisApp.post("/tests/add", async (req, res) => {
  try {
    const { Test_Name, Group, Reference_Range, Units } = req.body;

    if (!Test_Name) {
      return res.status(400).json({ message: "Test_Name required" });
    }

    const exists = await DiagnosisTest.findOne({ Test_Name });
    if (exists) {
      return res.status(400).json({ message: "Test already exists" });
    }

    const newTest = new DiagnosisTest({
      Test_Name,
      Group,
      Reference_Range,
      Units
    });
    await newTest.save();

    res.status(201).json({ message: "Test created", test: newTest });
  } catch (err) {
    console.error("Error adding test:", err);
    res.status(500).json({ error: "Failed to add test" });
  }
});

diagnosisApp.post(
  "/add",
  verifyToken,
  allowInstituteRoles("diagnosis"),
  reportUpload.array("reports"),
  async (req, res) => {
    try {

      const {
        Institute_ID,
        Employee_ID,
        IsFamilyMember,
        FamilyMember_ID,
        Diagnosis_Notes,
        visit_id
      } = req.body;

      /* -------------------------
         Parse Tests JSON
      ------------------------- */

      let Tests = [];

      try {
        Tests = JSON.parse(req.body.Tests || "[]");
      } catch (err) {
        Tests = [];
      }

      if (!Institute_ID || !Employee_ID || Tests.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      /* -------------------------
         Fetch reference data from DB
      ------------------------- */

      const testIds = [
        ...new Set(
          Tests.map((t) => t.Test_ID).filter((id) =>
            mongoose.Types.ObjectId.isValid(id)
          )
        )
      ];

      const testNames = [
        ...new Set(
          Tests.map((t) => (t.Test_Name || "").trim()).filter((n) => n)
        )
      ];

      const masterTests = [
        ...(testIds.length
          ? await DiagnosisTest.find({ _id: { $in: testIds } }).lean()
          : []),
        ...(testNames.length
          ? await DiagnosisTest.find({ Test_Name: { $in: testNames } })
              .collation({ locale: "en", strength: 2 })
              .lean()
          : [])
      ];

      const masterById = new Map(
        masterTests.map((t) => [t._id.toString(), t])
      );
      const masterByName = new Map(
        masterTests.map((t) => [(t.Test_Name || "").toLowerCase(), t])
      );

      Tests = Tests.map((test) => {
        const key = test.Test_ID ? String(test.Test_ID) : null;
        const master =
          (key ? masterById.get(key) : null) ||
          masterByName.get((test.Test_Name || "").toLowerCase()) ||
          null;

        return {
          ...test,
          Test_Name: master?.Test_Name || test.Test_Name,
          Group: master?.Group || test.Group || "",
          Reference_Range: master?.Reference_Range || test.Reference_Range || "",
          Units: master?.Units || test.Units || ""
        };
      });

      // Partial name fallback: if no exact match, try a contains match only when unique
      if (testNames.length) {
        for (let i = 0; i < Tests.length; i++) {
          const test = Tests[i];
          if (!test.Test_Name) continue;

          const hasExact =
            (test.Test_ID && masterById.has(String(test.Test_ID))) ||
            masterByName.has((test.Test_Name || "").toLowerCase());

          if (hasExact) continue;

          const safeName = (test.Test_Name || "").replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          const matches = await DiagnosisTest.find({
            Test_Name: { $regex: safeName, $options: "i" }
          })
            .limit(2)
            .lean();

          if (matches.length === 1) {
            const m = matches[0];
            Tests[i] = {
              ...test,
              Test_Name: m.Test_Name,
              Group: m.Group || test.Group || "",
              Reference_Range: m.Reference_Range || test.Reference_Range || "",
              Units: m.Units || test.Units || ""
            };
          }
        }
      }

      /* -------------------------
         Attach uploaded reports
      ------------------------- */

      const files = req.files || [];
let fileIndex = 0;

Tests.forEach((test) => {

  if (files[fileIndex]) {

    test.Reports = [
      {
        filename: files[fileIndex].filename,
        originalname: files[fileIndex].originalname,
        url: `/uploads/diagnosis_reports/${files[fileIndex].filename}`,
        uploadedBy: req.user?.id || "system",
        uploadedAt: new Date()
      }
    ];

    fileIndex++;

  }

});

      /* -------------------------
         Create query for record
      ------------------------- */

      const recordQuery = {
        Institute: Institute_ID,
        Employee: Employee_ID
      };

      if (IsFamilyMember === "true" || IsFamilyMember === true) {
        recordQuery.IsFamilyMember = true;
        recordQuery.FamilyMember = FamilyMember_ID;
      } else {
        recordQuery.IsFamilyMember = false;
      }

      let record = await DiagnosisRecord.findOne(recordQuery);

      /* -------------------------
         Create new record
      ------------------------- */

      if (!record) {

        record = new DiagnosisRecord({

          Institute: Institute_ID,
          Employee: Employee_ID,
          Visit: visit_id || null,

          IsFamilyMember:
            IsFamilyMember === "true" || IsFamilyMember === true,

          FamilyMember:
            (IsFamilyMember === "true" || IsFamilyMember === true)
              ? FamilyMember_ID
              : null,

          Tests: Tests.map((test) => ({
            Test_ID: test.Test_ID || null,
            Test_Name: test.Test_Name,
            Group: test.Group || "",
            Result_Value: test.Result_Value,
            Reference_Range: test.Reference_Range || "",
            Units: test.Units || "",
            Remarks: test.Remarks || Diagnosis_Notes || "",
            Reports: test.Reports || [],
            Timestamp: new Date()
          })),

          Diagnosis_Notes: Diagnosis_Notes || ""

        });

      } else {

        /* -------------------------
           Update existing record
        ------------------------- */

        Tests.forEach((test) => {

          const existingTest = record.Tests.find(
            (t) =>
              t.Test_ID &&
              test.Test_ID &&
              t.Test_ID.toString() === test.Test_ID.toString()
          );

          if (existingTest) {

            existingTest.Result_Value = test.Result_Value;

            existingTest.Reference_Range =
              test.Reference_Range || existingTest.Reference_Range;

            existingTest.Units =
              test.Units || existingTest.Units;

            existingTest.Remarks =
              test.Remarks || Diagnosis_Notes || existingTest.Remarks;

            existingTest.Timestamp = new Date();

            if (test.Reports) {
              existingTest.Reports = test.Reports;
            }

          } else {

            record.Tests.push({

              Test_ID: test.Test_ID || null,
              Test_Name: test.Test_Name,
              Group: test.Group || "",
              Result_Value: test.Result_Value,
              Reference_Range: test.Reference_Range || "",
              Units: test.Units || "",
              Remarks: test.Remarks || Diagnosis_Notes || "",
              Reports: test.Reports || [],
              Timestamp: new Date()

            });

          }

        });

      }

      await record.save();

      /* -------------------------
         Medical Action Log
      ------------------------- */

      try {

        await MedicalAction.create({

          employee_id: Employee_ID,
          visit_id: visit_id || null,

          action_type: "DIAGNOSIS_TEST",
          source: "LAB",

          data: {
            diagnosis_record_id: record._id,
            tests: Tests
          },

          remarks: Diagnosis_Notes || ""

        });

      } catch (logErr) {
        console.error("MedicalAction log failed:", logErr.message);
      }

      /* -------------------------
         Medical History Update
      ------------------------- */

      const historyEntry = {
        Date: new Date(),
        Diagnosis: "Diagnosis updated",
        Notes: Diagnosis_Notes || `Added ${Tests.length} new test(s)`
      };

      if (IsFamilyMember === "true" && FamilyMember_ID) {

        await FamilyMember.findByIdAndUpdate(
          FamilyMember_ID,
          { $push: { Medical_History: historyEntry } }
        );

      } else {

        await Employee.findByIdAndUpdate(
          Employee_ID,
          { $push: { Medical_History: historyEntry } }
        );

      }

      return res.status(200).json({
        message: "Diagnosis record saved successfully"
      });

    } catch (err) {

      console.error("Diagnosis save error:", err);

      return res.status(500).json({
        error: "Failed to save diagnosis",
        details: err.message
      });

    }
  }
);

diagnosisApp.get("/records/:employeeId", async (req, res) => {

  try {

    const { employeeId } = req.params;
    const { isFamily, familyId, personId } = req.query;

    const { fromDate, toDate } = req.query;

    console.debug('Diagnosis /records request', { employeeIdParam: employeeId, query: req.query });

    const filter = {
      Employee: employeeId
    };

    // Date range filter: match createdAt, top-level Timestamp or any Tests[].Timestamp
    const { start, end } = buildDateRange(fromDate, toDate);

    if (start || end) {
      const dateFilter = {};
      if (start) dateFilter.$gte = start;
      if (end) dateFilter.$lte = end;
      filter["Tests.Timestamp"] = dateFilter;
    }

    // Backward compatible filter handling:
    // - personId=all  => no person filter
    // - personId=self => self only
    // - personId=<id> => specific family member
    // - legacy isFamily/familyId still supported
    if (personId === "all") {
      // Include both self and family records
    } else if (personId === "self") {
      filter.IsFamilyMember = false;
    } else if (personId) {
      filter.IsFamilyMember = true;
      filter.FamilyMember = personId;
    } else if (isFamily === "true") {
      filter.IsFamilyMember = true;
      filter.FamilyMember = familyId;
    } else {
      filter.IsFamilyMember = false;
    }

    const records = await DiagnosisRecord.find(filter)
      .populate("Institute", "Institute_Name")
      .populate("Employee", "Name ABS_NO")
      .populate("FamilyMember", "Name Relationship")
      .populate("Tests.Test_ID", "Test_Name Reference_Range Units")
      .sort({ createdAt: -1 });

    const filteredRecords = filterDiagnosisRecordsByDate(
      records.map((record) => record.toObject()),
      start,
      end
    );

    console.debug('Diagnosis /records result count', {
      count: Array.isArray(filteredRecords) ? filteredRecords.length : 0
    });
    res.json(filteredRecords);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Failed to fetch diagnosis records" });

  }

});

// ---------- Upload report endpoint ----------
// Stores uploaded report files under uploads/diagnosis_reports and records metadata in DiagnosisRecord.Reports
const reportsDir = path.join(__dirname, '..', 'uploads', 'diagnosis_reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });




// --------- Upload diagnosis report endpoint ----------
// Note: placed after module.exports to avoid hoisting issues in some setups

// Fetch single diagnosis record by id (returns populated record including Reports)
diagnosisApp.get('/record/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid record id' });
    }
    
    const record = await DiagnosisRecord.findById(id)
    .populate('Institute', 'Institute_Name')
    .populate('Employee', 'Name ABS_NO')
    .populate('FamilyMember', 'Name Relationship')
    .populate('Tests.Test_ID')
    .exec();
    
    if (!record) return res.status(404).json({ message: 'Record not found' });

    res.json(record.toObject());
  } catch (err) {
    console.error('Fetch record error:', err);
    res.status(500).json({ message: 'Failed to fetch record', error: err.message });
  }
});

// Debug: list diagnosis records for an employee that have uploaded Reports
diagnosisApp.get('/records-with-reports/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { isFamily, familyId } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee id' });
    }
    
    const filter = { Employee: employeeId };
    if (isFamily === 'true' && familyId) {
      filter.IsFamilyMember = true;
      filter.FamilyMember = familyId;
    } else if (isFamily === 'false') {
      filter.IsFamilyMember = false;
    }
    
    const records = await DiagnosisRecord.find(filter)
    .select('Tests Diagnosis_Notes Reports Institute IsFamilyMember FamilyMember createdAt updatedAt')
    .populate('Institute', 'Institute_Name')
    .populate('FamilyMember', 'Name Relationship')
    .sort({ updatedAt: -1, createdAt: -1 });
    
    const withReports = (records || []).filter(r => Array.isArray(r.Reports) && r.Reports.length > 0).map(r => r.toObject());
    
    res.json({ count: withReports.length, records: withReports });
  } catch (err) {
    console.error('Records with reports error:', err);
    res.status(500).json({ message: 'Failed to fetch records with reports', error: err.message });
  }
});

// Download PDF for diagnosis records within an optional date range
const PDFDocument = require('pdfkit');
diagnosisApp.get('/download-pdf', async (req, res) => {
  try {
    const { employeeId, personId, fromDate, toDate } = req.query;
    if (!employeeId) return res.status(400).json({ message: 'employeeId is required' });

    console.debug('Diagnosis /download-pdf request', { query: req.query });

    const filter = { Employee: employeeId };
    if (personId === 'self') filter.IsFamilyMember = false;
    else if (personId && personId !== 'all') filter.IsFamilyMember = true, filter.FamilyMember = personId;

    const { start, end } = buildDateRange(fromDate, toDate);

    if (start || end) {
      const dateFilter = {};
      if (start) dateFilter.$gte = start;
      if (end) dateFilter.$lte = end;
      filter["Tests.Timestamp"] = dateFilter;
    }

    const records = await DiagnosisRecord.find(filter)
      .populate('Employee', 'Name ABS_NO')
      .populate('FamilyMember', 'Name Relationship')
      .populate('Institute', 'Institute_Name')
      .sort({ createdAt: -1 })
      .lean();

    const filteredRecords = filterDiagnosisRecordsByDate(records, start, end);
    const rows = splitDiagnosisRecordsByDate(filteredRecords);

    console.debug('Diagnosis /download-pdf result count', {
      count: Array.isArray(rows) ? rows.length : 0
    });

    // PDF generation
    const doc = new PDFDocument({ margin: 40 });
    const filename = `Diagnosis_Report_${employeeId}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Diagnosis Reports', { align: 'center' });
    doc.moveDown(0.2);
    const rangeText = fromDate || toDate ? `From: ${fromDate || '-'} To: ${toDate || '-'}` : 'All dates';
    doc.fontSize(10).text(`Patient: ${filteredRecords[0]?.Employee?.Name || 'Employee'} (${filteredRecords[0]?.Employee?.ABS_NO || '-'})`, { align: 'left' });
    doc.text(rangeText, { align: 'left' });
    doc.moveDown(0.5);

    if (!rows || rows.length === 0) {
      doc.text('No records found for the selected criteria.', { align: 'center' });
      doc.end();
      return;
    }

    let y = doc.y + 8;
    const pageBottom = () => doc.page.height - doc.page.margins.bottom;
    const columnX = [40, 65, 165, 290, 360, 440];
    const columnWidths = [25, 100, 125, 70, 80, 110];

    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('#', columnX[0], y, { width: columnWidths[0] });
      doc.text('Patient', columnX[1], y, { width: columnWidths[1] });
      doc.text('Report For', columnX[2], y, { width: columnWidths[2] });
      doc.text('Institute', columnX[3], y, { width: columnWidths[3] });
      doc.text('No. of Tests', columnX[4], y, { width: columnWidths[4] });
      doc.text('Test Date', columnX[5], y, { width: columnWidths[5] });
      y += 18;
      doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor('#cccccc').stroke();
      doc.font('Helvetica').fillColor('black');
    };

    drawHeader();

    rows.forEach((row, index) => {
      const patientText = `${row.Employee?.Name || '-'}${row.Employee?.ABS_NO ? ` (${row.Employee.ABS_NO})` : ''}`;
      const reportForText = row.IsFamilyMember
        ? `${row.FamilyMember?.Name || '-'} (${row.FamilyMember?.Relationship || '-'})`
        : 'Self';
      const instituteText = row.Institute?.Institute_Name || 'Medical Institute';
      const testDateText = formatPdfDateTime(row.Tests[0]?.Timestamp || row.createdAt);
      const lineHeight = Math.max(
        doc.heightOfString(String(index + 1), { width: columnWidths[0] }),
        doc.heightOfString(patientText, { width: columnWidths[1] }),
        doc.heightOfString(reportForText, { width: columnWidths[2] }),
        doc.heightOfString(instituteText, { width: columnWidths[3] }),
        doc.heightOfString(String(row.Tests.length), { width: columnWidths[4] }),
        doc.heightOfString(testDateText, { width: columnWidths[5] })
      ) + 8;

      if (y + lineHeight > pageBottom()) {
        doc.addPage();
        y = 40;
        drawHeader();
      }

      doc.fontSize(10);
      doc.text(String(index + 1), columnX[0], y, { width: columnWidths[0] });
      doc.text(patientText, columnX[1], y, { width: columnWidths[1] });
      doc.text(reportForText, columnX[2], y, { width: columnWidths[2] });
      doc.text(instituteText, columnX[3], y, { width: columnWidths[3] });
      doc.text(String(row.Tests.length), columnX[4], y, { width: columnWidths[4] });
      doc.text(testDateText, columnX[5], y, { width: columnWidths[5] });

      y += lineHeight;
      doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor('#e5e7eb').stroke();
    });

    doc.end();
  } catch (err) {
    console.error('Diagnosis PDF error:', err);
    res.status(500).json({ message: 'Failed to generate PDF', error: err.message });
  }
});

module.exports = diagnosisApp;
