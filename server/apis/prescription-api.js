const express = require("express");
const mongoose = require("mongoose");
const prescriptionApp = express.Router();

const Prescription = require("../models/Prescription");
const Institute = require("../models/master_institute");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");
const Medicine = require("../models/master_medicine"); 
const InstituteLedger = require("../models/InstituteLedger");
// POST /prescription-api/add
prescriptionApp.post("/add", async (req, res) => {
  try {
    const {
      Institute_ID,
      Employee_ID,
      IsFamilyMember = false,
      FamilyMember_ID,
      Medicines,
      Notes
    } = req.body;

    if (!Institute_ID || !Employee_ID || !Medicines?.length) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const institute = await Institute.findById(Institute_ID);
    if (!institute) return res.status(404).json({ message: "Institute not found" });

    const employee = await Employee.findById(Employee_ID);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    if (IsFamilyMember) {
      const family = await FamilyMember.findById(FamilyMember_ID);
      if (!family) return res.status(404).json({ message: "Family member not found" });
    }

    // 🔻 INVENTORY DEDUCTION + LEDGER WRITE
    for (const med of Medicines) {
      const invItem = institute.Medicine_Inventory.find(
        (m) => m.Medicine_ID.toString() === med.Medicine_ID
      );

      if (!invItem || invItem.Quantity < med.Quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      invItem.Quantity -= Number(med.Quantity);

      const medDoc = await Medicine.findById(med.Medicine_ID).populate(
        "Manufacturer_ID",
        "Manufacturer_Name"
      );

      // ✅ LEDGER ENTRY (OUT)
      await InstituteLedger.create({
        Institute_ID,
        Transaction_Type: "PRESCRIPTION_ISSUE",
        Reference_ID: null, // filled after prescription save
        Medicine_ID: med.Medicine_ID,
        Medicine_Name: med.Medicine_Name,
        Manufacturer_Name: medDoc?.Manufacturer_ID?.Manufacturer_Name || "",
        Expiry_Date: medDoc.Expiry_Date,
        Direction: "OUT",
        Quantity: med.Quantity,
        Balance_After: invItem.Quantity
      });
    }

    await institute.save();

    // Save Prescription
    const prescription = await Prescription.create({
      Institute: Institute_ID,
      Employee: Employee_ID,
      IsFamilyMember,
      FamilyMember: IsFamilyMember ? FamilyMember_ID : null,
      Medicines,
      Notes
    });

    // 🔗 Update Reference_ID in ledger
    await InstituteLedger.updateMany(
      { Reference_ID: null, Institute_ID },
      { $set: { Reference_ID: prescription._id } }
    );

    return res.status(201).json({
      message: "Prescription saved & ledger updated",
      prescriptionId: prescription._id
    });

  } catch (err) {
    console.error("Prescription error:", err);
    return res.status(500).json({ error: err.message });
  }
});

prescriptionApp.get("/employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    // Fetch family members of this employee
    const employeeFamily = await FamilyMember.find({ Employee: employeeId }).select("_id");
    const familyIds = employeeFamily.map(f => f._id);

    // ✅ Correct populate fields
    const prescriptions = await Prescription.find({
      $or: [{ Employee: employeeId }, { FamilyMember: { $in: familyIds } }]
    })
      .populate("Institute", "Institute_Name")  // FIXED ✅
      .populate("Employee", "Name")
      .populate("FamilyMember", "Name Relationship")
      .sort({ Timestamp: -1 });

    res.status(200).json(prescriptions);
  } catch (err) {
    console.error("Error fetching prescriptions:", err);
    res.status(500).json({ error: "Failed to fetch prescriptions", details: err.message });
  }
});



module.exports = prescriptionApp;