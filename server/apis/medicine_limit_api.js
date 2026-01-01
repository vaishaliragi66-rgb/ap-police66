
const express = require("express");
const router = express.Router();
const MedicineLimit = require("../models/medicine_limits");

// validate before saving prescription
router.post("/validate-medicine-quantity", async (req, res) => {
  try {
    const { medicine_name, quantity } = req.body;

    // normalize medicine name
    const limit = await MedicineLimit.findOne({
      medicine_name: new RegExp(`^${medicine_name.trim()}$`, "i"),
      is_active: true
    });

    // 🔴 IMPORTANT: if no limit configured → ALLOW
    if (!limit) {
      return res.json({
        success: true,
        allowed: true
      });
    }

    // 🔴 only fail when quantity is greater
    if (quantity > limit.max_quantity_per_patient) {
      return res.status(400).json({
        success: false,
        max_quantity: limit.max_quantity_per_patient,
        message: `Maximum allowed quantity is ${limit.max_quantity_per_patient}`
      });
    }

    // ✅ valid quantity
    return res.json({
      success: true,
      allowed: true,
      max_quantity: limit.max_quantity_per_patient
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
