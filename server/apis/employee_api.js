const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const employeeApp = express.Router();
const Employee = require("../models/employee"); // adjust path if needed

// ==========================================
//  GET all employees
// ==========================================
// employeeApp (routes)
employeeApp.get("/employees", expressAsyncHandler(async (req, res) => {
  // return only necessary fields
  const employees = await Employee.find({}, "_id ABS_NO Name");
  res.status(200).json(employees);
}));

// ==========================================
//  POST - Register New Employee
// ==========================================
employeeApp.post(
  "/register",
  expressAsyncHandler(async (req, res) => {
    const empData = req.body;
    console.log("Received Employee Registration Data:", empData);

    // ✅ Validate required fields
    if (!empData.ABS_NO || !empData.Name || !empData.Email || !empData.Password) {
      return res.status(400).json({ message: "ABS_NO, Name, Email, and Password are required" });
    }

    // ✅ Check if email already exists
    const existing = await Employee.findOne({ Email: empData.Email.trim() });
    if (existing) {
      return res.status(409).json({ message: "Employee already registered with this email" });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(empData.Password, 10);

    // ✅ Create and save employee
    const newEmployee = new Employee({
      ABS_NO: empData.ABS_NO,
      Name: empData.Name,
      Email: empData.Email,
      Password: hashedPassword,
      Designation: empData.Designation || "",
      Address: empData.Address || {},
      Blood_Group: empData.Blood_Group || "",
      Medical_History: empData.Medical_History || {},
    });

    const savedEmp = await newEmployee.save();
    res.status(201).json({ message: "Employee Registered Successfully", payload: savedEmp });
  })
);

// ==========================================
//  POST - Employee Login
// ==========================================
// ==========================================
//  POST - Employee Login (by ABS_NO instead of Email)
// ==========================================
employeeApp.post(
  "/login",
  expressAsyncHandler(async (req, res) => {
    const { ABS_NO, Password } = req.body;

    if (!ABS_NO || !Password)
      return res.status(400).json({ message: "ABS Number and Password required" });

    const employee = await Employee.findOne({ ABS_NO: ABS_NO.trim() });
    if (!employee)
      return res.status(401).json({ message: "Invalid ABS Number or password" });

    const isMatch = await bcrypt.compare(Password, employee.Password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid ABS Number or password" });

    const token = jwt.sign({ id: employee._id }, "empsecret123", { expiresIn: "1h" });

    res.status(200).json({
      message: "Login successful",
      payload: {
        token,
        id: employee._id,
        Name: employee.Name,
        Designation: employee.Designation,
        ABS_NO: employee.ABS_NO,
      },
    });
  })
);


// ==========================================
//  GET - Employee Profile
// ==========================================
employeeApp.get(
  "/profile/:id",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid Employee ID" });

    const emp = await Employee.findById(id);
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.status(200).json(emp);
  })
);

// ==========================================
//  PUT - Update Employee Profile
// ==========================================
employeeApp.put(
  "/profile/:id",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const allowed = ["Name", "Designation", "Email", "Address", "Blood_Group", "Medical_History"];
    const update = {};

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });

    if (Object.keys(update).length === 0)
      return res.status(400).json({ message: "No valid fields to update" });

    const emp = await Employee.findByIdAndUpdate(id, update, { new: true });
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.status(200).json({ message: "Profile updated successfully", profile: emp });
  })
);

// ==========================================
//  DELETE - Remove Employee
// ==========================================
employeeApp.delete(
  "/delete/:id",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid Employee ID" });

    const emp = await Employee.findByIdAndDelete(id);
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.status(200).json({ message: "Employee deleted successfully" });
  })
);



module.exports = employeeApp;