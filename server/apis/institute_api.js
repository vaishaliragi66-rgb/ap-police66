const express = require('express');
const expressAsyncHandler = require('express-async-handler');
const Institute = require('../models/master_institute');

const instituteApp = express.Router();

// POST - Register new institute
instituteApp.post(
  "/register/institute",
  expressAsyncHandler(async (req, res) => {
    const instituteData = req.body;
    console.log("Received data:", instituteData);

    // Check if institute already exists by name
    const existingInstitute = await Institute.findOne({
      Institute_Name: instituteData.Institute_Name,
    });
    if (existingInstitute) {
      return res.status(409).send({ message: "Institute already exists" });
    }

    // Validate required fields
    if (
      !instituteData.Institute_Name ||
      !instituteData.Email_ID ||
      !instituteData.password ||
      !instituteData.Address ||
      !instituteData.Address.Street ||
      !instituteData.Address.District ||
      !instituteData.Address.State ||
      !instituteData.Address.Pincode
    ) {
      return res.status(400).send({ message: "All required fields must be provided" });
    }

    // Create and save new institute
    const newInstitute = new Institute({
      Institute_Name: instituteData.Institute_Name,
      Address: {
        Street: instituteData.Address.Street,
        District: instituteData.Address.District,
        State: instituteData.Address.State,
        Pincode: instituteData.Address.Pincode,
      },
      Email_ID: instituteData.Email_ID,
      password: instituteData.password,
      Contact_No: instituteData.Contact_No,
      Medicine_Inventory: [], // empty initially
      Orders: [], // empty initially
    });

    const savedInstitute = await newInstitute.save();

    res.status(201).send({
      message: "Institute registered successfully",
      payload: savedInstitute,
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

// GET /institute-api/profile/:id/inventory (only inventory list)
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



module.exports = instituteApp;