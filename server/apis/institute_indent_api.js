const express = require("express");
const mongoose = require("mongoose");
const indentApp = express.Router();

const Institute = require("../models/master_institute");
const Medicine = require("../models/master_medicine");
const Prescription = require("../models/Prescription"); // IMPORTANT

/* ------------------------------------------------
   GENERATE INDENT (BASED ON 1 YEAR CONSUMPTION)
------------------------------------------------ */

indentApp.get("/generate", async (req, res) => {
  try {

    const { instituteId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: "Invalid institute ID" });
    }

    /* ---------------------------------------------
       GET INSTITUTE
    --------------------------------------------- */

    const institute = await Institute.findById(instituteId);

    if (!institute) {
      return res.status(404).json({ message: "Institute not found" });
    }

    /* ---------------------------------------------
       GET ALL MEDICINES OF THIS INSTITUTE
    --------------------------------------------- */

    const medicines = await Medicine.find({
      Institute_ID: instituteId
    });

    /* ---------------------------------------------
       CALCULATE 1 YEAR CONSUMPTION
    --------------------------------------------- */

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const consumption = await Prescription.aggregate([
      {
        $match: {
          Institute: new mongoose.Types.ObjectId(instituteId),
          Timestamp: { $gte: oneYearAgo }
        }
      },
      { $unwind: "$Medicines" },
      {
        $group: {
          _id: "$Medicines.Medicine_ID",
          totalUsed: { $sum: "$Medicines.Quantity" }
        }
      }
    ]);

    /* ---------------------------------------------
       CREATE MAP FOR FAST LOOKUP
    --------------------------------------------- */

    const consumptionMap = new Map(
      consumption.map(c => [
        String(c._id),
        c.totalUsed
      ])
    );

    /* ---------------------------------------------
       GENERATE INDENT ITEMS
    --------------------------------------------- */
console.log("Consumption data:", consumption);
    const items = medicines.map(med => {

      const stockOnHand = med.Quantity || 0;

      const yearlyConsumption =
        consumptionMap.get(String(med._id)) || 0;

      const requiredQty = Math.max(
        Math.ceil((yearlyConsumption * 1.1) - stockOnHand),
        0
      );

      return {
        Medicine_Code: med.Medicine_Code,
        Medicine_Name: med.Medicine_Name,
        Type: med.Type,
        Category: med.Category,
        Stock_On_Hand: stockOnHand,
        Yearly_Consumption: yearlyConsumption,
        Required_Quantity: requiredQty,
        Remarks:
          requiredQty > 0
            ? "Indent Required"
            : "Sufficient stock"
      };
    });

    /* ---------------------------------------------
       RESPONSE
    --------------------------------------------- */

    res.json({
      Institute_Name: institute.Institute_Name,
      Institute_Address: `${institute.Address.Street}, ${institute.Address.District}, ${institute.Address.State} - ${institute.Address.Pincode}`,
      Date: new Date(),
      Items: items
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to generate indent"
    });
  }
});

module.exports = indentApp;