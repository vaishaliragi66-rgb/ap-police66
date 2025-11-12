// server/apis/family_member_api.js
const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const FamilyMember = require("../models/family_member");
const Employee = require("../models/employee");

const FamilyApp = express.Router();

// ✅ Register a new family member
FamilyApp.post(
  "/register",
  expressAsyncHandler(async (req, res) => {
    const { Name, Gender, Relationship, DOB, Medical_History, EmployeeId } = req.body;

    if (!Name || !Gender || !Relationship || !EmployeeId) {
      return res.status(400).json({ message: "Name, Gender, Relationship, and EmployeeId required" });
    }

    const employee = await Employee.findById(EmployeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const member = new FamilyMember({
      Employee: EmployeeId,
      Name,
      Gender,
      Relationship,
      DOB,
      Medical_History
    });

    const saved = await member.save();

    employee.FamilyMembers.push(saved._id);
    await employee.save();

    res.status(201).json({ message: "Family member registered", payload: saved });
  })
);

// ✅ Fetch all family members for a given employee
FamilyApp.get("/family/:employeeId", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId).populate("FamilyMembers");
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee.FamilyMembers || []);
  } catch (err) {
    console.error("Error fetching family members:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = FamilyApp;
