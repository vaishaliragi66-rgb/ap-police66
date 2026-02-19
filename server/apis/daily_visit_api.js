const express = require("express");
const router = express.Router();
const DailyVisit = require("../models/daily_visit");
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
// REGISTER VISIT
router.post("/register",verifyToken,
  allowInstituteRoles("frontdesk"), async (req, res) => {
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
    const currentYear = today.getFullYear();

    /* ================= TOKEN NUMBER (PER DAY, PER INSTITUTE) ================= */
    const lastTokenVisit = await DailyVisit.findOne({
      Institute_ID,
      visit_date: today
    }).sort({ token_no: -1 });

    const token_no = lastTokenVisit ? lastTokenVisit.token_no + 1 : 1;

    /* ================= OP NUMBER (PER YEAR GLOBAL) ================= */
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const lastOPVisit = await DailyVisit.findOne({
      visit_date: { $gte: startOfYear, $lte: endOfYear }
    }).sort({ OP_No: -1 });
    
    let OP_No = 1;
    
    if (lastOPVisit && typeof lastOPVisit.OP_No === "number") {
      OP_No = lastOPVisit.OP_No + 1;
    }

    /* ================= CREATE VISIT ================= */
    const visit = await DailyVisit.create({
      Institute_ID,
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
    });;

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