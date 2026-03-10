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

    const visits = await DailyVisit.find({
      Institute_ID: instituteId
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

    const filter = { Employee: personId };

    if (isFamily === "true" && familyId) {
      filter.IsFamilyMember = true;
      filter.FamilyMember = familyId;
    } else {
      filter.IsFamilyMember = false;
    }

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
