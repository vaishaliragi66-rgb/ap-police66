const express = require("express");
const mongoose = require("mongoose");
const medicineApp = express.Router();

const Medicine = require("../models/master_medicine");

//* ================= GET SUB-STORE MEDICINES FOR ONE INSTITUTE ================= */
medicineApp.get("/substore/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: "Invalid institute ID" });
    }

    const instituteObjectId = new mongoose.Types.ObjectId(instituteId);

    // ✅ ONLY this institute's sub-store medicines
    const medicines = await Medicine.find({
      Institute_ID: instituteObjectId
    }).sort({ Expiry_Date: 1 });

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const medicinesWithStatus = medicines.map(med => {
      const m = med.toObject();

      const daysUntilExpiry = Math.ceil(
        (new Date(m.Expiry_Date) - today) / (1000 * 60 * 60 * 24)
      );

      if (m.Expiry_Date < today) {
        m.expiryStatus = "expired";
      } else if (m.Expiry_Date <= thirtyDaysFromNow) {
        m.expiryStatus = "expiring-soon";
      } else {
        m.expiryStatus = "valid";
      }

      m.daysUntilExpiry = daysUntilExpiry;
      return m;
    });

    res.json(medicinesWithStatus);

  } catch (err) {
    console.error("Sub-store fetch error:", err);
    res.status(500).json({
      message: "Failed to fetch sub-store medicines",
      error: err.message
    });
  }
});

/* ================= GET SINGLE MEDICINE ================= */
medicineApp.get("/medicine/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid medicine ID" });
    }

    const med = await Medicine.findById(req.params.id);
    if (!med) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    res.json(med);

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch medicine",
      error: err.message
    });
  }
});

/* ================= UPDATE MEDICINE STOCK (SYSTEM USE) =================
   NOTE:
   - This is used internally (main store transfer / pharmacy issue)
   - NOT exposed to UI directly
====================================================================== */
medicineApp.put("/medicine_update/:id", async (req, res) => {
  try {
    const updates = {};

    if (req.body.Quantity !== undefined) {
      updates.Quantity = Number(req.body.Quantity);
    }

    if (req.body.Expiry_Date) {
      const exp = new Date(req.body.Expiry_Date);
      if (exp <= new Date()) {
        return res.status(400).json({ message: "Expiry must be future" });
      }
      updates.Expiry_Date = exp;
    }

    const med = await Medicine.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!med) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    res.json({
      message: "Medicine updated",
      medicine: med
    });

  } catch (err) {
    res.status(500).json({
      message: "Update failed",
      error: err.message
    });
  }
});

module.exports = medicineApp;
