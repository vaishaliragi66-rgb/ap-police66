const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const DoctorPrescription = require("../models/doctor_prescription");
const MedicalAction = require("../models/medical_action");
const ToBePrescribedMedicine = require("../models/to_be_prescribed_medicine");

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

    const normalizedMedicines = Medicines.map((med) => ({
      ...med,
      Strength: (med?.Strength || "").trim() || undefined
    }));

    // Split medicines into regular vs to-be-prescribed based on flags
    const regularMedicines = normalizedMedicines.filter(m => !(m.ToBePrescribed || m.toBePrescribed || m.IsToBePrescribed));
    const toBePrescribedMedicines = normalizedMedicines.filter(m => (m.ToBePrescribed || m.toBePrescribed || m.IsToBePrescribed));

    const prescription = await DoctorPrescription.create({
      Institute: Institute_ID,
      Employee: Employee_ID,
      IsFamilyMember,
      FamilyMember: IsFamilyMember ? FamilyMember_ID : null,
      Medicines: normalizedMedicines,
      Notes
    });

    // Store regular medicines in MedicalAction
    if (regularMedicines.length > 0) {
      await MedicalAction.create({
        employee_id: Employee_ID,
        visit_id: visit_id || null,
        action_type: "DOCTOR_PRESCRIPTION",
        source: "DOCTOR",
        data: {
          doctor_prescription_id: prescription._id,
          medicines: regularMedicines
        },
        remarks: Notes || ""
      });
    }

    // Store to-be-prescribed medicines in separate collection
    if (toBePrescribedMedicines.length > 0) {
      const toBePrescribedRecords = toBePrescribedMedicines.map(med => ({
        Institute: Institute_ID,
        Employee: Employee_ID,
        IsFamilyMember,
        FamilyMember: IsFamilyMember ? FamilyMember_ID : null,
        visit_id: visit_id || null,
        Medicine_Name: med.Medicine_Name,
        Type: med.Type,
        Dosage_Form: med.Dosage_Form,
        FoodTiming: med.FoodTiming,
        Strength: med.Strength,
        Morning: med.Morning,
        Afternoon: med.Afternoon,
        Night: med.Night,
        Duration: med.Duration,
        Remarks: med.Remarks,
        Quantity: med.Quantity,
        Notes: Notes,
        prescription_id: prescription._id
      }));

      await ToBePrescribedMedicine.insertMany(toBePrescribedRecords);
    }

    res.status(201).json({
      message: "Doctor prescription saved",
      doctorPrescriptionId: prescription._id
    });

  } catch (err) {
    console.error("Doctor prescription error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================================================
// GET ALL TO-BE-PRESCRIBED MEDICINES FOR INSTITUTE
// =======================================================
router.get("/to-be-prescribed/all", verifyToken, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;

    const toBePrescribedMedicines = await ToBePrescribedMedicine.find({ Institute: instituteId })
      .populate('Institute', 'Institute_Name')
      .populate('Employee', 'Name ABS_NO')
      .populate('FamilyMember', 'Name Relationship')
      .sort({ createdAt: -1 });

    res.status(200).json(toBePrescribedMedicines);

  } catch (err) {
    console.error("Error fetching all to-be-prescribed medicines:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;