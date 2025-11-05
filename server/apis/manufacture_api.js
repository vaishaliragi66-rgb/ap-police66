const express = require("express");
const manufacturerApp = express.Router();
const Manufacturer = require("../models/master_manufacture");
const Institute = require('../models/master_institute');
const Medicine = require("../models/master_medicine");
const mongoose = require("mongoose");

// CREATE (Register)
manufacturerApp.post("/register_manufacturer", async (req, res) => {
  try {
    const manufacturer = new Manufacturer(req.body);
    const saved = await manufacturer.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// READ all
manufacturerApp.get("/manufacturers", async (req, res) => {
  try {
    const manufacturers = await Manufacturer.find();
    res.json(manufacturers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ one by Manufacturer_Name
manufacturerApp.get("/manufacturer/name/:name", async (req, res) => {
  try {
    const manufacturer = await Manufacturer.findOne({
      Manufacturer_Name: req.params.name
    });

    if (!manufacturer) {
      return res.status(404).json({ error: "Manufacturer not found" });
    }

    res.json(manufacturer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// UPDATE by Manufacturer_ID
manufacturerApp.put("/manufacturer_update/:id", async (req, res) => {
  try {
    const updated = await Manufacturer.findOneAndUpdate(
      { Manufacturer_ID: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE by Manufacturer_ID
manufacturerApp.delete("/manufacturer_delete/:id", async (req, res) => {
  try {
    const deleted = await Manufacturer.findOneAndDelete({ Manufacturer_ID: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

manufacturerApp.post("/neworder", async (req, res) => {
  try {
    console.log("📥 manufacturer/neworder called, body:", req.body);

    let { Institute_ID, Manufacturer_ID, Medicine_ID, Quantity } = req.body;

    // Basic validation
    if (!Institute_ID || !Manufacturer_ID || !Medicine_ID || !Quantity) {
      console.log("❌ missing fields");
      return res.status(400).json({ error: "Institute_ID, Manufacturer_ID, Medicine_ID and Quantity are required" });
    }

    // Cast ids to ObjectId safely
    try {
      Institute_ID = new mongoose.Types.ObjectId(Institute_ID);
      Manufacturer_ID = new mongoose.Types.ObjectId(Manufacturer_ID);
      Medicine_ID = new mongoose.Types.ObjectId(Medicine_ID);
    } catch (castErr) {
      console.error("❌ Invalid ObjectId in request:", castErr.message);
      return res.status(400).json({ error: "Invalid ObjectId provided" });
    }

    Quantity = Number(Quantity);
    if (Number.isNaN(Quantity) || Quantity < 0) {
      return res.status(400).json({ error: "Quantity must be a non-negative number" });
    }

    const manufacturer = await Manufacturer.findById(Manufacturer_ID);
    if (!manufacturer) return res.status(404).json({ error: "Manufacturer not found" });

    const institute = await Institute.findById(Institute_ID);
    if (!institute) return res.status(404).json({ error: "Institute not found" });

    const medicine = await Medicine.findById(Medicine_ID);
    if (!medicine) return res.status(404).json({ error: "Medicine not found" });

    const manOrder = {
      Institute_ID,
      Medicine_ID,
      Quantity,
      Order_Date: new Date(),
      Delivery_Status: "Pending",
      Remarks: "Awaiting approval"
    };

    console.log("🚀 manufacturer order to save (types):", {
      Institute_ID: typeof manOrder.Institute_ID, Medicine_ID: typeof manOrder.Medicine_ID, Quantity: typeof manOrder.Quantity
    });

    manufacturer.Orders.push(manOrder);

    // Save and catch validation errors specifically
    await manufacturer.save();
    console.log("✅ Saved order in Manufacturer:", manufacturer._id.toString());
    return res.status(200).json({ message: "Order received and saved successfully!" });

  } catch (err) {
    if (err.name === "ValidationError") {
      console.error("🔴 Mongoose validation error in neworder:", err);
      return res.status(400).json({ error: "Validation error", details: err.errors });
    }
    console.error("🔥 Error in neworder:", err);
    return res.status(500).json({ error: "Error saving order in manufacturer side" });
  }
});


module.exports = manufacturerApp;
