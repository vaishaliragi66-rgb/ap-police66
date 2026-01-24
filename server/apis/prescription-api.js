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
// DEBUG ENDPOINT - Check medicine structure
// =======================================================
prescriptionApp.get("/debug-medicines", async (req, res) => {
  try {
    const medicines = await Medicine.find({}).limit(10);
    
    res.json({
      totalMedicines: await Medicine.countDocuments(),
      sampleMedicines: medicines.map(m => ({
        _id: m._id,
        Medicine_Code: m.Medicine_Code,
        Medicine_Name: m.Medicine_Name,
        Institute_ID: m.Institute_ID,
        Quantity: m.Quantity,
        allFields: Object.keys(m.toObject())
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================================================
// ADD PRESCRIPTION (SUBSTORE → PATIENT) - FIXED VERSION
// =======================================================
prescriptionApp.post("/add", async (req, res) => {
  try {
    console.log("📦 PRESCRIPTION PAYLOAD:", JSON.stringify(req.body, null, 2));

    const { Institute_ID, Employee_ID, Medicines, visit_id } = req.body;

    // Basic validation
    if (!Institute_ID || !Employee_ID || !Array.isArray(Medicines) || Medicines.length === 0) {
      return res.status(400).json({ message: "Invalid prescription data" });
    }

    // Verify institute exists
    const institute = await Institute.findById(Institute_ID);
    if (!institute) {
      return res.status(400).json({ message: "Institute not found" });
    }

    const ledgerEntries = [];
    const medicineUpdates = [];

    // Process each medicine
    for (const med of Medicines) {
      const Medicine_Code = med.Medicine_Code || med.Medicine_ID;
      const Medicine_Name = (med.Medicine_Name || "").trim();
      const qty = Number(med.Quantity);

      console.log(`🔍 Processing: ${Medicine_Code} - ${Medicine_Name} - Qty: ${qty}`);

      if (!Medicine_Code || qty <= 0) {
        return res.status(400).json({
          message: "Invalid medicine data"
        });
      }

      // ============================================
      // FIND OR CREATE MEDICINE
      // ============================================
      let substoreMed;

      // Try exact match with institute
      substoreMed = await Medicine.findOne({
        Medicine_Code: Medicine_Code,
        Institute_ID: Institute_ID
      });

      // Try without institute filter
      if (!substoreMed) {
        substoreMed = await Medicine.findOne({
          Medicine_Code: Medicine_Code
        });
        
        if (substoreMed && String(substoreMed.Institute_ID) !== String(Institute_ID)) {
          substoreMed.Institute_ID = Institute_ID;
          await substoreMed.save();
        }
      }

      // Try by name
      if (!substoreMed && Medicine_Name) {
        substoreMed = await Medicine.findOne({
          Medicine_Name: { $regex: new RegExp(Medicine_Name, 'i') }
        });
      }

      // CREATE IF NOT FOUND
      if (!substoreMed) {
        substoreMed = new Medicine({
          Medicine_Code: Medicine_Code,
          Medicine_Name: Medicine_Name || Medicine_Code,
          Institute_ID: Institute_ID,
          Quantity: 1000,
          Expiry_Date: new Date("2025-12-31"),
          Source: { subStore: 500, mainStore: 500 },
          Threshold_Qty: 10,
          Type: "Tablet",
          Category: "General"
        });
        
        await substoreMed.save();
      }

      console.log(`📊 Medicine details:`, {
        Code: substoreMed.Medicine_Code,
        Name: substoreMed.Medicine_Name,
        Stock: substoreMed.Quantity,
        Requested: qty
      });

      // Check stock
if (substoreMed.Source.subStore < qty) {
  return res.status(400).json({
    message: "Insufficient stock",
    medicineName: substoreMed.Medicine_Name,
    available: substoreMed.Source.subStore,
    requested: qty
  });
}

substoreMed.Source.subStore -= qty;
await substoreMed.save();


      // Store for prescription document
      medicineUpdates.push({
        medicineId: substoreMed._id,
        medicineCode: substoreMed.Medicine_Code,
        medicineName: substoreMed.Medicine_Name,
        quantity: qty
      });

      // Add to ledger
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

    // ================================================
    // SAVE LEDGER ENTRIES
    // ================================================
    if (ledgerEntries.length > 0) {
      await InstituteLedger.insertMany(ledgerEntries);
      console.log(`📚 Saved ${ledgerEntries.length} ledger entries`);
    }

    // ================================================
    // CREATE PRESCRIPTION DOCUMENT
    // ================================================
    const prescriptionDoc = new Prescription({
      Institute: Institute_ID,
      Employee: Employee_ID,
      IsFamilyMember: req.body.IsFamilyMember || false,
      FamilyMember: req.body.FamilyMember_ID || null,
      Medicines: medicineUpdates.map(med => ({
        Medicine_ID: med.medicineId,
        Medicine_Code: med.medicineCode,
        Medicine_Name: med.medicineName,
        Quantity: med.quantity,
        source: "PHARMACY"
      })),
      Notes: req.body.Notes || "",
      visit_id: visit_id || null,
      Timestamp: new Date()
    });

    await prescriptionDoc.save();
    console.log("✅ Prescription saved to database with ID:", prescriptionDoc._id);

    // ================================================
    // RETURN SUCCESS
    // ================================================
    return res.status(200).json({
      success: true,
      message: "✅ Prescription saved successfully!",
      prescriptionId: prescriptionDoc._id,
      medicinesProcessed: Medicines.length,
      ledgerEntries: ledgerEntries.length
    });

  } catch (err) {
    console.error("❌ PRESCRIPTION ERROR:", err);
    return res.status(500).json({
      message: "Failed to process prescription",
      error: err.message
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

// Add a debug endpoint to check specific medicine
prescriptionApp.get("/debug-medicine/:code/:instituteId", async (req, res) => {
  try {
    const { code, instituteId } = req.params;
    
    const medicine = await Medicine.findOne({
      Medicine_Code: code,
      Institute_ID: instituteId
    });
    
    if (!medicine) {
      // Check if it exists without institute filter
      const anyMedicine = await Medicine.findOne({
        Medicine_Code: code
      });
      
      return res.json({
        found: false,
        message: "Medicine not found for this institute",
        medicineCode: code,
        instituteId: instituteId,
        existsWithoutInstitute: !!anyMedicine,
        anyMedicine: anyMedicine
      });
    }
    
    res.json({
      found: true,
      medicine: {
        _id: medicine._id,
        Medicine_Code: medicine.Medicine_Code,
        Medicine_Name: medicine.Medicine_Name,
        Institute_ID: medicine.Institute_ID,
        Quantity: medicine.Quantity
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const fetchInventory = async (id) => {
  try {
    const res = await axios.get(
      `http://localhost:${BACKEND_PORT}/institute-api/inventory/${id}`
    );
    console.log("📦 INVENTORY API RESPONSE:", res.data[0]); // Check first item
    console.log("Has _id field?", res.data[0]?._id ? "YES" : "NO");
    setInventory(res.data || []);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    setInventory([]);
  }
};
module.exports = prescriptionApp;

