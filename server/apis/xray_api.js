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



xrayApp.post(
"/add",
verifyToken,
allowInstituteRoles("xray"),
xrayUpload.array("reports"),
async (req,res)=>{

try{

console.log("BODY:",req.body);
console.log("FILES:",req.files);

const {
  Institute_ID,
  Employee_ID,
  IsFamilyMember,
  FamilyMember_ID,
  Xray_Notes
} = req.body;


/* ---------------- SAFE XRAY PARSE ---------------- */

let xrays = [];

try{

xrays = JSON.parse(req.body.Xrays || "[]");

}
catch(err){

console.error("Xray JSON parse error:",err);
xrays = [];

}


/* ---------------- REMOVE ReportFile FIELD ---------------- */

xrays.forEach(x=>{
delete x.ReportFile;
});


/* ---------------- ATTACH FILES TO XRAYS ---------------- */

const files = req.files || [];

xrays.forEach((xray,index)=>{

const file = files[index];

if(file){

xray.Reports = [
{
filename:file.filename,
originalname:file.originalname,
url:`/uploads/xray_reports/${file.filename}`,
uploadedBy:req.user?.id || "system",
uploadedAt:new Date()
}
];

}

});


/* ---------------- HANDLE FAMILY MEMBER CORRECTLY ---------------- */

const isFamily =
(IsFamilyMember === "true" || IsFamilyMember === true);


/* ---------------- CREATE XRAY RECORD ---------------- */

const record = new XrayRecord({

Institute:Institute_ID,

Employee:Employee_ID,

IsFamilyMember:isFamily,

FamilyMember:
isFamily && FamilyMember_ID
? new mongoose.Types.ObjectId(FamilyMember_ID)
: null,

Xrays:xrays,

Xray_Notes:Xray_Notes || ""

});


/* ---------------- SAVE ---------------- */

await record.save();


return res.status(201).json({

message:"Xray record saved successfully",

record

});


}
catch(err){

console.error("XRAY SAVE ERROR:",err);

return res.status(500).json({

message:"Failed to save Xray record",

error:err.message

});

}

}
);

module.exports = xrayApp;

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
