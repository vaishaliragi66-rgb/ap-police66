const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const DoctorPrescription = require("../models/doctor_prescription");
const MedicalAction = require("../models/medical_action");

// =======================================================
// ADD DOCTOR PRESCRIPTION (NO INVENTORY, NO LEDGER)
// =======================================================
router.post("/add", async (req, res) => {
  try {
    const {
      Institute_ID,
      Employee_ID,
      IsFamilyMember = false,
      FamilyMember_ID,
      Medicines,
      Notes,
      visit_id
    } = req.body;

    if (!Institute_ID || !Employee_ID || !Array.isArray(Medicines) || Medicines.length === 0) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (!mongoose.Types.ObjectId.isValid(Employee_ID)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const prescription = await DoctorPrescription.create({
      Institute: Institute_ID,
      Employee: Employee_ID,
      IsFamilyMember,
      FamilyMember: IsFamilyMember ? FamilyMember_ID : null,
      Medicines,
      Notes
    });

    await MedicalAction.create({
      employee_id: Employee_ID,
      visit_id: visit_id || null,
      action_type: "DOCTOR_PRESCRIPTION",
      source: "DOCTOR",
      data: {
        doctor_prescription_id: prescription._id,
        medicines: Medicines
      },
      remarks: Notes || ""
    });

    res.status(201).json({
      message: "Doctor prescription saved",
      doctorPrescriptionId: prescription._id
    });

  } catch (err) {
    console.error("Doctor prescription error:", err);
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
