// const express = require("express");
// const mongoose = require("mongoose");
// const prescriptionApp = express.Router();

// const Prescription = require("../models/Prescription");
// const Institute = require("../models/master_institute");
// const Employee = require("../models/employee");
// const FamilyMember = require("../models/family_member");
// const Medicine = require("../models/master_medicine");
// const InstituteLedger = require("../models/InstituteLedger");


// // =======================================================
// // ADD PRESCRIPTION  (EMPLOYEE + FAMILY)
// // =======================================================

// prescriptionApp.post("/add", async (req, res) => {
//   console.log("📥 PRESCRIPTION PAYLOAD =", JSON.stringify(req.body, null, 2));

//   try {
//     const {
//       Institute_ID,
//       Employee_ID,
//       IsFamilyMember = false,
//       FamilyMember_ID,
//       Medicines,
//       Notes
//     } = req.body;

//     if (!Institute_ID || !Employee_ID || !Medicines?.length) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }

//     const institute = await Institute.findById(Institute_ID);
//     if (!institute)
//       return res.status(404).json({ message: "Institute not found" });

//     const employee = await Employee.findById(Employee_ID);
//     if (!employee)
//       return res.status(404).json({ message: "Employee not found" });

//     if (IsFamilyMember) {
//       const family = await FamilyMember.findById(FamilyMember_ID);
//       if (!family)
//         return res.status(404).json({ message: "Family member not found" });
//     }


//     // =======================================================
//     // INVENTORY DEDUCTION + LEDGER ENTRY
//     // =======================================================

//     for (const med of Medicines) {

//   const medId = String(m.Medicine_ID || m.medicineId).trim();
//   const medName = m.Medicine_Name || m.medicineName;
//   const qty = Number(m.Quantity || m.quantity);

//   if (!medId || !qty)
//     return res.status(400).json({ message: "Invalid medicine entry" });

//   const invItem = institute.Medicine_Inventory.find(x =>
//     String(x.Medicine_ID) === medId ||
//     String(x.Medicine_ID?._id) === medId
//   );

//   if (!invItem)
//     return res.status(400).json({ message: `Medicine not found in inventory` });

//   if (invItem.Quantity < qty)
//     return res.status(400).json({
//       message: `Insufficient stock for ${medName}`,
//       available: invItem.Quantity,
//       requested: qty
//     });

//   invItem.Quantity -= qty;

//   // 👉 Fetch medicine meta
//   const medDoc = await Medicine.findById(medId)
//     .populate("Manufacturer_ID", "Manufacturer_Name");

//   // Temporarily push ledger entries to array
//   ledgerBuffer.push({
//     Institute_ID,
//     Transaction_Type: "PRESCRIPTION_ISSUE",
//     Reference_ID: null,          // will be updated after save
//     Medicine_ID: medId,
//     Medicine_Name: medName,
//     Manufacturer_Name: medDoc?.Manufacturer_ID?.Manufacturer_Name || "",
//     Expiry_Date: medDoc?.Expiry_Date || null,
//     Direction: "OUT",
//     Quantity: qty,
//     Balance_After: invItem.Quantity
//   });
// }

// await institute.save();

// // SAVE PRESCRIPTION FIRST
// const prescription = await Prescription.create({
//   Institute: Institute_ID,
//   Employee: Employee_ID,
//   IsFamilyMember,
//   FamilyMember: IsFamilyMember ? FamilyMember_ID : null,
//   Medicines,
//   Notes
// });

// // attach prescription ID to ledger
// ledgerBuffer.forEach(l => l.Reference_ID = prescription._id);

// // insert ledger records
// await InstituteLedger.insertMany(ledgerBuffer);

// return res.status(201).json({
//   message: "Prescription saved & ledger updated",
//   prescriptionId: prescription._id
// });



//     // =======================================================
//     // SAVE PRESCRIPTION
//     // =======================================================

//     // const prescription = await Prescription.create({
//     //   Institute: Institute_ID,
//     //   Employee: Employee_ID,
//     //   IsFamilyMember,
//     //   FamilyMember: IsFamilyMember ? FamilyMember_ID : null,
//     //   Medicines,
//     //   Notes
//     // });

//     // // attach ledger records to prescription
//     // await InstituteLedger.updateMany(
//     //   { Reference_ID: null, Institute_ID },
//     //   { $set: { Reference_ID: prescription._id } }
//     // );

//     // return res.status(201).json({
//     //   message: "Prescription saved & ledger updated",
//     //   prescriptionId: prescription._id
//     // });

//   } catch (err) {
//     console.error("Prescription error:", err);
//     return res.status(500).json({ error: err.message });
//   }
// });

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

    if (!Institute_ID || !Employee_ID || !Medicines?.length) {
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
    // INVENTORY DEDUCTION + LEDGER (buffer first)
    // ===================================================

    const ledgerBuffer = [];

    for (const med of Medicines) {

      // normalize frontend field names
      const medId = String(
        med.Medicine_ID || med.medicineId || ""
      ).trim();

      const medName =
        med.Medicine_Name || med.medicineName || "Unknown";

      const qty = Number(m.Quantity || med.quantity || 0);

      if (!medId || !qty) {
        return res.status(400).json({
          message: "Invalid medicine entry",
          medicine: med
        });
      }

      // find medicine in institute stock
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

      const availableQty = Number(invItem.Quantity || 0);

      if (availableQty < qty) {
        return res.status(400).json({
          message: `Insufficient stock for ${medName}`,
          available: availableQty,
          requested: qty
        });
      }

      // deduct stock
      invItem.Quantity = availableQty - qty;

      // fetch medicine metadata
      const medDoc = await Medicine.findById(medId)
        .populate("Manufacturer_ID", "Manufacturer_Name");

      ledgerBuffer.push({
        Institute_ID,
        Transaction_Type: "PRESCRIPTION_ISSUE",
        Reference_ID: null, // attach later
        Medicine_ID: medId,
        Medicine_Name: medName,
        Manufacturer_Name: medDoc?.Manufacturer_ID?.Manufacturer_Name || "",
        Expiry_Date: medDoc?.Expiry_Date || null,
        Direction: "OUT",
        Quantity: qty,
        Balance_After: invItem.Quantity
      });
    }

    // save updated inventory
    await institute.save();


    // ===================================================
    // SAVE PRESCRIPTION FIRST
    // ===================================================

    const prescription = await Prescription.create({
      Institute: Institute_ID,
      Employee: Employee_ID,
      IsFamilyMember,
      FamilyMember: IsFamilyMember ? FamilyMember_ID : null,
      Medicines,
      Notes
    });

    // assign prescription id to ledger records
    ledgerBuffer.forEach(r => r.Reference_ID = prescription._id);

    // bulk insert ledger
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
// GET PRESCRIPTIONS OF EMPLOYEE + FAMILY
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
// GET PRESCRIPTIONS FOR EMPLOYEE + FAMILY
// =======================================================

prescriptionApp.get("/employee/:employeeId", async (req, res) => {
  try {

    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const employeeFamily = await FamilyMember
      .find({ Employee: employeeId })
      .select("_id");

    const familyIds = employeeFamily.map(f => f._id);

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





// ==========================
// GET PRESCRIPTIONS FOR EMPLOYEE + FAMILY
// ==========================
prescriptionApp.get("/employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const employeeFamily = await FamilyMember.find({ Employee: employeeId })
      .select("_id");

    const familyIds = employeeFamily.map(f => f._id);

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

    res.status(200).json(prescriptions);

  } catch (err) {
    console.error("Fetch prescription error:", err);
    res.status(500).json({
      error: "Failed to fetch prescriptions",
      details: err.message
    });
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