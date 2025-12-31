const express = require("express");
const mongoose = require("mongoose");
const ledgerApp = express.Router();

const InstituteLedger = require("../models/InstituteLedger");

// ------------------------------------------------------------------
// GET LEDGER FOR AN INSTITUTE
// ------------------------------------------------------------------
// GET /ledger-api/institute/:instituteId
// Optional query params:
//   ?from=YYYY-MM-DD
//   ?to=YYYY-MM-DD
//   ?type=ORDER_DELIVERY | PRESCRIPTION_ISSUE
// ------------------------------------------------------------------

ledgerApp.get("/institute/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;
    const { from, to, type } = req.query;

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: "Invalid Institute ID" });
    }

    const filter = { Institute_ID: instituteId };

    if (type) {
      filter.Transaction_Type = type;
    }

    if (from || to) {
      filter.Timestamp = {};
      if (from) filter.Timestamp.$gte = new Date(from);
      if (to) filter.Timestamp.$lte = new Date(to);
    }

    const ledger = await InstituteLedger.find(filter)
      .populate("Medicine_ID", "Medicine_Name Threshold_Qty")
      .sort({ Timestamp: -1 })
      .lean();

    res.status(200).json({
      count: ledger.length,
      ledger
    });
  } catch (err) {
    console.error("Ledger fetch error:", err);
    res.status(500).json({
      message: "Failed to fetch institute ledger",
      error: err.message
    });
  }
});

module.exports = ledgerApp;
