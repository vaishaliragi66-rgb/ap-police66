const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const FamilyMember = require("../models/family_member");
const Employee = require("../models/employee");

const FamilyApp = express.Router();


// Register Family Member
FamilyApp.post(
  "/register",
  expressAsyncHandler(async (req, res) => {
    const {
      Name,
      Gender,
      Relationship,
      DOB,
      Blood_Group,
      Height,
      Weight,
      Phone_No,
      Address,
      Medical_History,
      EmployeeId
    } = req.body;

    if (!Name || !Gender || !Relationship || !EmployeeId) {
      return res.status(400).json({
        message: "Name, Gender, Relationship, and EmployeeId are required",
      });
    }

    // Check Employee Exists
    const employee = await Employee.findById(EmployeeId);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    // Create Family Member
    const member = new FamilyMember({
      Employee: EmployeeId,
      Name,
      Gender,
      Relationship,
      DOB,
      Blood_Group,
      Height,
      Weight,
      Phone_No,
      Address,
      Medical_History,
    });

    const saved = await member.save();

    // Push to Employee
    employee.FamilyMembers.push(saved._id);
    await employee.save();

    res
      .status(201)
      .json({ message: "Family member registered", payload: saved });
  })
);

// Fetch Family Members by Employee
FamilyApp.get("/family/:employeeId", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId)
      .populate("FamilyMembers");

    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    res.json(employee.FamilyMembers || []);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});
FamilyApp.get(
  "/family-report/:id",
  expressAsyncHandler(async (req, res) => {
    const fam = await FamilyMember.findById(req.params.id).populate({
      path: "Medical_History.Disease",
      select: "Disease_Name Category Severity_Level",
    });

    if (!fam)
      return res.status(404).json({ message: "Family member not found" });

    res.json(fam);
  })
);
module.exports = FamilyApp;