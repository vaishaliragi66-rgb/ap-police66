const express = require("express");
const mongoose = require("mongoose");
const diagnosisApp = express.Router();

const DiagnosisTest = require("../models/diagnostics_test");
const DiagnosisRecord = require("../models/diagnostics_record");
const Institute = require("../models/master_institute");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");

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
diagnosisApp.post("/add", async (req, res) => {
  try {
    const { Institute_ID, Employee_ID, IsFamilyMember, FamilyMember_ID, Tests, Diagnosis_Notes } = req.body;

    if (!Institute_ID || !Employee_ID || !Array.isArray(Tests) || Tests.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const recordQuery = { Institute: Institute_ID, Employee: Employee_ID, IsFamilyMember: !!IsFamilyMember };
    if (IsFamilyMember) recordQuery.FamilyMember = FamilyMember_ID;

    let record = await DiagnosisRecord.findOne(recordQuery);

    if (!record) {
      record = new DiagnosisRecord({
        Institute: Institute_ID,
        Employee: Employee_ID,
        IsFamilyMember,
        FamilyMember: FamilyMember_ID || null,
        Tests: Tests.map(t => ({
          Test_Name: t.Test_Name,
          Group: t.Group || "",
          Result_Value: t.Result_Value,
          Reference_Range: t.Reference_Range || "",
          Units: t.Units || "",
          Remarks: t.Remarks || Diagnosis_Notes || "",
        })),
        Diagnosis_Notes: Diagnosis_Notes || "",
      });
    } else {
      Tests.forEach(t => {
        record.Tests.push({
          Test_Name: t.Test_Name,
          Group: t.Group || "",
          Result_Value: t.Result_Value,
          Reference_Range: t.Reference_Range || "",
          Units: t.Units || "",
          Remarks: t.Remarks || Diagnosis_Notes || "",
        });
      });
    }

    await record.save();

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
    console.log("Incoming ID:", req.params.personId);

    const { personId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personId))
      return res.status(400).json({ message: "Invalid ID" });

    const personObjectId = new mongoose.Types.ObjectId(personId);

    const records = await DiagnosisRecord.find({
      $or: [{ Employee: personObjectId }, { FamilyMember: personObjectId }]
    })
      .populate("Employee", "Name")
      .populate("FamilyMember", "Name Relationship")
      .populate("Institute", "Institute_Name")
      .sort({ createdAt: -1 });

    if (!records.length)
      return res.status(404).json({ message: "No records found" });

    res.status(200).json(records);
  } catch (err) {
    console.error("Error fetching diagnosis records:", err);
    res.status(500).json({ error: "Failed to fetch records" });
  }
});




module.exports = diagnosisApp;
