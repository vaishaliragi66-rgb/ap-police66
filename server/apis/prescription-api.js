const express = require("express");
const mongoose = require("mongoose");
const prescriptionApp = express.Router();

const Prescription = require("../models/Prescription");
const Institute = require("../models/master_institute");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");
const Medicine = require("../models/master_medicine");
const InstituteLedger = require("../models/InstituteLedger");


// =======================================================
// ADD PRESCRIPTION (EMPLOYEE / FAMILY)
// =======================================================
prescriptionApp.post("/add", async (req, res) => {
  console.log("📥 PRESCRIPTION PAYLOAD =", JSON.stringify(req.body, null, 2));

  try {
    const {
      Institute_ID,
      Employee_ID,
      IsFamilyMember = false,
      FamilyMember_ID,
      Medicines,
      Notes
    } = req.body;

    if (!Institute_ID || !Employee_ID || !Array.isArray(Medicines) || Medicines.length === 0) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const institute = await Institute.findById(Institute_ID);
    if (!institute)
      return res.status(404).json({ message: "Institute not found" });

    const employee = await Employee.findById(Employee_ID);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    if (IsFamilyMember) {
      const family = await FamilyMember.findById(FamilyMember_ID);
      if (!family)
        return res.status(404).json({ message: "Family member not found" });
    }

    // ===================================================
    // INVENTORY DEDUCTION + LEDGER BUFFER
    // ===================================================
    const ledgerBuffer = [];

    for (const med of Medicines) {

      const medId = String(
        med.Medicine_ID || med.medicineId || ""
      ).trim();

      const medName =
        med.Medicine_Name || med.medicineName || "Unknown";

      const qty = Number(
        med.Quantity || med.quantity || 0
      );

      if (!medId || qty <= 0) {
        return res.status(400).json({
          message: "Invalid medicine entry",
          medicine: med
        });
      }

      const invItem = institute.Medicine_Inventory.find(item =>
        String(item.Medicine_ID) === medId ||
        String(item.Medicine_ID?._id) === medId
      );

      if (!invItem) {
        return res.status(400).json({
          message: `Medicine not found in inventory`,
          medicineId: medId,
          medicineName: medName
        });
      }

      if (invItem.Quantity < qty) {
        return res.status(400).json({
          message: `Insufficient stock for ${medName}`,
          available: invItem.Quantity,
          requested: qty
        });
      }

      // Deduct stock
      invItem.Quantity -= qty;

      const medDoc = await Medicine.findById(medId)
        .populate("Manufacturer_ID", "Manufacturer_Name");

      ledgerBuffer.push({
        Institute_ID,
        Transaction_Type: "PRESCRIPTION_ISSUE",
        Reference_ID: null, // set after prescription save
        Medicine_ID: medId,
        Medicine_Name: medName,
        Manufacturer_Name: medDoc?.Manufacturer_ID?.Manufacturer_Name || "",
        Expiry_Date: medDoc?.Expiry_Date || null,
        Direction: "OUT",
        Quantity: qty,
        Balance_After: invItem.Quantity
      });
    }

    await institute.save();

    // ===================================================
    // SAVE PRESCRIPTION
    // ===================================================
    const prescription = await Prescription.create({
      Institute: Institute_ID,
      Employee: Employee_ID,
      IsFamilyMember,
      FamilyMember: IsFamilyMember ? FamilyMember_ID : null,
      Medicines,
      Notes
    });

    // Attach prescription id to ledger entries
    ledgerBuffer.forEach(l => {
      l.Reference_ID = prescription._id;
    });

    await InstituteLedger.insertMany(ledgerBuffer);

    return res.status(201).json({
      message: "Prescription saved & ledger updated",
      prescriptionId: prescription._id
    });

  } catch (err) {
    console.error("Prescription error:", err);
    return res.status(500).json({ error: err.message });
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