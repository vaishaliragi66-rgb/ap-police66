const express = require('express');
const expressAsyncHandler = require('express-async-handler');
const mongoose = require('mongoose')
const axios = require('axios');
const instituteApp = express.Router();
const Institute = require('../models/master_institute');
const Medicine = require("../models/master_medicine");  
const Employee = require("../models/employee"); 
const InstituteLedger = require("../models/InstituteLedger");
const MainStoreMedicine = require("../models/main_store");

instituteApp.get("/institutions", async (req, res) => {
  try {
    const institutions = await Institute.find();
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

instituteApp.get("/except/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id)
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid institute ID" });
    }

    const institutes = await Institute.find({
      _id: { $ne: id }   // 👈 exclude given institute
    })
    .select("Institute_Name Address District Institute_ID")
    .sort({ Institute_Name: 1 });

    res.json(institutes);

  } catch (err) {
    console.error("Get institutes except one error:", err);
    res.status(500).json({
      message: "Failed to fetch institutes",
      error: err.message
    });
  }
});

// POST - Register new institute
instituteApp.post(
  "/register/institute",
  expressAsyncHandler(async (req, res) => {
    const instituteData = req.body;

    const {
      Institute_Name,
      Email_ID,
      password,
      confirm_password,
      Address,
      Contact_No
    } = instituteData;

    // 🔒 Required field check
    if (
  !Institute_Name ||
  !Email_ID ||
  !password ||
  !Address ||
  !Address.Street ||
  !Address.District ||
  !Address.State ||
  !Address.Pincode
) {
  return res.status(400).send({ message: "All required fields must be provided" });
}

    const existingInstitute = await Institute.findOne({ Institute_Name });
    if (existingInstitute) {
      return res.status(409).send({ message: "Institute already exists" });
    }

    const newInstitute = new Institute({
      Institute_Name,
      Email_ID,
      password, // store only password
      Contact_No,
      Address,
      Medicine_Inventory: []
    });

    const savedInstitute = await newInstitute.save();

    res.status(201).send({
      message: "Institute registered successfully",
      payload: savedInstitute
    });
  })
);


// POST - Login Institute
instituteApp.post(
  '/institute/login',
  expressAsyncHandler(async (req, res) => {
    const { Email_ID, password } = req.body;

    // Validate fields
    if (!Email_ID || !password) {
      return res
        .status(400)
        .send({ message: "Email and Password are required" });
    }

    // Find institute by email
    const institute = await Institute.findOne({ Email_ID: Email_ID.trim() });

    if (!institute) {
      return res.status(401).send({ message: "Invalid email or password" });
    }

    // Match password (plain text version — ideally hash this later)
    if (institute.password !== password) {
      return res.status(401).send({ message: "Invalid email or password" });
    }

    res.status(200).send({
      message: "Login successful",
      payload: institute,
    });
  })
);


