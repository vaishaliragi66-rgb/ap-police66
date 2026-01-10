const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

const mainStoreApp = express.Router();
const MainStoreMedicine = require("../models/main_store");
const Institute = require("../models/master_institute");
const Medicine = require("../models/master_medicine");
const InstituteLedger = require("../models/InstituteLedger");
mainStoreApp.post("/add", expressAsyncHandler(async (req, res) => {
  try {
    const {
      Institute_ID,           // ✅ FIXED
      Medicine_Code,
      Medicine_Name,
      Type,
      Category,
      Quantity,
      Threshold_Qty,
      Issued_By,
      Expiry_Date
    } = req.body;

    if (!Institute_ID) {
      return res.status(400).json({ message: "Institute_ID is required" });
    }

    const required = [
      "Medicine_Code",
      "Medicine_Name",
      "Quantity",
      "Threshold_Qty",
      "Issued_By",
      "Expiry_Date"
    ];

    const missing = required.filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({
        message: `Missing fields: ${missing.join(", ")}`
      });
    }

    const expiry = new Date(Expiry_Date);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (expiry <= today) {
      return res.status(400).json({
        message: "Expiry date must be in the future"
      });
    }

    const exists = await MainStoreMedicine.findOne({ Medicine_Code });
    if (exists) {
      return res.status(400).json({
        message: "Medicine code already exists"
      });
    }

    const med = await MainStoreMedicine.create({
      Institute_ID,
      Medicine_Code,
      Medicine_Name,
      Type,
      Category,
      Quantity: Number(Quantity),
      Threshold_Qty: Number(Threshold_Qty),
      Issued_By,
      Expiry_Date: expiry
    });

    // ✅ LEDGER ENTRY (MAIN STORE IN)
    await InstituteLedger.create({
      Institute_ID,
      Store_Type: "MAIN",
      Transaction_Type: "MAINSTORE_ADD",
      Medicine_ID: med._id,
      Medicine_Name: med.Medicine_Name,
      Direction: "IN",
      Quantity: med.Quantity,
      Balance_After: med.Quantity,
      Expiry_Date: med.Expiry_Date,
      Remarks: "Added to Main Store"
    });

    res.status(201).json({
      message: "Medicine added to Main Store",
      medicine: med
    });

  } catch (err) {
    console.error("MAIN STORE ADD ERROR:", err);
    res.status(500).json({
      message: "Failed to add medicine",
      error: err.message
    });
  }
}));

mainStoreApp.get("/all-medicines", async (req, res) => {
  try {
    const meds = await MainStoreMedicine.find().sort({ Expiry_Date:1 });
    res.json(meds);
  } catch (err) {
    res.status(500).json({ message:"Failed to fetch medicines", error:err.message });
  }
});
mainStoreApp.get("/medicine/:id", async (req, res) => {
  try {
    const med = await MainStoreMedicine.findById(req.params.id);
    if (!med) return res.status(404).json({ message:"Medicine not found" });
    res.json(med);
  } catch (err) {
    res.status(500).json({ message:"Failed", error:err.message });
  }
});
mainStoreApp.put("/update/:id", async (req, res) => {
  try {
    const updates = req.body;

    if (updates.Quantity) updates.Quantity = Number(updates.Quantity);
    if (updates.Threshold_Qty) updates.Threshold_Qty = Number(updates.Threshold_Qty);

    if (updates.Expiry_Date) {
      const exp = new Date(updates.Expiry_Date);
      if (exp <= new Date()) return res.status(400)
        .json({ message:"Expiry must be future" });
      updates.Expiry_Date = exp;
    }

    const med = await MainStoreMedicine.findByIdAndUpdate(
      req.params.id, updates, { new:true, runValidators:true });

    if (!med) return res.status(404).json({ message:"Not found" });

    res.json({ message:"Updated", medicine:med });

  } catch (err) {
    res.status(500).json({ message:"Update failed", error:err.message });
  }
});

