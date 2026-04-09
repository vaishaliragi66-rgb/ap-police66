const express = require("express");
const mongoose = require("mongoose");
const diseaseApp = express.Router();
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const Disease = require("../models/disease");

// =======================================================
// GET ALL DISEASES FOR AN EMPLOYEE (SELF + FAMILY)
// =======================================================
diseaseApp.get("/employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { fromDate, toDate } = req.query;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const baseQuery = {
      Employee_ID: new mongoose.Types.ObjectId(employeeId),
      $or: [
        { Category: "Non-Communicable" },
        {
          Category: "Communicable",
          createdAt: { $gte: twoMonthsAgo }
        }
      ]
    };

    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate) { const s = new Date(fromDate); s.setHours(0,0,0,0); dateFilter.$gte = s; }
      if (toDate) { const e = new Date(toDate); e.setHours(23,59,59,999); dateFilter.$lte = e; }
      baseQuery.createdAt = dateFilter;
    }

    const diseases = await Disease.find(baseQuery)
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



diseaseApp.post("/diseases",verifyToken,
  allowInstituteRoles("doctor"), async (req, res) => {
  try {
    const {
      Institute_ID,
      Employee_ID,
      IsFamilyMember,
      FamilyMember_ID,
      Disease_Name,
      Category,
      Severity_Level,
      Notes
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(Employee_ID)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const newDisease = await Disease.create({
      Institute_ID: new mongoose.Types.ObjectId(Institute_ID),
      Employee_ID: new mongoose.Types.ObjectId(Employee_ID),
      IsFamilyMember,
      FamilyMember_ID: IsFamilyMember && FamilyMember_ID
        ? new mongoose.Types.ObjectId(FamilyMember_ID)
        : null,
      Disease_Name,
      Category,
      Severity_Level,
      Notes
    });

    await Employee.findByIdAndUpdate(
      new mongoose.Types.ObjectId(Employee_ID),
      {
        $push: {
          Medical_History: {
            Date: new Date(),
            Diseases: [newDisease._id],
            Diagnosis: Disease_Name,
            Medicines: [],
            Notes: Notes || ""
          }
        }
      }
    );

    res.status(201).json({
      message: "Disease added and linked to medical history",
      disease: newDisease
    });

  } catch (err) {
    console.error("Disease creation error:", err);
    res.status(500).json({
      message: "Failed to add disease",
      error: err.message
    });
  }
});



module.exports = diseaseApp;
