const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const FamilyMember = require("../models/family_member");
const Employee = require("../models/employee");

const familyApp = express.Router();

familyApp.post(
  "/register",
  expressAsyncHandler(async (req, res) => {
    const { Name, Relationship, DOB, Medical_History, EmployeeId } = req.body;

    if (!Name || !Relationship || !EmployeeId) {
      return res
        .status(400)
        .json({ message: "Name, Relationship, and EmployeeId required" });
    }
    const employee = await Employee.findById(EmployeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // SAFE AUTO-INCREMENT
    const lastMember = await FamilyMember.findOne().sort({ Family_ID: -1 });

    const lastID = lastMember?.Family_ID;
    const newID =
      typeof lastID === "number" && !isNaN(lastID) ? lastID + 1 : 1;

    console.log("Generated Family_ID:", newID);

    const member = new FamilyMember({
      Family_ID: newID,
      Employee: EmployeeId,
      Name,
      Relationship,
      DOB,
      Medical_History
    });

    const saved = await member.save();

    employee.FamilyMembers.push(saved._id);
    await employee.save();

    res.status(201).json({
      message: "Family member registered",
      payload: saved
    });
  })
);

module.exports = familyApp;
