const express = require("express");
const mongoose = require("mongoose");
const expressAsyncHandler = require("express-async-handler");
const FamilyMember = require("../models/family_member");
const Employee = require("../models/employee");

const FamilyApp = express.Router();

// REGISTER FAMILY MEMBER
FamilyApp.post(
  "/register",
  expressAsyncHandler(async (req, res) => {
    try {
      const { Name, Gender, Relationship, DOB, Medical_History, EmployeeId } = req.body;

      if (!Name || !Gender || !Relationship || !EmployeeId) {
        return res.status(400).json({
          message: "Name, Gender, Relationship and EmployeeId are required"
        });
      }

      // Validate EmployeeId format
      if (!mongoose.Types.ObjectId.isValid(EmployeeId)) {
        return res.status(400).json({ message: "Invalid Employee ID format" });
      }

      const employee = await Employee.findById(EmployeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Check if family member already exists
      const existingMember = await FamilyMember.findOne({
        Employee: EmployeeId,
        Name,
        Relationship
      });

      if (existingMember) {
        return res.status(400).json({
          message: `${Name} is already registered as ${Relationship} for this employee`
        });
      }

      const member = await FamilyMember.create({
        Employee: EmployeeId,
        Name,
        Gender,
        Relationship,
        DOB: DOB || null,
        Medical_History: Array.isArray(Medical_History) ? Medical_History : []
      });

      // Initialize FamilyMembers array if it doesn't exist
      if (!employee.FamilyMembers) {
        employee.FamilyMembers = [];
      }
      
      // Add the new family member's ID to the employee's FamilyMembers array
      employee.FamilyMembers.push(member._id);
      await employee.save();

      res.status(201).json({
        message: "Family member registered successfully",
        payload: member
      });

    } catch (err) {
      console.error("Family register error:", err);
      
      // Handle duplicate key error specifically
      if (err.code === 11000) {
        return res.status(400).json({
          message: "Duplicate family member detected. This family member may already be registered.",
          error: "Duplicate entry"
        });
      }
      
      // Handle validation errors
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
          message: "Validation failed",
          errors: errors
        });
      }
      
      res.status(500).json({
        message: "Failed to register family member",
        error: err.message
      });
    }
  })
);

// GET FAMILY MEMBERS BY EMPLOYEE ID
FamilyApp.get("/family/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID format" });
    }

    const employee = await Employee
      .findById(employeeId)
      .populate("FamilyMembers");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee.FamilyMembers || []);
  } catch (err) {
    console.error("Fetch family error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET SPECIFIC FAMILY MEMBER BY ID
FamilyApp.get("/:id", async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: "Family member not found" });
    }
    res.json(member);
  } catch (err) {
    console.error("Fetch family member error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// UPDATE FAMILY MEMBER
FamilyApp.put("/:id", async (req, res) => {
  try {
    const updatedMember = await FamilyMember.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedMember) {
      return res.status(404).json({ message: "Family member not found" });
    }
    
    res.json({
      message: "Family member updated successfully",
      payload: updatedMember
    });
  } catch (err) {
    console.error("Update family member error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE FAMILY MEMBER
FamilyApp.delete("/:id", async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ message: "Family member not found" });
    }
    
    // Remove from employee's FamilyMembers array
    await Employee.findByIdAndUpdate(
      member.Employee,
      { $pull: { FamilyMembers: req.params.id } }
    );
    
    // Delete the family member
    await FamilyMember.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Family member deleted successfully" });
  } catch (err) {
    console.error("Delete family member error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = FamilyApp;