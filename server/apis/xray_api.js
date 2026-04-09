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

const filterXraysByDate = (record, start, end) => {
  const xrays = Array.isArray(record?.Xrays) ? record.Xrays : [];
  if (!start && !end) return xrays;
  return xrays.filter((xray) => isWithinDateRange(xray?.Timestamp, start, end));
};

const filterXrayRecordsByDate = (records, start, end) => {
  return (Array.isArray(records) ? records : [])
    .map((record) => {
      const filteredXrays = filterXraysByDate(record, start, end);
      if (filteredXrays.length === 0) return null;
      return { ...record, Xrays: filteredXrays };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.Xrays[0]?.Timestamp || b.createdAt || 0) - new Date(a.Xrays[0]?.Timestamp || a.createdAt || 0));
};

const splitXrayRecordsByDate = (records) => {
  const rows = [];

  (records || []).forEach((record) => {
    const grouped = new Map();

    (record.Xrays || []).forEach((xray) => {
      const ts = xray?.Timestamp ? new Date(xray.Timestamp) : null;
      if (!ts || Number.isNaN(ts.getTime())) return;

      const key = [
        ts.getFullYear(),
        String(ts.getMonth() + 1).padStart(2, "0"),
        String(ts.getDate()).padStart(2, "0")
      ].join("-");

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(xray);
    });

    grouped.forEach((xrays) => {
      rows.push({ ...record, Xrays: xrays });
    });
  });

  return rows.sort((a, b) => new Date(b.Xrays[0]?.Timestamp || b.createdAt || 0) - new Date(a.Xrays[0]?.Timestamp || a.createdAt || 0));
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

const requireInstituteAdmin = (req, res, next) => {
  if (req.user?.role !== "institute") {
    return res.status(403).json({ message: "Only institute admin can modify x-ray master data" });
  }
  next();
};

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
    const xrays = await Xray.find().sort({ Body_Part: 1, Xray_Type: 1 });
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

xrayApp.post("/xrays/add", verifyToken, requireInstituteAdmin, async (req, res) => {
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
      Body_Part
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

xrayApp.put("/xrays/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const xray = await Xray.findById(id);
    if (!xray) {
      return res.status(404).json({ message: "X-ray not found" });
    }

    const Xray_Type = String(req.body.Xray_Type || "").trim();
    const Body_Part = String(req.body.Body_Part || "").trim();
    const Side = String(req.body.Side || "NA").trim() || "NA";
    const View = String(req.body.View || "").trim();
    const Film_Size = String(req.body.Film_Size || "").trim();

    if (Xray_Type) xray.Xray_Type = Xray_Type;
    if (Body_Part) xray.Body_Part = Body_Part;
    xray.Side = Side;
    xray.View = View;
    xray.Film_Size = Film_Size;

    await xray.save();
    res.json({ message: "X-ray updated", xray });
  } catch (err) {
    console.error("Error updating xray:", err);
    res.status(500).json({ message: "Failed to update xray", error: err.message });
  }
});

xrayApp.delete("/xrays/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Xray.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "X-ray not found" });
    }
    res.json({ message: "X-ray deleted" });
  } catch (err) {
    console.error("Error deleting xray:", err);
    res.status(500).json({ message: "Failed to delete xray", error: err.message });
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

// ✅ Get all body parts
xrayApp.get("/body-parts", verifyToken, async (req, res) => {
  try {
    const bodyParts = await Xray.distinct("Body_Part");
    const customBodyParts = await Xray.find({ "_id": { $exists: true } }).select("_id Body_Part status").sort({ Body_Part: 1 });
    
    const result = customBodyParts.map(bp => ({
      _id: bp._id,
      Body_Part: bp.Body_Part,
      status: bp.status || "Active"
    }));
    
    res.json(result);
  } catch (err) {
    console.error("Error fetching body parts:", err);
    res.status(500).json({ message: "Failed to fetch body parts", error: err.message });
  }
});

// ✅ Add a new body part
xrayApp.post("/body-parts", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const { Body_Part } = req.body;
    
    if (!Body_Part || !String(Body_Part).trim()) {
      return res.status(400).json({ message: "Body_Part is required" });
    }

    const bp = String(Body_Part).trim();
    
    // Check if already exists
    const existing = await Xray.findOne({ Body_Part: bp });
    if (existing) {
      return res.status(409).json({ message: "This body part already exists" });
    }

    // Create a placeholder X-ray entry for this body part
    const newXray = new Xray({
      Body_Part: bp,
      Xray_Type: `${bp} (placeholder)`,
      Side: "NA",
      View: "",
      Film_Size: "",
      status: "Active"
    });

    const saved = await newXray.save();
    console.log(`Body part added: ${bp}`);
    
    res.status(201).json({
      _id: saved._id,
      Body_Part: bp,
      message: "Body part added successfully"
    });
  } catch (err) {
    console.error("Error adding body part:", err);
    res.status(500).json({ message: "Failed to add body part", error: err.message });
  }
});

