const express = require("express");
const router = express.Router();
const MedicalAction = require("../models/medical_action");
const Diagnosis = require("../models/diagnostics_record");
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");

// CREATE MEDICAL ACTION (Doctor / Pharmacy / Diagnosis)
router.post("/", verifyToken, allowInstituteRoles("doctor"), async (req, res) => {
  try {
    const {
      employee_id,
      visit_id,
      action_type,
      source,
      data
    } = req.body;

    // Only log the action (doctor prescribing tests)
    const action = await MedicalAction.create({
      employee_id,
      visit_id,
      action_type,
      source,
      data
    });

    return res.status(201).json(action);

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
