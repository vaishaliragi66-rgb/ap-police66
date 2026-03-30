const express = require("express");
const mongoose = require("mongoose");
const prescriptionApp = express.Router();
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const Prescription = require("../models/Prescription");
const Institute = require("../models/master_institute");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");
const InstituteLedger = require("../models/InstituteLedger");
const MedicalAction = require("../models/medical_action");
const DailyVisit = require("../models/daily_visit");
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
prescriptionApp.post("/add",verifyToken,
  allowInstituteRoles("pharmacist"), async (req, res) => {
  try {
    console.log("📦 PRESCRIPTION PAYLOAD:", JSON.stringify(req.body, null, 2));

    const {
      Institute_ID,
      Employee_ID,
      Medicines,
      visit_id,
      IsFamilyMember,
      FamilyMember_ID,
      Notes
    } = req.body;

    // ================================
    // BASIC VALIDATION
    // ================================
    if (!Institute_ID || !Employee_ID || !Array.isArray(Medicines) || Medicines.length === 0) {
      return res.status(400).json({ message: "Invalid prescription data" });
    }

    const institute = await Institute.findById(Institute_ID);
    if (!institute) {
      return res.status(400).json({ message: "Institute not found" });
    }

    const ledgerEntries = [];
    const prescriptionMedicines = [];

    // ================================
    // PROCESS EACH MEDICINE
    // ================================
    for (const med of Medicines) {

      const Medicine_Code = med.Medicine_Code || med.Medicine_ID;
      const Medicine_Name = (med.Medicine_Name || "").trim();
      const Strength = (med.Strength || "").trim();
      const qty = Number(med.Quantity);

      if (!Medicine_Code || qty <= 0) {
        return res.status(400).json({ message: "Invalid medicine data" });
      }

      // 🔍 Find substore medicine for this institute
      const substoreMed = await Medicine.findOne({
        Medicine_Code: Medicine_Code,
        Institute_ID: Institute_ID
      });

      if (!substoreMed) {
        return res.status(404).json({
          message: `Medicine ${Medicine_Code} not found in Substore`
        });
      }

      console.log("📊 Stock Check:", {
        Code: substoreMed.Medicine_Code,
        Available: substoreMed.Quantity,
        Requested: qty
      });

      // ================================
      // STOCK VALIDATION
      // ================================
      if (substoreMed.Quantity < qty) {
        return res.status(400).json({
          message: "Insufficient stock",
          medicineName: substoreMed.Medicine_Name,
          available: substoreMed.Quantity,
          requested: qty
        });
      }

      // 🔻 Deduct stock
      substoreMed.Quantity -= qty;
      await substoreMed.save();

      // ================================
      // PREPARE PRESCRIPTION ENTRY
      // ================================
      prescriptionMedicines.push({
        Medicine_ID: substoreMed._id,
        Medicine_Name: substoreMed.Medicine_Name,
        Strength: Strength || substoreMed.Strength || undefined,
        Quantity: qty
      });

      // ================================
      // PREPARE LEDGER ENTRY
      // ================================
      ledgerEntries.push({
        Institute_ID,
        Transaction_Type: "PRESCRIPTION_ISSUE",
        Reference_ID: visit_id || null,
        Medicine_ID: substoreMed._id,
        Medicine_Model: "Medicine",   // IMPORTANT
        Medicine_Name: substoreMed.Medicine_Name,
        Expiry_Date: substoreMed.Expiry_Date,
        Direction: "OUT",
        Quantity: qty,
        Balance_After: substoreMed.Quantity
      });
    }

    // ================================
    // SAVE LEDGER
    // ================================
    if (ledgerEntries.length > 0) {
      await InstituteLedger.insertMany(ledgerEntries);
      console.log(`📚 ${ledgerEntries.length} ledger entries created`);
    }

    // ================================
    // CREATE PRESCRIPTION DOCUMENT
    // ================================
    const prescriptionDoc = new Prescription({
      Institute: Institute_ID,
      Employee: Employee_ID,
      IsFamilyMember: IsFamilyMember || false,
      FamilyMember: FamilyMember_ID || null,
      Medicines: prescriptionMedicines,
      Notes: Notes || "",
      Timestamp: new Date()
    });

    await prescriptionDoc.save();

    console.log("✅ Prescription saved:", prescriptionDoc._id);

    return res.status(200).json({
      success: true,
      message: "Prescription saved successfully",
      prescriptionId: prescriptionDoc._id
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
  .populate("Medicines.Medicine_ID", "Medicine_Code Expiry_Date Strength")  // 🔥 ADD THIS
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
          Strength
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
        Strength: medicine.Strength,
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

prescriptionApp.get("/queue/:instituteId", async (req, res) => {

  try {

    const { instituteId } = req.params;

    const start = new Date();
    start.setHours(0,0,0,0);

    const end = new Date();
    end.setHours(23,59,59,999);

    const visits = await DailyVisit.find({
      Institute_ID: instituteId,
      visit_date: { $gte: start, $lte: end }   // ONLY TODAY
    })
    .populate("employee_id")
    .populate("FamilyMember");

    const actions = await MedicalAction.find({
      action_type: "DOCTOR_PRESCRIPTION"
    });

    const visitIds = actions.map(a => String(a.visit_id));

    const pharmacyVisits = visits.filter(v =>
      visitIds.includes(String(v._id))
    );

    res.json(pharmacyVisits);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Queue error" });
  }

});

module.exports = prescriptionApp;
