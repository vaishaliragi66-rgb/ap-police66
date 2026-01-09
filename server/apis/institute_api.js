const express = require('express');
const expressAsyncHandler = require('express-async-handler');
const mongoose = require('mongoose')
const axios = require('axios');
const instituteApp = express.Router();
const Institute = require('../models/master_institute');
const Manufacturer = require("../models/master_manufacture");
const Medicine = require("../models/master_medicine");  
const Order = require("../models/master_order");
const Employee = require("../models/employee"); 
const InstituteLedger = require("../models/InstituteLedger");

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
      Medicine_Inventory: [],
      Orders: []
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

// POST - Place New Order
instituteApp.post(
  "/institute/placeorder/:id",
  expressAsyncHandler(async (req, res) => {
    const instituteId = req.params.id;
    const { Manufacturer_ID, Medicine_ID, Quantity_Requested } = req.body;

    console.log("Received order request:", req.body);

    // ✅ Validate required fields
    if (!Manufacturer_ID || !Medicine_ID || !Quantity_Requested) {
      return res.status(400).send({ message: "All fields are required" });
    }

    // ✅ Find the institute by ID
    const institute = await Institute.findById(instituteId);
    if (!institute) {
      return res.status(404).send({ message: "Institute not found" });
    }

    // ✅ Create a new order object
    const newOrder = {
      Manufacturer_ID,
      Medicine_ID,
      Quantity_Requested,
      Status: "PENDING",
      Order_Date: new Date(),
    };

    // ✅ Push the new order to the institute's Orders array
    institute.Orders.push(newOrder);

    // ✅ Save updated document
    await institute.save();

    console.log("Order placed successfully for Institute:", institute.Institute_Name);

    res.status(201).send({
      message: "Order placed successfully",
      payload: newOrder,
    });
  })
);

