const express = require("express");
const mongoose = require("mongoose");
const ledgerApp = express.Router();

const InstituteLedger = require("../models/InstituteLedger");

// ------------------------------------------------------------------
// GET LEDGER FOR AN INSTITUTE
// ------------------------------------------------------------------
// GET /ledger-api/institute/:instituteId
//
// Optional query params:
//   ?from=YYYY-MM-DD
//   ?to=YYYY-MM-DD
//   ?type=STORE_TRANSFER | PRESCRIPTION_ISSUE
//   ?direction=IN | OUT
// ------------------------------------------------------------------

ledgerApp.get("/institute/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;
    const { from, to, type, direction } = req.query;

    // Validate Institute ID
    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: "Invalid Institute ID" });
    }

    const filter = { Institute_ID: instituteId };

    // Filter by transaction type
    if (type) {
      filter.Transaction_Type = type;
    }

    // Filter by direction (IN / OUT)
    if (direction) {
      filter.Direction = direction;
    }

    // Filter by date range
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
