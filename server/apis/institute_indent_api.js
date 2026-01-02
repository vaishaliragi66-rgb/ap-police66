const express = require("express");
const mongoose = require("mongoose");
const indentApp = express.Router();

const Institute = require("../models/master_institute");
const Manufacturer = require("../models/master_manufacture");
const Medicine = require("../models/master_medicine");

/* ---------------------------------------------
   GET ALL MANUFACTURERS
--------------------------------------------- */
indentApp.get("/manufacturers", async (req, res) => {
  try {
    const manufacturers = await Manufacturer.find({}, "Manufacturer_Name");
    res.json(manufacturers);
  } catch (err) {
    res.status(500).json({ message: "Failed to load manufacturers" });
  }
});

/* ---------------------------------------------
   GENERATE INDENT DATA (✅ CORRECT LOGIC)
--------------------------------------------- */
indentApp.get("/generate/:manufacturerId", async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    const { instituteId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: "Invalid institute ID" });
    }

    const institute = await Institute.findById(instituteId);
    if (!institute) {
      return res.status(404).json({ message: "Institute not found" });
    }

    const medicines = await Medicine.find({
      Manufacturer_ID: manufacturerId
    });

    const inventoryMap = new Map(
      (institute.Medicine_Inventory || []).map((item) => [
        String(item.Medicine_ID),
        item.Quantity
      ])
    );

    const items = medicines.map((med) => {
      const instituteStock = inventoryMap.get(String(med._id)) || 0;

      const requiredQty = Math.max(
        (med.Threshold_Qty || 0) - instituteStock,
        0
      );

      return {
        Medicine_ID: med._id,
        Medicine_Code: med.Medicine_Code,
        Medicine_Name: med.Medicine_Name,
        Stock_On_Hand: instituteStock,        // ✅ FIXED
        Required_Quantity: requiredQty,
        Remarks: requiredQty > 0 ? "Below threshold" : ""
      };
    });

    res.json({
      Institute_Name: institute.Institute_Name,
      Institute_Address: `${institute.Address.Street}, ${institute.Address.District}, ${institute.Address.State} - ${institute.Address.Pincode}`,
      Date: new Date(),
      Items: items
    });
  } catch (err) {
    console.error("Indent generation failed:", err);
    res.status(500).json({ message: "Failed to generate indent" });
  }
});

module.exports = indentApp;