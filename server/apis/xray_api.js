const express = require("express");
const mongoose = require("mongoose");
const xrayApp = express.Router();
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const Xray = require("../models/XraySchema"); // master xray list
const XrayRecord = require("../models/XrayRecordSchema");

const Institute = require("../models/master_institute");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");
const MedicalAction = require("../models/medical_action");
const DailyVisit = require("../models/daily_visit");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Admin helper: move a record-level report into a specific Xray subdocument.
xrayApp.post('/migrate-report', async (req, res) => {
  try {
    const { Record_ID, filename, xrayIndex } = req.body;
    if (!Record_ID || !filename) return res.status(400).json({ message: 'Record_ID and filename required' });

    const record = await XrayRecord.findById(Record_ID);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const report = (record.Reports || []).find(r => r.filename === filename || r.originalname === filename || String(r._id) === String(filename));
    if (!report) return res.status(404).json({ message: 'Report not found on record-level', availableReports: (record.Reports || []).map(r => r.filename) });

    let target = null;
    if (typeof xrayIndex !== 'undefined') {
      const idx = parseInt(xrayIndex, 10);
      if (isNaN(idx) || idx < 0 || idx >= (record.Xrays || []).length) return res.status(400).json({ message: 'Invalid xrayIndex' });
      target = idx;
    } else {
      const uploadedAt = report.uploadedAt ? new Date(report.uploadedAt) : null;
      if (!uploadedAt) return res.status(400).json({ message: 'Report has no uploadedAt; provide xrayIndex' });
      let best = { idx: -1, diff: Number.POSITIVE_INFINITY };
      (record.Xrays || []).forEach((x, idx) => {
        const t = x.Timestamp ? new Date(x.Timestamp) : null;
        if (!t) return;
        const diff = Math.abs(t - uploadedAt);
        if (diff < best.diff) best = { idx, diff };
      });
      if (best.idx === -1) return res.status(400).json({ message: 'No xray timestamps found; provide xrayIndex' });
      target = best.idx;
    }

    // remove from record-level
    record.Reports = (record.Reports || []).filter(r => !(r.filename === report.filename && String(r._id) === String(report._id)));

    if (!record.Xrays[target].Reports) record.Xrays[target].Reports = [];
    record.Xrays[target].Reports.push(report);

    await record.save();
    return res.json({ message: 'Report moved', recordId: record._id, targetIndex: target });
  } catch (err) {
    console.error('migrate-report error', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ GET master test list
xrayApp.get("/tests", async (req, res) => {
  try {
    const tests = await DiagnosisTest.find().sort({ Group: 1, Test_Name: 1 });
    res.status(200).json(tests);
  } catch (err) {
    console.error("Error fetching tests:", err);
    res.status(500).json({ error: "Failed to fetch tests" });
  }
});

// ---------- Upload X-ray report endpoint ----------
// Stores uploaded files under uploads/xray_reports and records metadata in XrayRecord.Reports
const xrayReportsDir = path.join(__dirname, '..', 'uploads', 'xray_reports');
if (!fs.existsSync(xrayReportsDir)) fs.mkdirSync(xrayReportsDir, { recursive: true });

const xrayStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, xrayReportsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const name = 'xray-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const xrayUpload = multer({ storage: xrayStorage, limits: { fileSize: 20 * 1024 * 1024 } });

xrayApp.post('/upload', verifyToken, allowInstituteRoles('xray'), xrayUpload.single('report'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const { Employee_ID, Institute_ID, IsFamilyMember, FamilyMember_ID } = req.body;
    if (!Institute_ID || !Employee_ID) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'Institute_ID and Employee_ID are required' });
    }

    const recordQuery = { Institute: Institute_ID, Employee: Employee_ID };
    if (IsFamilyMember === 'true' || IsFamilyMember === true) {
      recordQuery.IsFamilyMember = true;
      recordQuery.FamilyMember = FamilyMember_ID || null;
    } else {
      recordQuery.IsFamilyMember = false;
    }

    // Allow client to target a specific X-ray record by id. Otherwise pick the most
    // recent matching record (createdAt desc) to avoid attaching to the wrong older record.
    const { Record_ID } = req.body;
    let record = null;
    if (Record_ID && mongoose.Types.ObjectId.isValid(Record_ID)) {
      record = await XrayRecord.findById(Record_ID);
    }
    if (!record) {
      record = await XrayRecord.findOne(recordQuery).sort({ createdAt: -1 });
    }
    if (!record) {
      record = new XrayRecord({
        Institute: Institute_ID,
        Employee: Employee_ID,
        IsFamilyMember: recordQuery.IsFamilyMember || false,
        FamilyMember: recordQuery.FamilyMember || null,
        Xrays: [],
        Xray_Notes: ''
      });
    }

    const fileMeta = {
      filename: file.filename,
      originalname: file.originalname,
      url: `/uploads/xray_reports/${file.filename}`,
      uploadedBy: req.user?.instituteId || req.user?.id || 'unknown',
      uploadedAt: new Date()
    };
    // Support attaching report to a specific X-ray within the record.
    // Client may send one of: XrayEntryId, Xray_Index, Xray_Timestamp
    const { XrayEntryId, Xray_Index, Xray_Timestamp } = req.body;

    let attached = false;
    if (XrayEntryId) {
      const xr = record.Xrays && record.Xrays.id ? record.Xrays.id(XrayEntryId) : null;
      if (xr) {
        xr.Reports = xr.Reports || [];
        xr.Reports.push(fileMeta);
        attached = true;
      }
    }

    if (!attached && typeof Xray_Index !== 'undefined') {
      const idx = parseInt(Xray_Index, 10);
      if (!isNaN(idx) && Array.isArray(record.Xrays) && record.Xrays[idx]) {
        record.Xrays[idx].Reports = record.Xrays[idx].Reports || [];
        record.Xrays[idx].Reports.push(fileMeta);
        attached = true;
      }
    }

    if (!attached && Xray_Timestamp) {
      const found = (record.Xrays || []).find(x => {
        if (!x.Timestamp) return false;
        try {
          return new Date(x.Timestamp).toISOString() === new Date(Xray_Timestamp).toISOString();
        } catch { return false; }
      });
      if (found) {
        found.Reports = found.Reports || [];
        found.Reports.push(fileMeta);
        attached = true;
      }
    }

    if (!attached) {
      // Fallback to record-level Reports (legacy behavior)
      record.Reports = record.Reports || [];
      record.Reports.push(fileMeta);
    }

    await record.save();

    return res.status(201).json({ message: 'X-ray report uploaded', report: fileMeta, recordId: record._id, attachedToXray: attached });
  } catch (err) {
    console.error('X-ray upload error:', err);
    return res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});
// ---------- DEBUG: Unauthenticated upload (for troubleshooting only) ----------
// Note: temporary endpoint to verify multer/storage behavior without auth.
xrayApp.post('/upload-debug', xrayUpload.single('report'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const fileMeta = {
      filename: file.filename,
      originalname: file.originalname,
      url: `/uploads/xray_reports/${file.filename}`,
      uploadedAt: new Date()
    };

    return res.status(201).json({ message: 'Debug upload saved', file: fileMeta });
  } catch (err) {
    console.error('X-ray debug upload error:', err);
    return res.status(500).json({ message: 'Debug upload failed', error: err.message });
  }
});
// GET all X-ray types
xrayApp.get("/types", async (req, res) => {
  try {
    const xrays = await Xray.find().sort({ Xray_Type: 1 });
    res.json(xrays);
  } catch (err) {
    console.error("Error fetching X-ray types:", err);
    res.status(500).json({ message: "Server error" });
  }
});

