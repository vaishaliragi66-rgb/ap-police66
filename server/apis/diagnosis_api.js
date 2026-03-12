const express = require("express");
const mongoose = require("mongoose");
const diagnosisApp = express.Router();
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const DiagnosisTest = require("../models/diagnostics_test");
const DiagnosisRecord = require("../models/diagnostics_record");
const Institute = require("../models/master_institute");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");
const MedicalAction = require("../models/medical_action");
const DailyVisit = require("../models/daily_visit");

// ✅ GET master test list
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
    }).sort({ createdAt: -1 });

    if (!actions.length) {
      return res.json([]);
    }

    // collect all tests from all doctor prescriptions
    const tests = actions.flatMap(a => a.data?.tests || []);

    res.json({
      visit_id: visitId,
      tests
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
      action_type: "DOCTOR_DIAGNOSIS"
    });

    const visitIds = actions.map(a => String(a.visit_id));

    const diagnosisVisits = visits.filter(v =>
      visitIds.includes(String(v._id))
    );

    res.json(diagnosisVisits);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch diagnosis queue" });
  }
});

// ✅ Add a new master test
diagnosisApp.post("/tests/add", async (req, res) => {
  try {
    const { Test_Name, Group, Reference_Range, Units } = req.body;
    if (!Test_Name) return res.status(400).json({ message: "Test_Name required" });

    const exists = await DiagnosisTest.findOne({ Test_Name });
    if (exists) return res.status(400).json({ message: "Test already exists" });

    const newTest = new DiagnosisTest({ Test_Name, Group, Reference_Range, Units });
    await newTest.save();

    res.status(201).json({ message: "Test created", test: newTest });
  } catch (err) {
    console.error("Error adding test:", err);
    res.status(500).json({ error: "Failed to add test" });
  }
});

// ✅ Add a diagnosis record
diagnosisApp.post("/add",verifyToken,
  allowInstituteRoles("diagnosis"), async (req, res) => {
  try {
    const { Institute_ID, Employee_ID, IsFamilyMember, FamilyMember_ID, Tests, Diagnosis_Notes } = req.body;

    if (!Institute_ID || !Employee_ID || !Array.isArray(Tests) || Tests.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

const recordQuery = {
  Institute: Institute_ID,
  Employee: Employee_ID
};

if (IsFamilyMember) {
  recordQuery.FamilyMember = FamilyMember_ID;
}



    if (IsFamilyMember) recordQuery.FamilyMember = FamilyMember_ID;

    let record = await DiagnosisRecord.findOne(recordQuery);

    if (!record) {
  record = new DiagnosisRecord({
    Institute: Institute_ID,
    Employee: Employee_ID,
    Visit: req.body.visit_id,
    IsFamilyMember,
    FamilyMember: FamilyMember_ID || null,
    Tests: Tests.map(t => ({
      Test_ID: t.Test_ID || null,   // 👈 ADD THIS LINE
      Test_Name: t.Test_Name,
      Group: t.Group || "",
      Result_Value: t.Result_Value,
      Reference_Range: t.Reference_Range || "",
      Units: t.Units || "",
      Remarks: t.Remarks || Diagnosis_Notes || "",
    })),
    Diagnosis_Notes: Diagnosis_Notes || "",
  });
}
 else {
  Tests.forEach(t => {

   const existingTest = record.Tests.find(
  rt => rt.Test_ID && t.Test_ID &&
  rt.Test_ID.toString() === t.Test_ID.toString()
);


    if (existingTest) {
      // UPDATE result
      existingTest.Result_Value = t.Result_Value;
      existingTest.Reference_Range = t.Reference_Range || existingTest.Reference_Range;
      existingTest.Units = t.Units || existingTest.Units;
      existingTest.Remarks = t.Remarks || Diagnosis_Notes || existingTest.Remarks;
      existingTest.Timestamp = new Date();
    } else {
      // ADD NEW test
      record.Tests.push({
        Test_ID: t.Test_ID || null,
        Test_Name: t.Test_Name,
        Group: t.Group || "",
        Result_Value: t.Result_Value,
        Reference_Range: t.Reference_Range || "",
        Units: t.Units || "",
        Remarks: t.Remarks || Diagnosis_Notes || "",
      });
    }

  });
}
  
console.log("Incoming Tests:", Tests);
console.log("Existing Record Tests:", record?.Tests);

    await record.save();
    // ===================================================
    // LOG MEDICAL ACTION (NON-BLOCKING)
    // ===================================================
    try {
      await MedicalAction.create({
        employee_id: Employee_ID,
        visit_id: req.body.visit_id || null, // optional
        action_type: "DIAGNOSIS_TEST",
        source: "LAB",
        data: {
          diagnosis_record_id: record._id,
          tests: Tests
        },
        remarks: Diagnosis_Notes || ""
      });
    } catch (logErr) {
      console.error("⚠️ MedicalAction log failed (diagnosis):", logErr.message);
      // DO NOT throw error — diagnosis must succeed
    }

    const historyEntry = {
      Date: new Date(),
      Diagnosis: "Diagnosis updated",
      Notes: Diagnosis_Notes || `Added ${Tests.length} new test(s)`
    };

    if (IsFamilyMember && FamilyMember_ID) {
      await FamilyMember.findByIdAndUpdate(FamilyMember_ID, { $push: { Medical_History: historyEntry } });
    } else {
      await Employee.findByIdAndUpdate(Employee_ID, { $push: { Medical_History: historyEntry } });
    }

    return res.status(200).json({ message: "Diagnosis record saved or updated" });
  } catch (err) {
    console.error("Diagnosis add error:", err);
    return res.status(500).json({ error: "Failed to save diagnosis", details: err.message });
  }
});

// ✅ Get all diagnosis records for a person
diagnosisApp.get("/records/:personId", async (req, res) => {
  try {
    const { personId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const records = await DiagnosisRecord.find({
      Employee: personId
    })
      .populate("Employee", "Name ABS_NO Sex DOB")
      .populate("FamilyMember", "Name Relationship Sex DOB")
      .populate("Institute", "Institute_Name")
      .populate("Tests.Test_ID")   // 🔥 THIS IS THE FIX
      .sort({ createdAt: -1 });

    res.status(200).json(records);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch records" });
  }
});


module.exports = diagnosisApp;
