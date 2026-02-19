const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const mainStoreApp = express.Router();
const MainStoreMedicine = require("../models/main_store");
const Institute = require("../models/master_institute");
const Medicine = require("../models/master_medicine");
const InstituteLedger = require("../models/InstituteLedger");

mainStoreApp.post(
  "/add",
  expressAsyncHandler(async (req, res) => {
    try {
      const {
        Institute_ID,
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
      today.setHours(0, 0, 0, 0);

      if (expiry <= today) {
        return res.status(400).json({
          message: "Expiry date must be in the future"
        });
      }

      // ✅ CHECK duplicate per institute (not globally)
      const exists = await MainStoreMedicine.findOne({
        Medicine_Code,
        Institute_ID
      });

      if (exists) {
        return res.status(400).json({
          message: "Medicine already exists in this institute"
        });
      }

      // ✅ CREATE with required Source
      const med = await MainStoreMedicine.create({
        Institute_ID,
        Medicine_Code,
        Medicine_Name,
        Type,
        Category,
        Quantity: Number(Quantity),
        Threshold_Qty: Number(Threshold_Qty),
        Source: "distributer",      // ✅ REQUIRED FIELD
        Issued_By,
        Expiry_Date: expiry
      });

      // ✅ LEDGER ENTRY (MAIN STORE IN)
      await InstituteLedger.create({
        Institute_ID,
        Transaction_Type: "MAINSTORE_ADD",
        Reference_ID: null,
        Medicine_ID: med._id,
        Medicine_Name: med.Medicine_Name,
        Medicine_Model: "MainStoreMedicine",
        Expiry_Date: med.Expiry_Date,
        Direction: "IN",
        Quantity: med.Quantity,
        Balance_After: med.Quantity
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
  })
);


mainStoreApp.get("/all-medicines/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;
    console.log("Fetching medicines for institute:", instituteId);
    const medicines = await MainStoreMedicine.find({
      Institute_ID: instituteId
    });

    res.json(medicines);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
mainStoreApp.put("/update/:id",verifyToken,
  allowInstituteRoles("pharmacist"), async (req, res) => {
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


mainStoreApp.post("/transfer/institute",verifyToken,
  allowInstituteRoles("pharmacist"), async (req, res) => {
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

    if (From_Institute_ID === To_Institute_ID) {
      return res.status(400).json({ message: "Cannot transfer to same institute" });
    }

    const sendingMed = await MainStoreMedicine.findById(Medicine_ID);
    if (!sendingMed) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    if (sendingMed.Quantity < qty) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    // 🔻 Deduct from sender WITHOUT triggering full validation
    await MainStoreMedicine.updateOne(
      { _id: sendingMed._id },
      { $inc: { Quantity: -qty } }
    );

    const senderBalanceAfter = sendingMed.Quantity - qty;

    const sendingInstitute = await Institute.findById(From_Institute_ID);
    if (!sendingInstitute) {
      return res.status(404).json({ message: "Sending institute not found" });
    }

    // 🔎 Check receiving main store
    let receivingMed = await MainStoreMedicine.findOne({
      Institute_ID: To_Institute_ID,
      Medicine_Code: sendingMed.Medicine_Code
    });

    let receiverBalanceAfter = 0;

    if (receivingMed) {
      await MainStoreMedicine.updateOne(
        { _id: receivingMed._id },
        {
          $inc: { Quantity: qty },
          $set: { Source: receivingMed.Source || "institute_transfer" }
        }
      );

      receiverBalanceAfter = receivingMed.Quantity + qty;
    } else {
      receivingMed = await MainStoreMedicine.create({
        Institute_ID: To_Institute_ID,
        Medicine_Code: sendingMed.Medicine_Code,
        Medicine_Name: sendingMed.Medicine_Name,
        Type: sendingMed.Type,
        Category: sendingMed.Category,
        Quantity: qty,
        Threshold_Qty: sendingMed.Threshold_Qty,
        Expiry_Date: sendingMed.Expiry_Date,
        Source: "institute_transfer",
        Issued_By: sendingInstitute.Institute_Name
      });

      receiverBalanceAfter = qty;
    }

    // 📒 Ledger OUT
    await InstituteLedger.create({
      Institute_ID: From_Institute_ID,
      Transaction_Type: "STORE_TRANSFER",
      Reference_ID: null,
      Medicine_Model: "MainStoreMedicine",
      Medicine_ID: sendingMed._id,
      Medicine_Name: sendingMed.Medicine_Name,
      Expiry_Date: sendingMed.Expiry_Date,
      Direction: "OUT",
      Quantity: qty,
      Balance_After: senderBalanceAfter
    });

    // 📒 Ledger IN
    await InstituteLedger.create({
      Institute_ID: To_Institute_ID,
      Transaction_Type: "STORE_TRANSFER",
      Medicine_Model: "MainStoreMedicine",
      Reference_ID: null,
      Medicine_ID: receivingMed._id,
      Medicine_Name: receivingMed.Medicine_Name,
      Expiry_Date: receivingMed.Expiry_Date,
      Direction: "IN",
      Quantity: qty,
      Balance_After: receiverBalanceAfter
    });

    res.json({ message: "Institute to Institute transfer successful" });

  } catch (err) {
    console.error("TRANSFER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

mainStoreApp.delete("/delete/:id",verifyToken,
  allowInstituteRoles("pharmacist"), async (req, res) => {
  try {
    const med = await MainStoreMedicine.findById(req.params.id);
    if (!med) return res.status(404).json({ message:"Not found" });

    await MainStoreMedicine.findByIdAndDelete(req.params.id);

    res.json({ message:"Deleted successfully" });

  } catch (err) {
    res.status(500).json({ message:"Delete failed", error:err.message });
  }
});

mainStoreApp.post("/transfer/substore", verifyToken,
  allowInstituteRoles("pharmacist"),async (req, res) => {
  try {
    const { Medicine_ID, Transfer_Qty, Institute_ID } = req.body;
    const qty = Number(Transfer_Qty);

    if (!Medicine_ID || !Institute_ID || qty <= 0) {
      return res.status(400).json({ message: "Invalid transfer data" });
    }

    // 🔎 Fetch from Main Store
    const mainMed = await MainStoreMedicine.findById(Medicine_ID);
    if (!mainMed) {
      return res.status(404).json({ message: "Medicine not found in Main Store" });
    }

    if (mainMed.Quantity < qty) {
      return res.status(400).json({ message: "Insufficient stock in Main Store" });
    }

    // 🔻 Deduct from Main Store
    await MainStoreMedicine.updateOne(
      { _id: mainMed._id },
      { $inc: { Quantity: -qty } }
    );

    const senderBalanceAfter = mainMed.Quantity - qty;

    // 🔎 Check Substore
    let subMed = await Medicine.findOne({
      Institute_ID,
      Medicine_Code: mainMed.Medicine_Code
    });

    let receiverBalanceAfter = 0;

    if (subMed) {
      await Medicine.updateOne(
        { _id: subMed._id },
        { $inc: { Quantity: qty } }
      );

      receiverBalanceAfter = subMed.Quantity + qty;
    } else {
      subMed = await Medicine.create({
        Institute_ID,
        Medicine_Code: mainMed.Medicine_Code,
        Medicine_Name: mainMed.Medicine_Name,
        Type: mainMed.Type,
        Category: mainMed.Category,
        Quantity: qty,
        Threshold_Qty: mainMed.Threshold_Qty,
        Expiry_Date: mainMed.Expiry_Date
      });

      receiverBalanceAfter = qty;
    }

    // 📒 Ledger — MAIN STORE OUT
    await InstituteLedger.create({
      Institute_ID: mainMed.Institute_ID,
      Transaction_Type: "SUBSTORE_ADD",
      Reference_ID: null,
      Medicine_ID: mainMed._id,
      Medicine_Model: "MainStoreMedicine",
      Medicine_Name: mainMed.Medicine_Name,
      Expiry_Date: mainMed.Expiry_Date,
      Direction: "OUT",
      Quantity: qty,
      Balance_After: senderBalanceAfter
    });

    // 📒 Ledger — SUBSTORE IN
    await InstituteLedger.create({
      Institute_ID,
      Transaction_Type: "SUBSTORE_ADD",
      Reference_ID: null,
      Medicine_ID: subMed._id,
      Medicine_Model: "Medicine",
      Medicine_Name: subMed.Medicine_Name,
      Expiry_Date: subMed.Expiry_Date,
      Direction: "IN",
      Quantity: qty,
      Balance_After: receiverBalanceAfter
    });

    res.json({
      message: "Main Store → Substore transfer successful"
    });

  } catch (err) {
    console.error("SUBSTORE TRANSFER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});


module.exports = mainStoreApp