const express = require("express");
const router = express.Router();
const MedicalAction = require("../models/medical_action");
const Diagnosis = require("../models/diagnostics_record");


// CREATE MEDICAL ACTION (Doctor / Pharmacy / Diagnosis)
router.post("/", async (req, res) => {
  try {
    const {
      employee_id,
      visit_id,
      action_type,
      source,
      data
    } = req.body;

    // Always log the action
    const action = await MedicalAction.create(req.body);

    // 🔥 CREATE REAL DIAGNOSIS RECORD
    if (action_type === "DOCTOR_DIAGNOSIS") {
      const diagnosis = await Diagnosis.create({
        Institute: data.Institute_ID || action.institute_id, // be explicit
        Employee: employee_id,
        IsFamilyMember: data.IsFamilyMember,
        FamilyMember: data.IsFamilyMember ? data.FamilyMember_ID : null,
        Tests: data.tests.map(t => ({
  ...t,
  Result_Value: t.Result_Value ?? "PENDING",
  Timestamp: new Date()
}))
,
        Diagnosis_Notes: data.notes || ""
      });

      return res.status(201).json({
        action,
        diagnosis
      });
    }

    res.status(201).json(action);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET ALL ACTIONS BY EMPLOYEE
router.get("/employee/:employeeId", async (req, res) => {
  try {
    const actions = await MedicalAction.find({
      employee_id: req.params.employeeId
    }).sort({ created_at: 1 });

    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ALL ACTIONS BY VISIT
router.get("/visit/:visitId", async (req, res) => {
  try {
    const actions = await MedicalAction.find({
      visit_id: req.params.visitId
    }).sort({ created_at: 1 });

    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
