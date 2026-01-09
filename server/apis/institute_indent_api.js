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
   GENERATE INDENT DATA (SALES + BUFFER LOGIC)
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

    /* ---------- INVENTORY ---------- */
    const inventoryMap = new Map(
      (institute.Medicine_Inventory || []).map(i => [
        String(i.Medicine_ID),
        i.Quantity
      ])
    );

    /* ---------- SALES ---------- */
    const salesMap = new Map();
    (institute.Medicine_Issues || []).forEach(i => {
      const key = String(i.Medicine_ID);
      salesMap.set(key, (salesMap.get(key) || 0) + i.Quantity);
    });

    const items = medicines.map(med => {
      const stockOnHand = inventoryMap.get(String(med._id)) || 0;
      const totalSales = salesMap.get(String(med._id)) || 0;

      const bufferQty = Math.max(
        Math.ceil(totalSales * 0.10),
        10 // ✅ minimum buffer
      );

      const requiredQty = Math.max(bufferQty - stockOnHand, 0);

      return {
        Medicine_Name: med.Medicine_Name,
        Type: med.Type,
        Category: med.Category,
        Stock_On_Hand: stockOnHand,
        Required_Quantity: requiredQty,
        Remarks: requiredQty > 0 ? "Below buffer stock" : ""
      };
    });

    res.json({
      Institute_Name: institute.Institute_Name,
      Institute_Address: `${institute.Address.Street}, ${institute.Address.District}, ${institute.Address.State} - ${institute.Address.Pincode}`,
      Date: new Date(),
      Items: items
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate indent" });
  }
});

module.exports = indentApp;