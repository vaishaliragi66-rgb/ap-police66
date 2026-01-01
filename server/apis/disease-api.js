const express = require("express");
const mongoose = require("mongoose");
const diseaseApp = express.Router();

const Disease = require("../models/disease");

// =======================================================
// GET ALL DISEASES FOR AN EMPLOYEE (SELF + FAMILY)
// =======================================================
diseaseApp.get("/employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const diseases = await Disease.find({
      Employee_ID: employeeId,
      $or: [
        { Category: "Non-Communicable" },
        {
          Category: "Communicable",
          createdAt: { $gte: twoMonthsAgo }
        }
      ]
    })
      .populate("Employee_ID", "Name ABS_NO")
      .populate("FamilyMember_ID", "Name Relationship")
      .sort({ createdAt: -1 });

    res.status(200).json(diseases);
  } catch (err) {
    console.error("Disease fetch error:", err);
    res.status(500).json({
      message: "Failed to fetch diseases",
      error: err.message
    });
  }
});

module.exports = diseaseApp;