instituteApp.get('/profile/:id', async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id)
      .populate('Medicine_Inventory.Medicine_ID', 'Medicine_Name Threshold_Qty')

    if (!institute) return res.status(404).json({ message: 'Institute not found' });

    // compute inventory summary using populated Medicine_Inventory
    const totalDistinct = institute.Medicine_Inventory.length;
    const totalQuantity = institute.Medicine_Inventory.reduce((sum, item) => sum + (item.Quantity || 0), 0);

    const lowStock = institute.Medicine_Inventory
      .filter(item => item.Medicine_ID && typeof item.Medicine_ID.Threshold_Qty === 'number')
      .filter(item => item.Quantity < item.Medicine_ID.Threshold_Qty)
      .map(item => ({
        medicineId: item.Medicine_ID._id,
        medicineName: item.Medicine_ID.Medicine_Name,
        quantity: item.Quantity,
        threshold: item.Medicine_ID.Threshold_Qty
      }));

    // recent orders (sorted descending by Order_Date), limit to 10
    const recentOrders = (institute.Orders || [])
      .slice()
      .sort((a, b) => new Date(b.Order_Date) - new Date(a.Order_Date))
      .slice(0, 10);

    return res.json({
      profile: institute,
      inventorySummary: {
        totalDistinct,
        totalQuantity,
        lowStockCount: lowStock.length,
        lowStock
      },
      recentOrders
    });
  } catch (err) {
    console.error('Error in GET /profile/:id', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /institute-api/profile/:id
// update some top-level profile fields (only fields from existing schema)
// Allowed updates: Institute_Name, Address, Email_ID, password, Contact_No
instituteApp.put('/profile/:id', async (req, res) => {
  try {
    const allowed = ['Institute_Name', 'Address', 'Email_ID', 'password', 'Contact_No'];
    const update = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const institute = await Institute.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('Medicine_Inventory.Medicine_ID', 'Medicine_Name Threshold_Qty')

    if (!institute) return res.status(404).json({ message: 'Institute not found' });

    return res.json({ message: 'Updated', profile: institute });
  } catch (err) {
    console.error('Error in PUT /profile/:id', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

instituteApp.get("/inventory/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;

    // 1️⃣ Fetch Main Store medicines
    const mainStoreMeds = await MainStoreMedicine.find({});

    // 2️⃣ Fetch Sub Store medicines (Pharmacy stock)
    const subStoreMeds = await Medicine.find({});

    // 3️⃣ Combine by Medicine_Code
    const inventoryMap = new Map();

    // ---- Main Store ----
    mainStoreMeds.forEach(m => {
      if (!m.Medicine_Code) return;

      inventoryMap.set(m.Medicine_Code, {
        Medicine_Code: m.Medicine_Code,
        Medicine_Name: m.Medicine_Name,
        Type: m.Type,
        Category: m.Category,
        Expiry_Date: m.Expiry_Date || null,
        Quantity: m.Quantity || 0,
        Threshold_Qty: m.Threshold_Qty ?? 0,
        Source: {
          mainStore: m.Quantity || 0,
          subStore: 0
        }
      });
    });

    // ---- Sub Store ----
    subStoreMeds.forEach(m => {
      if (!m.Medicine_Code) return;

      if (inventoryMap.has(m.Medicine_Code)) {
        const item = inventoryMap.get(m.Medicine_Code);
        item.Quantity += m.Quantity || 0;
        item.Source.subStore = m.Quantity || 0;
      } else {
        inventoryMap.set(m.Medicine_Code, {
          Medicine_Code: m.Medicine_Code,
          Medicine_Name: m.Medicine_Name,
          Type: m.Type,
          Category: m.Category,
          Expiry_Date: m.Expiry_Date || null,
          Quantity: m.Quantity || 0,
          Source: {
            mainStore: 0,
            subStore: m.Quantity || 0
          }
        });
      }
    });

    // 4️⃣ Send combined inventory
    res.json([...inventoryMap.values()]);
  } catch (err) {
    console.error("Institute inventory error:", err);
    res.status(500).json({
      message: "Failed to fetch institute inventory",
      error: err.message
    });
  }
});

// GET single institute by ID
instituteApp.get("/institution/:id", async (req, res) => {
  try {
    console.log(req.params.id)
    const institute = await Institute.findById(req.params.id);
    if (!institute) return res.status(404).json({ message: "Institute not found" });
    res.json(institute);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /institute-api/dashboard-stats/:instituteId - UPDATED VERSION
instituteApp.get("/dashboard-stats/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: "Invalid institute ID" });
    }

    // 1️⃣ Total Employees (with all new fields)
    const totalEmployees = await Employee.countDocuments();

    // 2️⃣ Registered Employees (same as total employees for now)
    const registeredEmployees = totalEmployees;

    // 3️⃣ Total Orders Placed by this institute
    const institute = await Institute.findById(instituteId).lean();
    if (!institute) {
      return res.status(404).json({ message: "Institute not found" });
    }

    // 4️⃣ Total medicines in inventory
    const totalMedicinesInInventory = institute.Medicine_Inventory?.reduce((sum, item) => 
      sum + (item.Quantity || 0), 0) || 0;

    // 5️⃣ Low stock medicines
    const lowStockMedicines = institute.Medicine_Inventory?.filter(item => {
      const threshold = item.Medicine_ID?.Threshold_Qty || 0;
      return (item.Quantity || 0) < threshold;
    }).length || 0;

    return res.json({
      totalEmployees,
      registeredEmployees,
      totalMedicinesInInventory,
      lowStockMedicines,
      inventoryItemCount: institute.Medicine_Inventory?.length || 0
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET /institute-api/employees-detailed - Get detailed employee list with all fields
instituteApp.get("/employees-detailed", async (req, res) => {
  try {
    const employees = await Employee.find({})
      .select('ABS_NO Name Email Designation DOB Phone_No Height Weight Address Blood_Group Photo Medical_History')
      .sort({ Name: 1 })
      .lean();

    // Format the response
    const formattedEmployees = employees.map(emp => ({
      _id: emp._id,
      ABS_NO: emp.ABS_NO || "-",
      Name: emp.Name || "-",
      Email: emp.Email || "-",
      Designation: emp.Designation || "-",
      DOB: emp.DOB ? new Date(emp.DOB).toISOString().split('T')[0] : "-",
      Phone_No: emp.Phone_No || "-",
      Height: emp.Height || "-",
      Weight: emp.Weight || "-",
      Address: emp.Address ? 
        `${emp.Address.Street || ""}, ${emp.Address.District || ""}, ${emp.Address.State || ""} - ${emp.Address.Pincode || ""}`.trim() 
        : "-",
      Blood_Group: emp.Blood_Group || "-",
      Photo: emp.Photo || null,
      Medical_History_Count: emp.Medical_History?.length || 0,
      Medical_History: emp.Medical_History || []
    }));

    res.status(200).json({
      count: formattedEmployees.length,
      employees: formattedEmployees
    });
  } catch (err) {
    console.error("Error fetching detailed employees:", err);
    res.status(500).json({ 
      message: "Failed to fetch employees", 
      error: err.message 
    });
  }
});

// GET /institute-api/employee/:id - Get single employee details
instituteApp.get("/employee/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid employee ID" });
    }

    const employee = await Employee.findById(id)
      .select('-Password')
      .lean();

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Format the response
    const formattedEmployee = {
      ...employee,
      DOB: employee.DOB ? new Date(employee.DOB).toISOString().split('T')[0] : null,
      Address: employee.Address ? 
        `${employee.Address.Street || ""}, ${employee.Address.District || ""}, ${employee.Address.State || ""} - ${employee.Address.Pincode || ""}`.trim() 
        : null,
      Medical_History_Count: employee.Medical_History?.length || 0
    };

    res.status(200).json(formattedEmployee);
  } catch (err) {
    console.error("Error fetching employee details:", err);
    res.status(500).json({ 
      message: "Failed to fetch employee details", 
      error: err.message 
    });
  }
});

module.exports = instituteApp;