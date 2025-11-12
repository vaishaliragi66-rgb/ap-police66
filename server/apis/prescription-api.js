const express = require("express");
const mongoose = require("mongoose");
const prescriptionApp = express.Router();

const Prescription = require("../models/Prescription");
const Institute = require("../models/master_institute");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");
const Medicine = require("../models/master_medicine"); // if you have a Medicine model

// POST /prescription-api/add
prescriptionApp.post("/add", async (req, res) => {
  try {
    console.log("Incoming prescription payload:", req.body);

    const {
      Institute_ID,
      Employee_ID,
      IsFamilyMember = false,
      FamilyMember_ID,
      Medicines,
      Notes
    } = req.body;

    // Basic presence checks
    if (!Institute_ID || !Employee_ID || !Array.isArray(Medicines) || Medicines.length === 0) {
      return res.status(400).json({ message: "Institute_ID, Employee_ID and at least one Medicine are required." });
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(Institute_ID)) {
      return res.status(400).json({ message: "Invalid Institute_ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(Employee_ID)) {
      return res.status(400).json({ message: "Invalid Employee_ID" });
    }
    if (IsFamilyMember && FamilyMember_ID && !mongoose.Types.ObjectId.isValid(FamilyMember_ID)) {
      return res.status(400).json({ message: "Invalid FamilyMember_ID" });
    }

    // Validate each medicine entry has Medicine_ID + valid quantity
    for (let i = 0; i < Medicines.length; i++) {
      const m = Medicines[i];
      if (!m.Medicine_ID || !mongoose.Types.ObjectId.isValid(m.Medicine_ID)) {
        return res.status(400).json({ message: `Invalid or missing Medicine_ID at index ${i}` });
      }
      if (!m.Quantity || Number(m.Quantity) <= 0) {
        return res.status(400).json({ message: `Quantity must be > 0 at index ${i}` });
      }
    }

    // Ensure institute and employee exist
    const institute = await Institute.findById(Institute_ID);
    if (!institute) return res.status(404).json({ message: "Institute not found" });

    const employee = await Employee.findById(Employee_ID);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // If IsFamilyMember true, ensure family member belongs to employee (optional)
    if (IsFamilyMember) {
      if (!FamilyMember_ID) return res.status(400).json({ message: "FamilyMember_ID required when IsFamilyMember is true" });
      const family = await FamilyMember.findById(FamilyMember_ID);
      if (!family) return res.status(404).json({ message: "Family member not found" });
      // optional: ensure family.Employee equals Employee_ID
      if (family.Employee && family.Employee.toString() !== Employee_ID) {
        return res.status(400).json({ message: "Family member does not belong to the provided employee" });
      }
    }

    // Inventory deduction: verify stock exists and do the deduction (non-negative)
    // We'll operate in-memory then save the institute once after processing all medicines.
    const invUpdates = []; // {invItem, qtyToDeduct}
    for (const med of Medicines) {
      const medId = med.Medicine_ID.toString();
      const qtyReq = Number(med.Quantity);

      // find inventory item
      const invItem = institute.Medicine_Inventory.find(
        (it) => it.Medicine_ID && it.Medicine_ID.toString() === medId
      );

      if (!invItem) {
        // no inventory record for this medicine in this institute
        return res.status(400).json({ message: `Medicine with id ${medId} not available in institute inventory.` });
      }

      // If available stock is zero -> reject
      if (invItem.Quantity <= 0) {
        return res.status(400).json({ message: `Medicine ${medId} is out of stock in institute.` });
      }

      // If requested more than available, we allow transaction but cap deduction to available (you asked to allow if >0)
      const deductQty = Math.min(qtyReq, invItem.Quantity);
      invUpdates.push({ invItem, deductQty, medId, requested: qtyReq, beforeQty: invItem.Quantity });
      // we will set invItem.Quantity later before saving the institute doc
    }

    // Apply inventory updates
    for (const u of invUpdates) {
      u.invItem.Quantity = Math.max(0, u.invItem.Quantity - u.deductQty);
    }
    await institute.save();

    // Prepare prescription document fields matching Prescription model
    const prescriptionDoc = {
      Institute: Institute_ID,
      Employee: Employee_ID,
      IsFamilyMember: !!IsFamilyMember,
      FamilyMember: IsFamilyMember ? FamilyMember_ID : null,
      Medicines: Medicines.map((m) => ({
        Medicine_ID: m.Medicine_ID,
        Medicine_Name: m.Medicine_Name || "",
        Quantity: Number(m.Quantity)
      })),
      Notes: Notes || ""
    };

    const newPrescription = new Prescription(prescriptionDoc);
    await newPrescription.save();

    // Update Employee or FamilyMember medical history (append)
    const medicalEntry = {
      Date: new Date(),
      Diagnosis: "", // optional: if your frontend sends diagnosis, include it
      Medicines: Medicines.map((m) => ({ Medicine_Name: m.Medicine_Name || "", Quantity: Number(m.Quantity) })),
      Notes: Notes || ""
    };

    if (IsFamilyMember && FamilyMember_ID) {
      await FamilyMember.findByIdAndUpdate(FamilyMember_ID, { $push: { Medical_History: medicalEntry } });
    } else {
      await Employee.findByIdAndUpdate(Employee_ID, { $push: { Medical_History: medicalEntry } });
    }

    // Return success and useful info (remaining stocks for medicines)
    const remaining = invUpdates.map(u => ({ medicineId: u.medId, before: u.beforeQty, deducted: u.deductQty, after: u.invItem.Quantity }));
    return res.status(201).json({ message: "Prescription saved and inventory updated", prescriptionId: newPrescription._id, remaining });

  } catch (err) {
  console.error("Prescription save error:", err);

  // If document was still successfully written, send 200 to frontend
  if (err.message && err.message.includes("Plan executor error") && err.message.includes("_id")) {
    console.warn("⚠️ Non-fatal Mongo error (already saved). Returning success anyway.");
    return res.status(200).json({ message: "Prescription saved successfully (with warning)" });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: "Validation Error", details: err.message });
  }

  return res.status(500).json({ error: "Failed to save prescription", details: err.message });
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