mainStoreApp.post("/transfer/institute", async (req, res) => {
  try {
    const {
      Medicine_ID,
      Transfer_Qty,
      From_Institute_ID,
      To_Institute_ID
    } = req.body;

    const qty = Number(Transfer_Qty);

    if (!Medicine_ID || !From_Institute_ID || !To_Institute_ID || qty <= 0) {
      return res.status(400).json({ message: "Invalid transfer data" });
    }

    const med = await MainStoreMedicine.findById(Medicine_ID);
    if (!med) {
      return res.status(404).json({ message: "Medicine not found in Main Store" });
    }

    if (med.Quantity < qty) {
      return res.status(400).json({ message: "Insufficient stock in Main Store" });
    }

    // 🔻 MAIN STORE (SOURCE) OUT
    med.Quantity -= qty;
    await med.save();

    // ➕ TARGET INSTITUTE INVENTORY
    const targetInstitute = await Institute.findById(To_Institute_ID);
    if (!targetInstitute) {
      return res.status(404).json({ message: "Target institute not found" });
    }

    const existing = targetInstitute.Medicine_Inventory.find(
      m => String(m.Medicine_ID) === String(Medicine_ID)
    );

    if (existing) {
      existing.Quantity += qty;
    } else {
      targetInstitute.Medicine_Inventory.push({
        Medicine_ID,
        Quantity: qty
      });
    }

    await targetInstitute.save();

    // 📒 LEDGER — SOURCE INSTITUTE (OUT)
    await InstituteLedger.create({
      Institute_ID: From_Institute_ID,
      Store_Type: "MAIN",
      Transaction_Type: "STORE_TRANSFER", // ✅ VALID ENUM
      Direction: "OUT",
      Medicine_ID: med._id,
      Medicine_Name: med.Medicine_Name,
      Quantity: qty,
      Balance_After: med.Quantity,
      Expiry_Date: med.Expiry_Date,        // ✅ REQUIRED
      Remarks: `Transferred to institute ${To_Institute_ID}`
    });

    // 📒 LEDGER — TARGET INSTITUTE (IN)
    await InstituteLedger.create({
      Institute_ID: To_Institute_ID,
      Store_Type: "MAIN",
      Transaction_Type: "STORE_TRANSFER", // ✅ VALID ENUM
      Direction: "IN",
      Medicine_ID: med._id,
      Medicine_Name: med.Medicine_Name,
      Quantity: qty,
      Balance_After: existing
        ? existing.Quantity
        : qty,                             // ✅ REQUIRED
      Expiry_Date: med.Expiry_Date,        // ✅ REQUIRED
      Remarks: `Received from institute ${From_Institute_ID}`
    });

    res.json({
      message: "Institute transfer completed with ledger entries"
    });

  } catch (err) {
    console.error("INSTITUTE TRANSFER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

mainStoreApp.delete("/delete/:id", async (req, res) => {
  try {
    const med = await MainStoreMedicine.findById(req.params.id);
    if (!med) return res.status(404).json({ message:"Not found" });

    await MainStoreMedicine.findByIdAndDelete(req.params.id);

    res.json({ message:"Deleted successfully" });

  } catch (err) {
    res.status(500).json({ message:"Delete failed", error:err.message });
  }
});

mainStoreApp.post("/transfer/substore", async (req, res) => {
  try {
    const {
      Medicine_ID,
      Transfer_Qty,
      Institute_ID
    } = req.body;

    const qty = Number(Transfer_Qty);

    // 🔍 Basic validation
    if (!Medicine_ID || !Institute_ID || qty <= 0) {
      return res.status(400).json({ message: "Invalid transfer data" });
    }

    // 🔎 Fetch medicine from MAIN STORE
    const mainMed = await MainStoreMedicine.findById(Medicine_ID);
    if (!mainMed) {
      return res.status(404).json({ message: "Medicine not found in Main Store" });
    }

    if (mainMed.Quantity < qty) {
      return res.status(400).json({ message: "Insufficient stock in Main Store" });
    }

    // 🔻 Deduct from MAIN STORE
    mainMed.Quantity -= qty;
    await mainMed.save();

    // 🔎 Check if medicine already exists in SUB STORE
    const existingSubstoreMed = await Medicine.findOne({
      Institute_ID,
      Medicine_Code: mainMed.Medicine_Code
    });

    let finalSubstoreQty = 0;

    if (existingSubstoreMed) {
      // ➕ Update existing medicine
      existingSubstoreMed.Quantity += qty;
      finalSubstoreQty = existingSubstoreMed.Quantity;
      await existingSubstoreMed.save();
    } else {
      // ➕ Create NEW medicine in substore (IMPORTANT FIX)
      const newMed = await Medicine.create({
        Institute_ID,                 // ✅ REQUIRED
        Medicine_Code: mainMed.Medicine_Code,
        Medicine_Name: mainMed.Medicine_Name,
        Type: mainMed.Type,
        Category: mainMed.Category,
        Quantity: qty,
        Threshold_Qty: mainMed.Threshold_Qty,
        Expiry_Date: mainMed.Expiry_Date,
        Source: "MAIN_STORE"
      });

      finalSubstoreQty = newMed.Quantity;
    }

    // 📒 LEDGER — MAIN STORE (OUT)
    await InstituteLedger.create({
      Institute_ID,
      Store_Type: "MAIN",
      Transaction_Type: "STORE_TRANSFER",
      Direction: "OUT",
      Medicine_ID: mainMed._id,
      Medicine_Name: mainMed.Medicine_Name,
      Quantity: qty,
      Balance_After: mainMed.Quantity,
      Expiry_Date: mainMed.Expiry_Date,
      Remarks: "Transferred to Sub Store"
    });

    // 📒 LEDGER — SUB STORE (IN)
    await InstituteLedger.create({
      Institute_ID,
      Store_Type: "SUB",
      Transaction_Type: "STORE_TRANSFER",
      Direction: "IN",
      Medicine_ID: mainMed._id,
      Medicine_Name: mainMed.Medicine_Name,
      Quantity: qty,
      Balance_After: finalSubstoreQty,
      Expiry_Date: mainMed.Expiry_Date,
      Remarks: "Received from Main Store"
    });

    res.json({
      message: "Sub-Store transfer completed successfully"
    });

  } catch (err) {
    console.error("SUBSTORE TRANSFER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = mainStoreApp