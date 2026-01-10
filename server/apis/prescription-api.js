
const express = require("express");
const mongoose = require("mongoose");
const prescriptionApp = express.Router();

const Prescription = require("../models/Prescription");
const Institute = require("../models/master_institute");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");
const InstituteLedger = require("../models/InstituteLedger");
const MedicalAction = require("../models/medical_action");

// 🔴 IMPORTANT: THIS IS NOW SUBSTORE STOCK
const Medicine = require("../models/master_medicine");

// =======================================================
// ADD PRESCRIPTION (SUBSTORE → PATIENT)
// =======================================================
prescriptionApp.post("/add", async (req, res) => {
  try {
    console.log("PRESCRIPTION PAYLOAD:", req.body);

    const {
      Institute_ID,
      Employee_ID,
      Medicines,
      visit_id
    } = req.body;

    // ------------------------------
    // BASIC VALIDATION
    // ------------------------------
    if (
      !Institute_ID ||
      !Employee_ID ||
      !Array.isArray(Medicines) ||
      Medicines.length === 0
    ) {
      return res.status(400).json({
        message: "Invalid prescription data"
      });
    }

    // ------------------------------
    // VERIFY INSTITUTE EXISTS
    // ------------------------------
    const institute = await Institute.findById(Institute_ID);
    if (!institute) {
      return res.status(400).json({
        message: "Institute not found"
      });
    }

    const ledgerEntries = [];

    // ------------------------------
    // PROCESS EACH MEDICINE
    // ------------------------------
    for (const med of Medicines) {
      // Frontend sends Medicine_ID as code
      const Medicine_Code = med.Medicine_Code || med.Medicine_ID;
      const Medicine_Name = (med.Medicine_Name || "").trim();
      const qty = Number(med.Quantity);

      if (!Medicine_Code || qty <= 0) {
        return res.status(400).json({
          message: "Invalid medicine data"
        });
      }


      // ------------------------------
      // FIND MEDICINE IN SUBSTORE (CORRECT)
      // ------------------------------
      const substoreMed = await Medicine.findOne({
        Institute_ID,
        Medicine_Code
      });

      if (!substoreMed) {
        return res.status(400).json({
          message: "Medicine not found in substore",
          medicineCode: Medicine_Code,
          medicineName: Medicine_Name
        });
      }

      if (substoreMed.Quantity < qty) {
        return res.status(400).json({
          message: "Insufficient stock in substore",
          medicineName: Medicine_Name
        });
      }

      // ------------------------------
      // DEDUCT SUBSTORE STOCK
      // ------------------------------
      substoreMed.Quantity -= qty;
      await substoreMed.save();

      // ------------------------------
      // LEDGER (SUBSTORE OUT)
      // ------------------------------
      ledgerEntries.push({
        Institute_ID,
        Store_Type: "SUBSTORE",
        Transaction_Type: "PRESCRIPTION_ISSUE",
        Reference_ID: visit_id || null,
        Medicine_ID: substoreMed._id,
        Medicine_Name: substoreMed.Medicine_Name,
        Expiry_Date: substoreMed.Expiry_Date,
        Direction: "OUT",
        Quantity: qty,
        Balance_After: substoreMed.Quantity,
        Remarks: "Issued to patient via prescription"
      });
    }

    // ------------------------------
    // SAVE LEDGER
    // ------------------------------
    await InstituteLedger.insertMany(ledgerEntries);

    // ------------------------------
    // SUCCESS
    // ------------------------------
    return res.status(200).json({
      message: "Prescription issued successfully"
    });

  } catch (err) {
    console.error("PRESCRIPTION ERROR:", err);
    return res.status(500).json({
      message: err.message
    });
  }
});

// =======================================================
// GET PRESCRIPTIONS FOR EMPLOYEE + FAMILY
// =======================================================
prescriptionApp.get("/employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const familyMembers = await FamilyMember
      .find({ Employee: employeeId })
      .select("_id");

    const familyIds = familyMembers.map(f => f._id);

    const prescriptions = await Prescription.find({
      $or: [
        { Employee: employeeId },
        { FamilyMember: { $in: familyIds } }
      ]
    })
      .populate("Institute", "Institute_Name")
      .populate("Employee", "Name ABS_NO")
      .populate("FamilyMember", "Name Relationship")
      .sort({ Timestamp: -1 });

    return res.status(200).json(prescriptions);

  } catch (err) {
    console.error("Fetch prescription error:", err);
    return res.status(500).json({
      error: "Failed to fetch prescriptions",
      details: err.message
    });
  }
});

// =======================================================
// GET ALL PRESCRIPTIONS FOR AN INSTITUTE (ISSUE REGISTER)
// =======================================================
prescriptionApp.get("/institute/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({
        message: "Invalid Institute ID"
      });
    }

    const prescriptions = await Prescription.find({
      Institute: instituteId
    })
      .populate("Employee", "Name ABS_NO")
      .populate("FamilyMember", "Name Relationship")
      .populate({
        path: "Medicines.Medicine_ID",
        select: `
          Medicine_Name
          Type
          Category
          Expiry_Date
          Medicine_Code
        `
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(prescriptions);
  } catch (err) {
    console.error("Issue register error:", err);

    return res.status(500).json({
      message: "Failed to fetch issued medicines",
      error: err.message
    });
  }
});


module.exports = prescriptionApp;