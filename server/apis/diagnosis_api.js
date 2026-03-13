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
      return res.json([]);
    }

    const tests = actions.flatMap((action) => action.data?.tests || []);

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
  async (req, res) => {
    try {
      const {
        Institute_ID,
        Employee_ID,
        IsFamilyMember,
        FamilyMember_ID,
        Tests,
        Diagnosis_Notes
      } = req.body;

      if (!Institute_ID || !Employee_ID || !Array.isArray(Tests) || Tests.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const recordQuery = {
        Institute: Institute_ID,
        Employee: Employee_ID
      };

      if (IsFamilyMember) {
        recordQuery.FamilyMember = FamilyMember_ID;
      } else {
        recordQuery.IsFamilyMember = false;
      }

      let record = await DiagnosisRecord.findOne(recordQuery);

      if (!record) {
        record = new DiagnosisRecord({
          Institute: Institute_ID,
          Employee: Employee_ID,
          Visit: req.body.visit_id,
          IsFamilyMember,
          FamilyMember: FamilyMember_ID || null,
          Tests: Tests.map((test) => ({
            Test_ID: test.Test_ID || null,
            Test_Name: test.Test_Name,
            Group: test.Group || "",
            Result_Value: test.Result_Value,
            Reference_Range: test.Reference_Range || "",
            Units: test.Units || "",
            Remarks: test.Remarks || Diagnosis_Notes || ""
          })),
          Diagnosis_Notes: Diagnosis_Notes || ""
        });
      } else {
        Tests.forEach((test) => {
          const existingTest = record.Tests.find(
            (recordTest) =>
              recordTest.Test_ID &&
              test.Test_ID &&
              recordTest.Test_ID.toString() === test.Test_ID.toString()
          );

          if (existingTest) {
            existingTest.Result_Value = test.Result_Value;
            existingTest.Reference_Range =
              test.Reference_Range || existingTest.Reference_Range;
            existingTest.Units = test.Units || existingTest.Units;
            existingTest.Remarks =
              test.Remarks || Diagnosis_Notes || existingTest.Remarks;
            existingTest.Timestamp = new Date();
          } else {
            record.Tests.push({
              Test_ID: test.Test_ID || null,
              Test_Name: test.Test_Name,
              Group: test.Group || "",
              Result_Value: test.Result_Value,
              Reference_Range: test.Reference_Range || "",
              Units: test.Units || "",
              Remarks: test.Remarks || Diagnosis_Notes || ""
            });
          }
        });
      }

      await record.save();

      try {
        await MedicalAction.create({
          employee_id: Employee_ID,
          visit_id: req.body.visit_id || null,
          action_type: "DIAGNOSIS_TEST",
          source: "LAB",
          data: {
            diagnosis_record_id: record._id,
            tests: Tests
          },
          remarks: Diagnosis_Notes || ""
        });
      } catch (logErr) {
        console.error("MedicalAction log failed (diagnosis):", logErr.message);
      }

      const historyEntry = {
        Date: new Date(),
        Diagnosis: "Diagnosis updated",
        Notes: Diagnosis_Notes || `Added ${Tests.length} new test(s)`
      };

      if (IsFamilyMember && FamilyMember_ID) {
        await FamilyMember.findByIdAndUpdate(FamilyMember_ID, {
          $push: { Medical_History: historyEntry }
        });
      } else {
        await Employee.findByIdAndUpdate(Employee_ID, {
          $push: { Medical_History: historyEntry }
        });
      }

      return res.status(200).json({ message: "Diagnosis record saved or updated" });
    } catch (err) {
      console.error("Diagnosis add error:", err);
      return res.status(500).json({
        error: "Failed to save diagnosis",
        details: err.message
      });
    }
  }
);

diagnosisApp.get("/records/:personId", async (req, res) => {
  try {
    const { personId } = req.params;
    const { isFamily, familyId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(personId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const filter = {
      Employee: personId
    };

    if (isFamily === "true" && familyId) {
      filter.IsFamilyMember = true;
      filter.FamilyMember = familyId;
    } else if (isFamily === "false") {
      filter.IsFamilyMember = false;
    }

    const records = await DiagnosisRecord.find(filter)
      .populate("Employee", "Name ABS_NO Sex DOB")
      .populate("FamilyMember", "Name Relationship Sex DOB")
      .populate("Institute", "Institute_Name")
      .populate("Tests.Test_ID")
      .sort({ updatedAt: -1, createdAt: -1 });

    const recordIds = records.map((record) => String(record._id));

    const diagnosisActions = recordIds.length
      ? await MedicalAction.find({
          action_type: "DIAGNOSIS_TEST",
          "data.diagnosis_record_id": { $in: recordIds }
        }).sort({ created_at: -1 })
      : [];

    const visitIds = diagnosisActions
      .map((action) => action.visit_id)
      .filter(Boolean);

    const visits = visitIds.length
      ? await DailyVisit.find({ _id: { $in: visitIds } })
      : [];

    const visitMap = new Map(
      visits.map((visit) => [String(visit._id), visit])
    );

    const actionMap = new Map();
    diagnosisActions.forEach((action) => {
      const recordId = String(action.data?.diagnosis_record_id || "");
      if (recordId && !actionMap.has(recordId)) {
        actionMap.set(recordId, action);
      }
    });

    const enrichedRecords = records.map((record) => {
      const action = actionMap.get(String(record._id));
      const visit = action?.visit_id
        ? visitMap.get(String(action.visit_id))
        : null;

      return {
        ...record.toObject(),
        visitSummary: visit
          ? {
              symptoms: visit.symptoms || "",
              vitals: visit.Vitals || {},
              token_no: visit.token_no || null,
              visit_date: visit.visit_date || null
            }
          : null
      };
    });

    res.status(200).json(enrichedRecords);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

module.exports = diagnosisApp;
