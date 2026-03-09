const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const Disease = require("../models/disease");
const Prescription = require("../models/Prescription");
const DailyVisit = require("../models/daily_visit");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");

router.get("/health-summary", async (req, res) => {
  try {
    const { type, date, year, month, instituteId, startYear, startMonth, endYear, endMonth } = req.query;

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

    if (type === "monthly" && !((year && month) || (startYear && startMonth && endYear && endMonth))) {
      return res.status(400).json({ message: "Provide either year+month or startYear+startMonth+endYear+endMonth for monthly summary" });
    }

    const instituteObjectId = new mongoose.Types.ObjectId(instituteId);

    let start, end;
    let selectedYear = null;
    let selectedMonth = null;

    const pad2 = (value) => String(value).padStart(2, "0");

    // ===============================
    // 2️⃣ DATE RANGE SETUP
    // ===============================
    if (type === "daily") {
      start = new Date(`${date}T00:00:00+05:30`);
      end = new Date(`${date}T23:59:59.999+05:30`);
    } else {
      // support either single month (year+month) or a month range (startYear+startMonth to endYear+endMonth)
      if (startYear && startMonth && endYear && endMonth) {
        const sYear = Number(startYear);
        const sMonth = Number(startMonth);
        const eYear = Number(endYear);
        const eMonth = Number(endMonth);

        const sMonthStr = pad2(sMonth);
        const eMonthStr = pad2(eMonth);

        const daysInEndMonth = new Date(eYear, eMonth, 0).getDate();

        start = new Date(`${sYear}-${sMonthStr}-01T00:00:00+05:30`);
        end = new Date(`${eYear}-${eMonthStr}-${pad2(daysInEndMonth)}T23:59:59.999+05:30`);
      } else {
        selectedYear = Number(year);
        selectedMonth = Number(month);
        const monthString = pad2(selectedMonth);
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

        start = new Date(`${selectedYear}-${monthString}-01T00:00:00+05:30`);
        end = new Date(`${selectedYear}-${monthString}-${pad2(daysInMonth)}T23:59:59.999+05:30`);
      }
    }

    const normalizeGender = (value) => {
      if (!value) return "";
      const normalized = String(value).trim().toLowerCase();
      if (normalized.startsWith("m")) return "male";
      if (normalized.startsWith("f")) return "female";
      return "";
    };

    const toLocalDateKey = (dateValue) => {
      const dateObj = new Date(dateValue);
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(dateObj);

      const yyyy = parts.find((part) => part.type === "year")?.value;
      const mm = parts.find((part) => part.type === "month")?.value;
      const dd = parts.find((part) => part.type === "day")?.value;

      if (!yyyy || !mm || !dd) {
        return "";
      }

      return `${yyyy}-${mm}-${dd}`;
    };

    const calculateAge = (dob, referenceDate) => {
      if (!dob) return null;

      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) return null;

      const ref = new Date(referenceDate);
      let age = ref.getFullYear() - birthDate.getFullYear();
      const monthDelta = ref.getMonth() - birthDate.getMonth();

      if (
        monthDelta < 0 ||
        (monthDelta === 0 && ref.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age;
    };

    // ===============================
    // 3️⃣ VISITS
    // ===============================
    const visits = await DailyVisit.find({
      Institute_ID: instituteObjectId,
      visit_date: { $gte: start, $lte: end }
    }).lean();

    const totalPatients = visits.length;

    const employeeIds = visits
      .filter(v => !v.IsFamilyMember)
      .map(v => String(v.employee_id));

    const familyIds = visits
      .filter(v => v.IsFamilyMember)
      .map(v => String(v.FamilyMember));

    const employees = await Employee.find({ _id: { $in: employeeIds } }).lean();
    const familyMembers = await FamilyMember.find({ _id: { $in: familyIds } }).lean();

    const employeeMap = new Map(
      employees.map((employee) => [String(employee._id), employee])
    );

    const familyMap = new Map(
      familyMembers.map((member) => [String(member._id), member])
    );

    // ===============================
    // 4️⃣ OP CENSUS TABLE + DEMOGRAPHICS
    // ===============================
    const rowMap = new Map();

    const makeEmptyRow = (isoDate) => ({
      date: isoDate,
      male: 0,
      female: 0,
      maleChild: 0,
      femaleChild: 0,
      total: 0
    });

    const addPersonToRow = (row, person, referenceDate) => {
      if (!person) return;

      const gender = normalizeGender(person.Gender || person.Sex);
      const age = calculateAge(person.DOB, referenceDate);
      const isChild = age !== null && age <= 14;

      if (gender === "male") {
        if (isChild) row.maleChild += 1;
        else row.male += 1;
      }

      if (gender === "female") {
        if (isChild) row.femaleChild += 1;
        else row.female += 1;
      }

      row.total += 1;
    };

    if (type === "monthly") {
      // create rows for every day in the selected range (start..end)
      for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const key = toLocalDateKey(cursor);
        if (key) rowMap.set(key, makeEmptyRow(key));
      }
    }

    visits.forEach((visit) => {
      const visitDate = new Date(visit.visit_date);
      const key = toLocalDateKey(visitDate);

      if (!rowMap.has(key)) {
        rowMap.set(key, makeEmptyRow(key));
      }

      const row = rowMap.get(key);

      if (visit.IsFamilyMember) {
        const family = familyMap.get(String(visit.FamilyMember));
        addPersonToRow(row, family, visitDate);
      } else {
        const employee = employeeMap.get(String(visit.employee_id));
        addPersonToRow(row, employee, visitDate);
      }
    });

    const censusRows = Array.from(rowMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const totals = censusRows.reduce(
      (acc, row) => {
        acc.male += row.male;
        acc.female += row.female;
        acc.maleChild += row.maleChild;
        acc.femaleChild += row.femaleChild;
        acc.total += row.total;
        return acc;
      },
      { male: 0, female: 0, maleChild: 0, femaleChild: 0, total: 0 }
    );

    const demographics = {
      totalPatients: totals.total,
      male: totals.male,
      female: totals.female,
      children: totals.maleChild + totals.femaleChild,
      maleChildren: totals.maleChild,
      femaleChildren: totals.femaleChild
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
      censusRows,
      totals,
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