xrayApp.get("/visit/:visitId/doctor", async (req, res) => {
  try {
    const { visitId } = req.params;

    const actions = await MedicalAction.find({
      visit_id: visitId,
      action_type: "DOCTOR_XRAY"
    }).sort({ createdAt: -1 });

    if (!actions.length) {
      return res.json({ xrays: [] });
    }

    const xrays = actions.flatMap(a => a.data?.xrays || []);

    res.json({
      visit_id: visitId,
      xrays
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch doctor xrays" });
  }
});


xrayApp.get("/queue/:instituteId", async (req, res) => {
  try {

    const { instituteId } = req.params;

    const start = new Date();
    start.setHours(0,0,0,0);

    const end = new Date();
    end.setHours(23,59,59,999);

    const visits = await DailyVisit.find({
      Institute_ID: instituteId,
      visit_date: { $gte: start, $lte: end }   // only today tokens
    })
    .populate("employee_id")
    .populate("FamilyMember");

    const actions = await MedicalAction.find({
      action_type: "DOCTOR_XRAY"
    });

    const visitIds = actions.map(a => String(a.visit_id));

    const xrayVisits = visits.filter(v =>
      visitIds.includes(String(v._id))
    );

    res.json(xrayVisits);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch x-ray queue" });
  }
});

xrayApp.post("/xrays/add", async (req, res) => {
  try {
    const {
      Xray_Type,
      Body_Part,
      Side,
      View,
      Film_Size
    } = req.body;

    if (!Xray_Type || !Body_Part) {
      return res.status(400).json({
        message: "Xray_Type and Body_Part are required"
      });
    }

    // check duplicate
    const exists = await Xray.findOne({
      Xray_Type,
      Body_Part,
      View
    });

    if (exists) {
      return res.status(400).json({
        message: "X-ray type already exists"
      });
    }

    const newXray = new Xray({
      Xray_Type,
      Body_Part,
      Side: Side || "NA",
      View: View || "",
      Film_Size: Film_Size || ""
    });

    await newXray.save();

    res.status(201).json({
      message: "X-ray created",
      xray: newXray
    });

  } catch (err) {
    console.error("Error adding xray:", err);
    res.status(500).json({
      error: "Failed to add xray"
    });
  }
});

xrayApp.post("/add",verifyToken,
  allowInstituteRoles("xray"), async (req, res) => {
  try {
    const {
      Institute_ID,
      Employee_ID,
      IsFamilyMember,
      FamilyMember_ID,
      Xrays,
      Xray_Notes,
      visit_id
    } = req.body;

    if (
      !Institute_ID ||
      !Employee_ID ||
      !Array.isArray(Xrays) ||
      Xrays.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Missing required fields" });
    }

    const recordQuery = {
      Institute: Institute_ID,
      Employee: Employee_ID
    };

    if (IsFamilyMember) {
      recordQuery.FamilyMember = FamilyMember_ID;
    }

    let record = await XrayRecord.findOne(recordQuery);

    // ===============================
    // PROCESS XRAYS (MASTER LOOKUP)
    // ===============================
    const processedXrays = [];

    for (const x of Xrays) {
      if (!x.Xray_Type || !x.Body_Part) continue;

      let master = await Xray.findOne({
        Xray_Type: x.Xray_Type,
        Body_Part: x.Body_Part,
        View: x.View || ""
      });

      // create master if not exists
      if (!master) {
        master = await Xray.create({
          Xray_Type: x.Xray_Type,
          Body_Part: x.Body_Part,
          Side: x.Side || "NA",
          View: x.View || "",
          Film_Size: x.Film_Size || ""
        });
      }

      processedXrays.push({
        Xray_ID: master.Xray_ID,
        Xray_Type: x.Xray_Type,
        Body_Part: x.Body_Part,
        Side: x.Side || "NA",
        View: x.View || "",
        Film_Size: x.Film_Size || "",
        Findings: x.Findings || "",
        Impression: x.Impression || "",
        Remarks: x.Remarks || Xray_Notes || ""
      });
    }

    if (processedXrays.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid X-rays" });
    }

    // ===============================
    // CREATE NEW RECORD
    // ===============================
    if (!record) {
      record = new XrayRecord({
        Institute: Institute_ID,
        Employee: Employee_ID,
        IsFamilyMember,
        FamilyMember: FamilyMember_ID || null,
        Xrays: processedXrays,
        Xray_Notes: Xray_Notes || ""
      });
    }

    // ===============================
    // UPDATE EXISTING RECORD
    // ===============================
    else {
      for (const x of processedXrays) {
        const existingXray = record.Xrays.find(
          rx =>
            rx.Xray_Type === x.Xray_Type &&
            rx.Body_Part === x.Body_Part &&
            rx.View === x.View
        );

        if (existingXray) {
          existingXray.Side = x.Side;
          existingXray.Film_Size = x.Film_Size;
          existingXray.Findings = x.Findings;
          existingXray.Impression = x.Impression;
          existingXray.Remarks = x.Remarks;
          existingXray.Timestamp = new Date();
        } else {
          record.Xrays.push(x);
        }
      }
    }

    await record.save();

    // ==========================================
    // LOG MEDICAL ACTION
    // ==========================================
    try {
      await MedicalAction.create({
        employee_id: Employee_ID,
        visit_id: visit_id || null,
        action_type: "XRAY_TEST",
        source: "XRAY",
        data: {
          xray_record_id: record._id,
          xrays: processedXrays
        },
        remarks: Xray_Notes || ""
      });
    } catch (logErr) {
      console.error(
        "⚠️ MedicalAction log failed (xray):",
        logErr.message
      );
    }

    // ==========================================
    // UPDATE MEDICAL HISTORY
    // ==========================================
    const historyEntry = {
      Date: new Date(),
      Diagnosis: "X-ray updated",
      Notes:
        Xray_Notes ||
        `Added ${processedXrays.length} X-ray(s)`
    };

    if (IsFamilyMember && FamilyMember_ID) {
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
      message: "X-ray record saved or updated"
    });

  } catch (err) {
    console.error("X-ray add error:", err);
    return res.status(500).json({
      error: "Failed to save X-ray",
      details: err.message
    });
  }
});

// ✅ Get all diagnosis records for a person
xrayApp.get("/records/:personId", async (req, res) => {
  try {
    const { personId } = req.params;
    const { isFamily, familyId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(personId))
      return res.status(400).json({ message: "Invalid ID" });

    // default behaviour: return all records belonging to this employee, including
    // family‑member entries. A query may still request a specific family member by
    // setting ?isFamily=true&familyId=<id> (used by institute entry form).
    const filter = { Employee: personId };

    if (isFamily === "true" && familyId) {
      filter.IsFamilyMember = true;
      filter.FamilyMember = familyId;
    }
    // else leave filter alone so both self and family rows are returned

    const records = await XrayRecord.find(filter)
      .populate("Employee", "Name")
      .populate("FamilyMember", "Name Relationship")
      .sort({ createdAt: -1 });

    res.status(200).json(records);

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

module.exports = xrayApp;

// module.exports = xrayApp;