instituteApp.get('/profile/:id', async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id)
      .populate('Medicine_Inventory.Medicine_ID', 'Medicine_Name Threshold_Qty')
      .populate('Orders.Medicine_ID', 'Medicine_Name Threshold_Qty')
      .populate('Orders.Manufacturer_ID', 'Manufacturer_Name');

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
      .populate('Orders.Medicine_ID', 'Medicine_Name Threshold_Qty')
      .populate('Orders.Manufacturer_ID', 'Manufacturer_Name');

    if (!institute) return res.status(404).json({ message: 'Institute not found' });

    return res.json({ message: 'Updated', profile: institute });
  } catch (err) {
    console.error('Error in PUT /profile/:id', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// ✅ Place order route (final version)
// POST /institute-api/place_order/:instituteId
// place_order: create Order doc and link to institute + manufacturer
instituteApp.post("/place_order/:id", expressAsyncHandler(async (req, res) => {
  console.log("✅ place_order route hit with:", req.params);
  const instituteId = req.params.id;
  const { Manufacturer_ID, Medicine_ID, Quantity_Requested } = req.body;

  if (!Manufacturer_ID || !Medicine_ID || !Quantity_Requested) {
    return res.status(400).send({ message: "All fields are required" });
  }

  if (!mongoose.Types.ObjectId.isValid(instituteId)
      || !mongoose.Types.ObjectId.isValid(Manufacturer_ID)
      || !mongoose.Types.ObjectId.isValid(Medicine_ID)) {
    return res.status(400).send({ message: "Invalid IDs provided" });
  }

  const institute = await Institute.findById(instituteId);
  if (!institute) return res.status(404).send({ message: "Institute not found" });

  const manufacturer = await Manufacturer.findById(Manufacturer_ID);
  if (!manufacturer) return res.status(404).send({ message: "Manufacturer not found" });

  const medicine = await Medicine.findById(Medicine_ID);
  if (!medicine) return res.status(404).send({ message: "Medicine not found" });

  // Create Order document
  const order = await Order.create({
    Institute_ID: institute._id,
    Manufacturer_ID,
    Medicine_ID,
    Quantity_Requested,
    manufacture_Status: "PENDING",
    institute_Status: "PENDING",
    Order_Date: new Date()
  });

  // Link to Institute and Manufacturer
  institute.Orders.push(order._id);
  manufacturer.Orders.push(order._id);

  await institute.save();
  await manufacturer.save();

  return res.status(201).json({ message: "Order placed successfully", orderId: order._id });
}));

// Example: GET /institute-api/orders/:instituteId?status=PENDING
instituteApp.get("/orders/:instituteId", expressAsyncHandler(async (req, res) => {
  try {
    const { instituteId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(instituteId)) return res.status(400).json({ error: "Invalid institute ID" });

    // Load institute and populate Orders (which are refs to Order docs)
    const institute = await Institute.findById(instituteId)
      .populate({
        path: "Orders",
        populate: [
          { path: "Medicine_ID", select: "Medicine_Name Type Category" },
          { path: "Manufacturer_ID", select: "Manufacturer_Name" }
        ]
      })
      .lean();

    if (!institute) return res.status(404).json({ error: "Institute not found" });

    const orders = (institute.Orders || []).map(o => ({
      _id: o._id,
      Medicine_ID: o.Medicine_ID,
      Manufacturer_ID: o.Manufacturer_ID,
      Manufacturer_Name: o.Manufacturer_ID?.Manufacturer_Name || "Unknown",
      Quantity_Requested: o.Quantity_Requested,
      institute_Status: o.institute_Status,
      manufacture_Status: o.manufacture_Status,
      Order_Date: o.Order_Date,
      Delivery_Date: o.Delivery_Date || null,
      Remarks: o.Remarks
    }));

    return res.status(200).json(orders);
  } catch (err) {
    console.error("Error fetching institute orders:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}));

// PATCH /institute-api/orders/:orderId/status
// routes/instituteOrders.js
// institute_api.js
// server side: put this route in the same file where instituteApp is defined
// Replace your existing delivered route with this exact code
// institute marks its side delivered
instituteApp.put(
  "/orders/:manufacturerId/:orderId/delivered",
  async (req, res) => {
    try {
      const { manufacturerId, orderId } = req.params;

      const order = await Order.findById(orderId);
      if (!order)
        return res.status(404).json({ message: "Order not found" });

      // Institute can deliver only after approval
      if (order.institute_Status !== "APPROVED") {
        return res
          .status(400)
          .json({ message: "Order must be approved first" });
      }

      // Mark institute delivered
      order.institute_Status = "DELIVERED";
      if (!order.Delivery_Date) order.Delivery_Date = new Date();
      await order.save();

      // 🔒 IMPORTANT: DO NOTHING ELSE unless manufacturer also delivered
      if (order.manufacture_Status !== "DELIVERED") {
        return res.json({
          message:
            "Institute delivery recorded. Waiting for manufacturer delivery.",
          finalDelivered: false
        });
      }

      // ✅ BOTH SIDES DELIVERED → NOW update inventory + ledger
      const institute = await Institute.findById(order.Institute_ID);
      const medicine = await Medicine.findById(order.Medicine_ID).populate(
        "Manufacturer_ID",
        "Manufacturer_Name"
      );

      const qty = Number(order.Quantity_Requested);

      let invItem = institute.Medicine_Inventory.find(
        (m) => m.Medicine_ID.toString() === order.Medicine_ID.toString()
      );

      if (invItem) {
        invItem.Quantity += qty;
      } else {
        institute.Medicine_Inventory.push({
          Medicine_ID: order.Medicine_ID,
          Quantity: qty
        });
        invItem = institute.Medicine_Inventory.at(-1);
      }

      await institute.save();

      // ✅ LEDGER ENTRY (IN) — ONLY HERE
      await InstituteLedger.create({
        Institute_ID: institute._id,
        Transaction_Type: "ORDER_DELIVERY",
        Reference_ID: order._id,
        Medicine_ID: order.Medicine_ID,
        Medicine_Name: medicine.Medicine_Name,
        Manufacturer_Name:
          medicine.Manufacturer_ID?.Manufacturer_Name || "",
        Expiry_Date: medicine.Expiry_Date,
        Direction: "IN",
        Quantity: qty,
        Balance_After: invItem.Quantity
      });

      return res.json({
        message: "Order fully delivered (both sides confirmed)",
        finalDelivered: true
      });
    } catch (err) {
      console.error("Institute deliver error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);
instituteApp.get("/inventory/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ error: "Invalid Institute ID" });
    }

    const institute = await Institute.findById(instituteId)
      .populate("Medicine_Inventory.Medicine_ID");

    if (!institute) {
      return res.status(404).json({ error: "Institute not found" });
    }

    const rawInventory = Array.isArray(institute.Medicine_Inventory)
      ? institute.Medicine_Inventory
      : [];

    const inventory = rawInventory
      .filter(item => item && item.Medicine_ID)   // 🔥 skip broken refs
      .map(item => ({
        medicineId: item.Medicine_ID._id,
        medicineCode: item.Medicine_ID.Medicine_Code,
        medicineName: item.Medicine_ID.Medicine_Name,
        quantity: item.Quantity ?? 0,
        threshold: item.Medicine_ID.Threshold_Qty ?? 0,
        expiryDate: item.Medicine_ID.Expiry_Date ?? null,
      }));

    res.status(200).json(inventory);

  } catch (err) {
    console.error("Inventory fetch error:", err);
    res.status(500).json({ error: err.message });
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

    // Count PENDING orders
    const pendingOrdersCount = await Order.countDocuments({
      Institute_ID: instituteId,
      institute_Status: "PENDING"
    });

    // Count DELIVERED orders
    const deliveredOrdersCount = await Order.countDocuments({
      Institute_ID: instituteId,
      institute_Status: "DELIVERED"
    });

    const totalOrdersPlaced = institute.Orders?.length || 0;

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
      totalOrdersPlaced,
      registeredEmployees,
      pendingOrdersCount,
      deliveredOrdersCount,
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