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
    const { isFamily, familyId } = req.query;

    const filter = {
      Employee: employeeId
    };

    if (isFamily === "true") {
      filter.IsFamilyMember = true;
      filter.FamilyMember = familyId;
    } else {
      filter.IsFamilyMember = false;
    }

    const records = await DiagnosisRecord.find(filter)
      .sort({ createdAt: -1 });

    res.json(records);

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

module.exports = diagnosisApp;
