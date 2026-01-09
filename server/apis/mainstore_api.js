const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

const mainStoreApp = express.Router();
const MainStoreMedicine = require("../models/main_store");
const Institute = require("../models/master_institute");
const Medicine = require("../models/master_medicine");
mainStoreApp.post("/add", expressAsyncHandler(async (req, res) => {
  try {
    const {
      Medicine_Code,
      Medicine_Name,
      Type,
      Category,
      Quantity,
      Threshold_Qty,
      Issued_By,
      Expiry_Date
    } = req.body;

    const required = [
      "Medicine_Code","Medicine_Name","Quantity",
      "Threshold_Qty","Issued_By","Expiry_Date"
    ];

    const missing = required.filter(f => !req.body[f]);
    if (missing.length)
      return res.status(400).json({ message:`Missing fields: ${missing.join(", ")}`});

    const expiry = new Date(Expiry_Date);
    const today = new Date(); today.setHours(0,0,0,0);

    if (expiry <= today)
      return res.status(400).json({ message:"Expiry date must be in future" });

    const exists = await MainStoreMedicine.findOne({ Medicine_Code });

    if (exists)
      return res.status(400).json({ message:`Medicine code already exists` });

    const med = await MainStoreMedicine.create({
      Medicine_Code,
      Medicine_Name,
      Type,
      Category,
      Quantity:Number(Quantity),
      Threshold_Qty:Number(Threshold_Qty),
      Issued_By,
      Expiry_Date:expiry
    });

    res.status(201).json({ message:"Medicine added", medicine:med });

  } catch (err) {
    res.status(500).json({ message:"Failed to add medicine", error:err.message });
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
    const { Medicine_ID, Transfer_Qty, Institute_ID } = req.body;
    console.log(req.body);
    const qty = Number(Transfer_Qty);

    const med = await MainStoreMedicine.findById(Medicine_ID);
    if (!med) return res.status(404).json({ message: "Medicine not found" });

    if (med.Quantity < qty)
      return res.status(400).json({ message: "Insufficient stock" });

    const institute = await Institute.findById(Institute_ID);
    if (!institute)
      return res.status(404).json({ message: "Institute not found" });

    // deduct stock from main store
    med.Quantity -= qty;
    await med.save();

    // check if already exists in institute inventory
    const existingMed = institute.Medicine_Inventory.find(
      m => m.Medicine_ID.toString() === Medicine_ID
    );

    if (existingMed) {
      existingMed.Quantity += qty;
    } else {
      institute.Medicine_Inventory.push({
        Medicine_ID,
        Quantity: qty
      });
    }

    await institute.save();

    res.json({
      message: "Transferred to institute successfully",
      remaining_stock: med.Quantity
    });

  } catch (err) {
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
    const { Medicine_ID, Transfer_Qty } = req.body;

    const qty = Number(Transfer_Qty);

    // Get medicine from main store
    const med = await MainStoreMedicine.findById(Medicine_ID);
    if (!med)
      return res.status(404).json({ message: "Medicine not found in Main Store" });

    // Validate stock
    if (med.Quantity < qty)
      return res.status(400).json({ message: "Insufficient stock in Main Store" });

    // Deduct stock from main store
    med.Quantity -= qty;
    await med.save();

    // Check if medicine already exists in sub-store
    let subStoreMed = await Medicine.findOne({
      Medicine_Code: med.Medicine_Code
    });

    if (subStoreMed) {
      // Increase quantity
      subStoreMed.Quantity += qty;
      await subStoreMed.save();
    } 
    else {
      // Create new entry in Sub-Store
      subStoreMed = new Medicine({
        Medicine_Code: med.Medicine_Code,
        Medicine_Name: med.Medicine_Name,
        Type: med.Type,
        Category: med.Category,
        Quantity: qty,
        Threshold_Qty: med.Threshold_Qty,
        Expiry_Date: med.Expiry_Date
      });

      await subStoreMed.save();
    }

    res.json({
      message: "Transferred to Sub-Store successfully",
      transferred_qty: qty,
      remaining_mainstore_stock: med.Quantity,
      substore_stock: subStoreMed.Quantity
    });

  } catch (err) {
    console.error("Sub-Store transfer error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = mainStoreApp