// ✅ Update a body part (name and/or status)
xrayApp.put("/body-parts/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { Body_Part, status } = req.body;

    // Find the body part record
    const bodyPartRecord = await Xray.findById(id);
    if (!bodyPartRecord) {
      return res.status(404).json({ message: "Body part not found" });
    }

    const oldBodyPart = bodyPartRecord.Body_Part;

    // Update the body part record
    if (Body_Part && String(Body_Part).trim()) {
      const newBodyPart = String(Body_Part).trim();
      
      // Check if new name already exists
      if (newBodyPart !== oldBodyPart) {
        const existing = await Xray.findOne({ Body_Part: newBodyPart });
        if (existing) {
          return res.status(409).json({ message: "This body part name already exists" });
        }
        
        // Update all X-rays with this body part to the new name
        await Xray.updateMany(
          { Body_Part: oldBodyPart },
          { $set: { Body_Part: newBodyPart } }
        );
      }
      bodyPartRecord.Body_Part = newBodyPart;
    }

    if (status) {
      bodyPartRecord.status = status;
    }

    const updated = await bodyPartRecord.save();
    
    console.log(`Body part updated: ${oldBodyPart} -> ${updated.Body_Part || oldBodyPart}`);

    res.json({
      _id: updated._id,
      Body_Part: updated.Body_Part,
      status: updated.status,
      message: "Body part updated successfully"
    });
  } catch (err) {
    console.error("Error updating body part:", err);
    res.status(500).json({ message: "Failed to update body part", error: err.message });
  }
});

// ✅ Delete a body part and all its X-rays
xrayApp.delete("/body-parts/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the body part record to get the body part name
    const bodyPartRecord = await Xray.findById(id);
    if (!bodyPartRecord) {
      return res.status(404).json({ message: "Body part not found" });
    }

    const bodyPartName = bodyPartRecord.Body_Part;

    // Delete all X-rays with this body part
    const deleteResult = await Xray.deleteMany({ Body_Part: bodyPartName });

    console.log(`Deleted body part '${bodyPartName}' and ${deleteResult.deletedCount} X-rays`);

    res.json({ 
      message: "Body part deleted successfully",
      bodyPart: bodyPartName,
      xraysDeleted: deleteResult.deletedCount
    });
  } catch (err) {
    console.error("Error deleting body part:", err);
    res.status(500).json({ message: "Failed to delete body part", error: err.message });
  }
});

module.exports = xrayApp;

