const express = require("express");
const mongoose = require("mongoose");
const indentApp = express.Router();

const Institute = require("../models/master_institute");
const Medicine = require("../models/master_medicine");

/* ---------------------------------------------
   GENERATE INDENT DATA (SALES + BUFFER LOGIC)
--------------------------------------------- */
indentApp.get("/generate", async (req, res) => {
  try {
    const { instituteId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: "Invalid institute ID" });
    }

    const institute = await Institute.findById(instituteId);
    if (!institute) {
      return res.status(404).json({ message: "Institute not found" });
    }
    const medicines = await Medicine.find({});

    /* ---------- INVENTORY ---------- */
    const inventoryMap = new Map(
      (institute.Medicine_Inventory || []).map(i => [
        String(i.Medicine_ID),
        i.Quantity
      ])
    );

    const items = medicines.map(med => {
      const stockOnHand = inventoryMap.get(String(med._id)) || 0;
      const bufferQty = Math.max(
        med.Threshold_Qty || 10,
        10
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