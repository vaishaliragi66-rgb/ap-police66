const express = require("express");
const mongoose = require("mongoose");
const indentApp = express.Router();
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
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
  const medicines = await Medicine.find({ Institute_ID: instituteId });


    /* ---------- INVENTORY ---------- */
    const inventoryMap = new Map(
      (institute.Medicine_Inventory || []).map(i => [
        String(i.Medicine_ID),
        i.Quantity
      ])
    );

    // Calculate previous 1 year consumption for each medicine
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const InstituteLedger = require("../models/InstituteLedger");

    const items = await Promise.all(medicines.map(async med => {
      const stockOnHand = med.Quantity || 0;

      // Aggregate total consumption (OUT) for this medicine in the past year
      const consumptionAgg = await InstituteLedger.aggregate([
        {
          $match: {
            Institute_ID: mongoose.Types.ObjectId(instituteId),
            Medicine_ID: med._id,
            Direction: "OUT",
            Timestamp: { $gte: oneYearAgo }
          }
        },
        {
          $group: {
            _id: null,
            totalConsumption: { $sum: "$Quantity" }
          }
        }
      ]);

      const prevYearConsumption = consumptionAgg.length > 0 ? consumptionAgg[0].totalConsumption : 0;
      const bufferQty = prevYearConsumption + 0.1 * prevYearConsumption;
      const requiredQty = Math.max(Math.round(bufferQty - stockOnHand), 0);

      return {
        Medicine_Code: med.Medicine_Code,
        Medicine_Name: med.Medicine_Name,
        Type: med.Type,
        Category: med.Category,
        Stock_On_Hand: stockOnHand,
        Previous_Year_Consumption: prevYearConsumption,
        Buffer_Quantity: Math.round(bufferQty),
        Required_Quantity: requiredQty,
        Remarks: requiredQty > 0 ? "Below buffer stock" : "Sufficient stock"
      };
    }));


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