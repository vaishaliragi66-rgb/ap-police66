const express = require("express");
const router = express.Router();
const DailyVisit = require("../models/daily_visit");
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
// REGISTER VISIT

const mongoose = require("mongoose");

// REGISTER VISIT
router.post("/register",verifyToken,allowInstituteRoles("front_desk"), async (req, res) => {
  try {
    const {
      Institute_ID,
      employee_id,
      abs_no,
      IsFamilyMember,
      FamilyMember,
      name,
      symptoms,
      Vitals
    } = req.body;

    if (!Institute_ID || !employee_id || !abs_no || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const currentYear = today.getFullYear();
    const instituteObjectId = new mongoose.Types.ObjectId(Institute_ID);

    // Find last token for today (using date range)
    const lastTokenVisit = await DailyVisit.findOne({
      Institute_ID: instituteObjectId,
      visit_date: { $gte: today, $lt: tomorrow }
    }).sort({ token_no: -1 });

    const token_no = lastTokenVisit ? lastTokenVisit.token_no + 1 : 1;

    // OP number logic unchanged
    const lastOPVisit = await DailyVisit.findOne({
      Institute_ID: instituteObjectId,
      $expr: {
        $eq: [{ $year: "$visit_date" }, currentYear]
      }
    }).sort({ OP_No: -1 });

    let OP_No = 1;
    if (lastOPVisit) {
      OP_No = lastOPVisit.OP_No + 1;
    }

    // Create visit
    const visit = await DailyVisit.create({
      Institute_ID:instituteObjectId,
      employee_id,
      IsFamilyMember: IsFamilyMember || false,
      FamilyMember: IsFamilyMember ? FamilyMember : null,
      abs_no,
      name,
      OP_No,
      symptoms: symptoms || "",
      Vitals: {
        Temperature: Vitals?.Temperature || null,
        Sugar: Vitals?.Sugar || null,
        Blood_Pressure: Vitals?.Blood_Pressure || null,
        Oxygen: Vitals?.Oxygen || null,
        Pulse: Vitals?.Pulse || null,
        GRBS: Vitals?.GRBS || null
      },
      token_no,
      visit_date: today
    });

    res.status(201).json({
      message: "Visit registered successfully",
      visit
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET TODAY VISITS BY INSTITUTE
router.get("/today/:Institute_ID", async (req, res) => {
  try {
    const { Institute_ID } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Find visits where visit_date is >= today and < tomorrow
    const visits = await DailyVisit.find({
      Institute_ID,
      visit_date: { $gte: today, $lt: tomorrow }
    })
      .populate("employee_id")
      .populate("FamilyMember");

    res.json(visits);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/next-numbers/:Institute_ID", async (req, res) => {
  try {
    const { Institute_ID } = req.params;
    const instituteObjectId = new mongoose.Types.ObjectId(Institute_ID);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    /* ===== TOKEN (PER DAY, PER INSTITUTE) ===== */
    const lastTokenVisit = await DailyVisit.findOne({
      Institute_ID: instituteObjectId,
      visit_date: today
    }).sort({ token_no: -1 });

    const nextToken = lastTokenVisit ? lastTokenVisit.token_no + 1 : 1;

    /* ===== OP (PER YEAR, PER INSTITUTE) ===== */
    const lastOPVisit = await DailyVisit.findOne({
      Institute_ID: instituteObjectId,
      $expr: {
        $eq: [{ $year: "$visit_date" }, currentYear]
      }
    }).sort({ OP_No: -1 });

    const nextOP = lastOPVisit ? lastOPVisit.OP_No + 1 : 1;

    res.json({
      nextToken,
      nextOP
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;


// GET TODAY VISITS BY INSTITUTE
router.get("/today/:Institute_ID", async (req, res) => {
  try {
    const { Institute_ID } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visits = await DailyVisit.find({
      Institute_ID,
      visit_date: today
    }).populate("employee_id")
    .populate("FamilyMember");

    res.json(visits);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/next-numbers/:Institute_ID", async (req, res) => {
  try {
    const { Institute_ID } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    /* ===== TOKEN ===== */
    const lastTokenVisit = await DailyVisit.findOne({
      Institute_ID,
      visit_date: today
    }).sort({ token_no: -1 });

    const nextToken = lastTokenVisit ? lastTokenVisit.token_no + 1 : 1;

    /* ===== OP ===== */
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const lastOPVisit = await DailyVisit.findOne({
      visit_date: { $gte: startOfYear, $lte: endOfYear }
    }).sort({ OP_No: -1 });
    
    let nextOP = 1;
    
    if (lastOPVisit && typeof lastOPVisit.OP_No === "number") {
      nextOP = lastOPVisit.OP_No + 1;
    }

    res.json({
      nextToken,
      nextOP
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;