// ✅ Get all diagnosis records for a person
xrayApp.get("/records/:personId", async (req, res) => {
  try {
    const { personId } = req.params;
    const { isFamily, familyId, personId: selectedPersonId, fromDate, toDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(personId))
      return res.status(400).json({ message: "Invalid ID" });

    // default behaviour: return all records belonging to this employee, including
    // family‑member entries. A query may still request a specific family member by
    // setting ?isFamily=true&familyId=<id> (used by institute entry form).
    const filter = { Employee: personId };

    if (selectedPersonId === "self") {
      filter.IsFamilyMember = false;
    } else if (selectedPersonId && selectedPersonId !== "all") {
      filter.IsFamilyMember = true;
      filter.FamilyMember = selectedPersonId;
    } else if (isFamily === "true" && familyId) {
      filter.IsFamilyMember = true;
      filter.FamilyMember = familyId;
    }
    // else leave filter alone so both self and family rows are returned

    const { start, end } = buildDateRange(fromDate, toDate);
    if (start || end) {
      const dateFilter = {};
      if (start) dateFilter.$gte = start;
      if (end) dateFilter.$lte = end;
      filter["Xrays.Timestamp"] = dateFilter;
    }

    const records = await XrayRecord.find(filter)
      .populate("Employee", "Name")
      .populate("Institute", "Institute_Name")
      .populate("FamilyMember", "Name Relationship")
      .sort({ createdAt: -1 });

    const filteredRecords = filterXrayRecordsByDate(
      records.map((record) => record.toObject()),
      start,
      end
    );

    res.status(200).json(filteredRecords);

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

module.exports = xrayApp;

// module.exports = xrayApp;

// Download PDF for xray records
const PDFDocument = require('pdfkit');
xrayApp.get('/download-pdf', async (req, res) => {
  try {
    const { employeeId, personId, fromDate, toDate } = req.query;
    if (!employeeId) return res.status(400).json({ message: 'employeeId required' });

    const filter = { Employee: employeeId };
    if (personId === "self") filter.IsFamilyMember = false;
    else if (personId && personId !== "all") {
      filter.IsFamilyMember = true;
      filter.FamilyMember = personId;
    }

    const { start, end } = buildDateRange(fromDate, toDate);
    if (start || end) {
      const dateFilter = {};
      if (start) dateFilter.$gte = start;
      if (end) dateFilter.$lte = end;
      filter["Xrays.Timestamp"] = dateFilter;
    }

    const records = await XrayRecord.find(filter)
      .populate('Employee', 'Name ABS_NO')
      .populate('FamilyMember', 'Name Relationship')
      .populate('Institute', 'Institute_Name')
      .sort({ createdAt: -1 })
      .lean();

    const filteredRecords = filterXrayRecordsByDate(records, start, end);
    const rows = splitXrayRecordsByDate(filteredRecords);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const filename = `Xray_Reports_${employeeId}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text('X-ray Reports', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(10).text(`Date Range: ${fromDate || '-'} to ${toDate || '-'}`);
    doc.moveDown(0.5);

    if (!rows || rows.length === 0) {
      doc.text('No X-ray records found for the selected criteria.', { align: 'center' });
      doc.end();
      return;
    }

    let y = doc.y + 8;
    const pageBottom = () => doc.page.height - doc.page.margins.bottom;
    const columnX = [40, 65, 165, 275, 370, 430];
    const columnWidths = [25, 95, 100, 95, 60, 120];

    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('#', columnX[0], y, { width: columnWidths[0] });
      doc.text('Patient', columnX[1], y, { width: columnWidths[1] });
      doc.text('Report For', columnX[2], y, { width: columnWidths[2] });
      doc.text('Institute', columnX[3], y, { width: columnWidths[3] });
      doc.text('No. of X-rays', columnX[4], y, { width: columnWidths[4] });
      doc.text('Test Date', columnX[5], y, { width: columnWidths[5] });
      y += 18;
      doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor('#cccccc').stroke();
      doc.font('Helvetica').fillColor('black');
    };

    drawHeader();

    rows.forEach((r, index) => {
      const patientText = `${r.Employee?.Name || '-'}${r.Employee?.ABS_NO ? ` (${r.Employee.ABS_NO})` : ''}`;
      const reportForText = r.IsFamilyMember
        ? `${r.FamilyMember?.Name || '-'} (${r.FamilyMember?.Relationship || '-'})`
        : 'Self';
      const instituteText = r.Institute?.Institute_Name || 'Medical Institute';
      const countText = String(Array.isArray(r.Xrays) ? r.Xrays.length : 0);
      const dateText = formatPdfDateTime(r.Xrays[0]?.Timestamp || r.createdAt);

      const lineHeight = Math.max(
        doc.heightOfString(String(index + 1), { width: columnWidths[0] }),
        doc.heightOfString(patientText, { width: columnWidths[1] }),
        doc.heightOfString(reportForText, { width: columnWidths[2] }),
        doc.heightOfString(instituteText, { width: columnWidths[3] }),
        doc.heightOfString(countText, { width: columnWidths[4] }),
        doc.heightOfString(dateText, { width: columnWidths[5] })
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
      doc.text(countText, columnX[4], y, { width: columnWidths[4] });
      doc.text(dateText, columnX[5], y, { width: columnWidths[5] });
      y += lineHeight;
      doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor('#e5e7eb').stroke();
    });

    doc.end();
  } catch (err) {
    console.error('Xray PDF error:', err);
    res.status(500).json({ message: 'Failed to generate PDF', error: err.message });
  }
});
