const express = require("express");
const AnalyticsApp = express.Router();

const Prescription = require("../models/Prescription");
const FamilyMember = require("../models/family_member");

AnalyticsApp.get("/prescriptions", async (req, res) => {
  try {
    const {
      date,
      month,
      year,
      manufacturerId,
      employeeId,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    // ---------- DATE FILTER (TODAY) ----------
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      query.Timestamp = { $gte: start, $lte: end };
    }

    // ---------- MONTH FILTER ----------
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);

      query.Timestamp = { $gte: start, $lte: end };
    }

    // ---------- YEAR FILTER ----------
    if (year && !month) {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);

      query.Timestamp = { $gte: start, $lte: end };
    }

    // ---------- EMPLOYEE FILTER ----------
    if (employeeId) query.Employee = employeeId;

    // fetch prescriptions
    let prescriptions = await Prescription.find(query)
      .populate("Employee", "Name ABS_NO")
      .populate("FamilyMember", "Name Relationship")
      .populate("Institute", "Institute_Name")
      .lean();

    // ---------- MANUFACTURER FILTER ----------
    if (manufacturerId) {
      prescriptions = prescriptions.filter(p =>
        p.Medicines.some(m =>
          String(m.Manufacturer_ID) === String(manufacturerId)
        )
      );
    }

    const total = prescriptions.length;

    // ---------- PAGINATION ----------
    const startIndex = (page - 1) * limit;
    const paginated = prescriptions.slice(
      startIndex,
      startIndex + Number(limit)
    );

    // ---------- SUMMARY FOR BAR GRAPH ----------
    const summary = {};

    prescriptions.forEach(p => {
      p.Medicines.forEach(m => {
        if (!summary[m.Medicine_Name]) summary[m.Medicine_Name] = 0;
        summary[m.Medicine_Name] += Number(m.Quantity || 0);
      });
    });

    const chartData = Object.entries(summary).map(
      ([name, quantity]) => ({ name, quantity })
    );

    return res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      prescriptions: paginated,
      chartData
    });

  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({
      message: "Analytics fetch failed",
      error: err.message
    });
  }
});

module.exports = AnalyticsApp;
