const express = require("express");
const router = express.Router();
const DailyVisit = require("../models/daily_visit");

// REGISTER A VISIT (HELP DESK)
router.post("/register", async (req, res) => {
  try {
    const { employee_id } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastVisit = await DailyVisit.findOne({ visit_date: today })
      .sort({ token_no: -1 });

    const token_no = lastVisit ? lastVisit.token_no + 1 : 1;

    const visit = await DailyVisit.create({
      employee_id,
      token_no
    });

    res.status(201).json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET TODAY'S VISITS (FOR DROPDOWNS)
router.get("/today", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visits = await DailyVisit.find({ visit_date: today })
      .populate("employee_id");

    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
