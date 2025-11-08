const express = require('express');
const expressAsyncHandler = require('express-async-handler');
const mongoose = require('mongoose')
const axios = require('axios');
const instituteApp = express.Router();
const Institute = require('../models/master_institute');
const Manufacturer = require("../models/master_manufacture");
const Medicine = require("../models/master_medicine");  
const Order = require("../models/master_order");
instituteApp.get("/institutions", async (req, res) => {
  try {
    const institutions = await Institute.find();
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
  expressAsyncHandler(async (req, res) => {
    try {
      const { manufacturerId, orderId } = req.params;
      const debug = { steps: [] };

      if (
        !mongoose.Types.ObjectId.isValid(manufacturerId) ||
        !mongoose.Types.ObjectId.isValid(orderId)
      ) {
        return res.status(400).json({ error: "Invalid IDs", debug });
      }

      // Load Order doc
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: "Order not found", debug });

      // Confirm this order belongs to the manufacturer passed
      if (String(order.Manufacturer_ID) !== String(manufacturerId)) {
        return res
          .status(400)
          .json({ error: "Manufacturer ID mismatch for this order", debug });
      }

      // If manufacturer already rejected, reject institute side too
      if (order.manufacture_Status && order.manufacture_Status.toUpperCase() === "REJECTED") {
        order.institute_Status = "REJECTED";
        await order.save();
        debug.steps.push("Manufacturer rejected → Institute automatically REJECTED");
        return res.status(200).json({
          message: "Order rejected by manufacturer → Institute automatically rejected",
          manufacturerDelivered: false,
          orderId: order._id,
          debug
        });
      }

      // Business rule: only APPROVED institute orders can be marked delivered
      if (!order.institute_Status || order.institute_Status.toUpperCase() !== "APPROVED") {
        return res.status(400).json({
          error: "Order must be APPROVED before institute marks delivered",
          debug
        });
      }

      // Mark institute side delivered
      order.institute_Status = "DELIVERED";
      if (!order.Delivery_Date) order.Delivery_Date = new Date();
      await order.save();
      debug.steps.push("Institute side marked DELIVERED on Order");

      let manufacturerDelivered = false;

      // If manufacturer already delivered, do final inventory update
      if (
        order.manufacture_Status &&
        order.manufacture_Status.toUpperCase() === "DELIVERED"
      ) {
        manufacturerDelivered = true;
        const institute = await Institute.findById(order.Institute_ID);
        if (!institute) {
          return res
            .status(404)
            .json({ error: "Institute not found when updating inventory", debug });
        }

        const qty = Number(order.Quantity_Requested || 0);

        // Merge inventory
        const inv = institute.Medicine_Inventory.find(
          (it) => String(it.Medicine_ID) === String(order.Medicine_ID)
        );
        if (inv) {
          inv.Quantity = (inv.Quantity || 0) + qty;
        } else {
          institute.Medicine_Inventory.push({ Medicine_ID: order.Medicine_ID, Quantity: qty });
        }

        // Decrement global medicine
        const medDoc = await Medicine.findById(order.Medicine_ID);
        if (medDoc) {
          medDoc.Quantity = Math.max(0, (medDoc.Quantity || 0) - qty);
          console.log(medDoc.Quantity)
          await medDoc.save();
        }

        await institute.save();
        debug.steps.push("Inventory merged and global Medicine.Quantity decremented");
      }

      return res.status(200).json({
        message: manufacturerDelivered
          ? "Order marked DELIVERED and inventory updated (both sides delivered)."
          : "Order marked DELIVERED on institute side. Waiting for manufacturer confirmation.",
        manufacturerDelivered,
        orderId: order._id,
        debug
      });
    } catch (err) {
      console.error("deliver-route-error:", err);
      return res
        .status(500)
        .json({ error: "Internal server error", details: err.message });
    }
  })
);

instituteApp.get("/inventory/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ error: "Invalid Institute ID" });
    }

    const institute = await Institute.findById(instituteId).populate({
      path: "Medicine_Inventory.Medicine_ID",
      model: "Medicine",
      populate: {
        path: "Manufacturer_ID",
        model: "Manufacturer"
      }
    });

    if (!institute) return res.status(404).json({ error: "Institute not found" });

    const inventory = institute.Medicine_Inventory.map(item => ({
      medicineName: item.Medicine_ID.Medicine_Name,
      manufacturerName: item.Medicine_ID.Manufacturer_ID.Manufacturer_Name,
      quantity: item.Quantity,
      threshold: item.Medicine_ID.Threshold_Qty
    }));

    return res.status(200).json(inventory);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

module.exports = instituteApp;