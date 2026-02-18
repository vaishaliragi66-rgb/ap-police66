const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Disease = require("../models/disease");
const Prescription = require("../models/Prescription");
const DailyVisit = require("../models/daily_visit");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");

router.get("/health-summary", async (req, res) => {
  try {
    const { type, date, year, month, instituteId } = req.query;

    // ===============================
    // 1️⃣ VALIDATION
    // ===============================
    if (!type || !instituteId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: "Invalid instituteId" });
    }

    if (type === "daily" && !date) {
      return res.status(400).json({ message: "Date is required for daily summary" });
    }

    if (type === "monthly" && (!year || !month)) {
      return res.status(400).json({ message: "Year and month are required for monthly summary" });
    }

    const instituteObjectId = new mongoose.Types.ObjectId(instituteId);

    let start, end;

    // ===============================
    // 2️⃣ DATE RANGE SETUP
    // ===============================
    if (type === "daily") {
      start = new Date(date);
      start.setHours(0, 0, 0, 0);

      end = new Date(date);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0, 23, 59, 59, 999);
    }

    // ===============================
    // 3️⃣ VISITS
    // ===============================
    const visits = await DailyVisit.find({
      Institute_ID: instituteObjectId,
      visit_date: { $gte: start, $lte: end }
    });

    const totalPatients = visits.length;

    const employeeIds = visits
      .filter(v => !v.IsFamilyMember)
      .map(v => v.employee_id);

    const familyIds = visits
      .filter(v => v.IsFamilyMember)
      .map(v => v.FamilyMember);

    const employees = await Employee.find({ _id: { $in: employeeIds } });
    const familyMembers = await FamilyMember.find({ _id: { $in: familyIds } });

    // ===============================
    // 4️⃣ DEMOGRAPHICS
    // ===============================
    let male = 0, female = 0, children = 0;
    let maleChildren = 0, femaleChildren = 0;

    const today = new Date();

    const calculateAge = (dob) => {
      if (!dob) return 0;

      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();

      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age;
    };

    const processPerson = (person) => {
      const age = calculateAge(person.DOB);

      if (person.Gender === "Male") male++;
      if (person.Gender === "Female") female++;

      if (age <= 14) {
        children++;
        if (person.Gender === "Male") maleChildren++;
        if (person.Gender === "Female") femaleChildren++;
      }
    };

    employees.forEach(processPerson);
    familyMembers.forEach(processPerson);

    const demographics = {
      totalPatients,
      male,
      female,
      children,
      maleChildren,
      femaleChildren
    };

    // ===============================
    // 5️⃣ DISEASE SUMMARY
    // ===============================
    const diseaseSummaryRaw = await Disease.aggregate([
      {
        $match: {
          Institute_ID: instituteObjectId,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            name: "$Disease_Name",
            category: "$Category"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const diseaseSummary = diseaseSummaryRaw.map(d => ({
      diseaseName: d._id.name,
      category: d._id.category,
      count: d.count
    }));

    const topDisease = diseaseSummary.length > 0 ? diseaseSummary[0] : null;

    // ===============================
    // 6️⃣ CATEGORY SUMMARY
    // ===============================
    const categorySummaryRaw = await Disease.aggregate([
      {
        $match: {
          Institute_ID: instituteObjectId,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: "$Category",
          count: { $sum: 1 }
        }
      }
    ]);

    const categorySummary = categorySummaryRaw.map(c => ({
      category: c._id,
      count: c.count
    }));

    // ===============================
    // 7️⃣ MEDICINE USAGE
    // ===============================
    const medicineUsageRaw = await Prescription.aggregate([
      {
        $match: {
          Institute: instituteObjectId,
          Timestamp: { $gte: start, $lte: end }
        }
      },
      { $unwind: "$Medicines" },
      {
        $group: {
          _id: "$Medicines.Medicine_Name",
          totalQuantity: { $sum: "$Medicines.Quantity" }
        }
      },
      { $sort: { totalQuantity: -1 } }
    ]);

    const medicineUsage = medicineUsageRaw.map(m => ({
      medicineName: m._id,
      totalQuantity: m.totalQuantity
    }));

    // ===============================
    // FINAL RESPONSE
    // ===============================
    return res.json({
      demographics,
      diseaseSummary,
      categorySummary,
      medicineUsage,
      topDisease
    });

  } catch (error) {
    console.error("Health Summary Error:", error);
    return res.status(500).json({ message: "Error generating health summary" });
  }
});

module.exports = router;