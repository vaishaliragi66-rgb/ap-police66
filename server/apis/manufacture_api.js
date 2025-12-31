const express = require("express");
const manufacturerApp = express.Router();
const Manufacturer = require("../models/master_manufacture");
const Institute = require('../models/master_institute');
const Medicine = require("../models/master_medicine");
const Order = require("../models/master_order"); 
const InstituteLedger = require("../models/InstituteLedger");
const mongoose = require("mongoose");
const axios = require("axios");

// CREATE (Register) - No changes needed
manufacturerApp.post("/register_manufacturer", async (req, res) => {
  try {
    const manufacturer = new Manufacturer(req.body);
    const saved = await manufacturer.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ all - No changes needed
manufacturerApp.get("/manufacturers", async (req, res) => {
  try {
    const manufacturers = await Manufacturer.find();
    res.json(manufacturers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ one by Manufacturer_Name - No changes needed
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

// UPDATE by Manufacturer_ID - No changes needed
manufacturerApp.put("/manufacturer_update/:id", async (req, res) => {
  try {
    const manufacturerId = parseInt(req.params.id);
    const updated = await Manufacturer.findOneAndUpdate(
      { Manufacturer_ID: manufacturerId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE by Manufacturer_ID - No changes needed
manufacturerApp.delete("/manufacturer_delete/:id", async (req, res) => {
  try {
    const manufacturerId = parseInt(req.params.id);
    const deleted = await Manufacturer.findOneAndDelete({ Manufacturer_ID: manufacturerId });
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATED GET ORDERS ROUTE - Now using separate Order collection
manufacturerApp.get("/manufacturer/orders/:manufacturerId", async (req, res) => {
  try {
    const manufacturerId = parseInt(req.params.manufacturerId);
    console.log("🔍 Looking for manufacturer with ID:", manufacturerId);
    
    if (isNaN(manufacturerId)) {
      return res.status(400).json({ error: "Invalid Manufacturer ID" });
    }

    // Find manufacturer first to get the _id
    const manufacturer = await Manufacturer.findOne({ Manufacturer_ID: manufacturerId });
    
    if (!manufacturer) {
      return res.status(404).json({ error: "Manufacturer not found" });
    }

    console.log("📦 Found manufacturer:", manufacturer.Manufacturer_Name);
    
    // Get orders from Order collection using Manufacturer _id
    const orders = await Order.find({ Manufacturer_ID: manufacturer._id })
      .populate('Institute_ID', 'Institute_Name')
      .populate('Medicine_ID', 'Medicine_Name')
      .sort({ Order_Date: -1 });

    console.log("📊 Orders count:", orders.length);
    
    res.json({ 
      orders: orders,
      manufacturerName: manufacturer.Manufacturer_Name 
    });
  } catch (err) {
    console.error("🔥 Backend error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATED ACCEPT ORDER - Using separate Order collection
manufacturerApp.put("/manufacturer/order/accept/:manufacturerId/:orderId", async (req, res) => {
  try {
    const manufacturerId = parseInt(req.params.manufacturerId);
    const { orderId } = req.params;

    console.log("✅ Accept request received for Manufacturer_ID:", manufacturerId, "Order:", orderId);

    // Find manufacturer first
    const manufacturer = await Manufacturer.findOne({ Manufacturer_ID: manufacturerId });
    if (!manufacturer) {
      return res.status(404).json({ error: "Manufacturer not found" });
    }

    // Find and update order in Order collection
    const updatedOrder = await Order.findOneAndUpdate(
      { 
        _id: orderId,
        Manufacturer_ID: manufacturer._id 
      },
      { 
        $set: { 
          manufacture_Status: "APPROVED",
          institute_Status: "APPROVED",
          Remarks: "Approved and ready for dispatch",
          Delivery_Date: new Date()
        } 
      },
      { new: true }
    ).populate('Institute_ID', 'Institute_Name')
     .populate('Medicine_ID', 'Medicine_Name');

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("📦 Order accepted and updated in Order DB");

    // Notify institute system - Update institute_Status
    let instituteSyncSuccess = false;
    try {
      console.log("🌐 Notifying institute system...");
      
      const response = await axios.put(
        `http://localhost:6100/institute-api/update-order-status/${updatedOrder.Institute_ID._id.toString()}/${updatedOrder.Medicine_ID._id.toString()}`,
        {
          Status: "APPROVED"
        },
        { timeout: 3000 }
      );
      console.log("✅ Institute API response:", response.data);
      instituteSyncSuccess = true;
      
      // Also update institute_Status in Order collection
      await Order.findByIdAndUpdate(
        orderId,
        { $set: { institute_Status: "APPROVED" } }
      );
      
    } catch (notifyErr) {
      console.error("⚠️ Failed to sync with institute system:", notifyErr.message);
      console.error("⚠️ Response data:", notifyErr.response?.data);
    }

    res.status(200).json({
      message: instituteSyncSuccess 
        ? "Order accepted successfully and synced with institute system"
        : "Order accepted successfully (institute system unavailable)",
      payload: updatedOrder,
      instituteSynced: instituteSyncSuccess
    });
  } catch (error) {
    console.error("🔥 Error accepting order:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// ✅ UPDATED REJECT ORDER - Using separate Order collection
manufacturerApp.put("/manufacturer/order/reject/:manufacturerId/:orderId", async (req, res) => {
  try {
    const manufacturerId = parseInt(req.params.manufacturerId);
    const { orderId } = req.params;

    console.log("❌ Reject request received for Manufacturer_ID:", manufacturerId, "Order:", orderId);

    // Find manufacturer first
    const manufacturer = await Manufacturer.findOne({ Manufacturer_ID: manufacturerId });
    if (!manufacturer) {
      return res.status(404).json({ error: "Manufacturer not found" });
    }

    // Find and update order in Order collection
    const updatedOrder = await Order.findOneAndUpdate(
      { 
        _id: orderId,
        Manufacturer_ID: manufacturer._id 
      },
      { 
        $set: { 
          manufacture_Status: "REJECTED",
          institute_Status: "REJECTED",
          Remarks: "Rejected by manufacturer",
          Delivery_Date: new Date()
        } 
      },
      { new: true }
    ).populate('Institute_ID', 'Institute_Name')
     .populate('Medicine_ID', 'Medicine_Name');

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("📦 Order rejected and updated in Order DB");

    // Notify institute system - Update institute_Status
    try {
      console.log("🌐 Notifying institute system...");
      
      const response = await axios.put(
        `http://localhost:6100/institute-api/update-order-status/${updatedOrder.Institute_ID._id.toString()}/${updatedOrder.Medicine_ID._id.toString()}`,
        {
          Status: "REJECTED",
          Remarks: "Rejected by manufacturer",
        }
      );
      console.log("✅ Institute API response:", response.data);
      
      // Also update institute_Status in Order collection
      await Order.findByIdAndUpdate(
        orderId,
        { $set: { institute_Status: "REJECTED" } }
      );
      
    } catch (notifyErr) {
      console.error("⚠️ Failed to sync with institute system:", notifyErr.message);
      console.error("⚠️ Response data:", notifyErr.response?.data);
    }

    res.status(200).json({
      message: "Order rejected successfully and synced with institute system",
      payload: updatedOrder,
    });
  } catch (error) {
    console.error("🔥 Error rejecting order:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


// ✅ UPDATED DEBUG ROUTE
manufacturerApp.get("/debug/manufacturer/:id", async (req, res) => {
  try {
    const manufacturerId = parseInt(req.params.id);
    console.log("🔍 Debug: Looking for manufacturer with ID:", manufacturerId);
    
    if (isNaN(manufacturerId)) {
      return res.status(400).json({ error: "Invalid Manufacturer ID - must be a number" });
    }

    // Find manufacturer
    const manufacturer = await Manufacturer.findOne({ Manufacturer_ID: manufacturerId })
      .populate('Orders');
    
    console.log("🔍 By Manufacturer_ID:", manufacturer ? "Found" : "Not found");
    
    // Get orders for this manufacturer
    let orders = [];
    if (manufacturer) {
      orders = await Order.find({ Manufacturer_ID: manufacturer._id })
        .populate('Institute_ID', 'Institute_Name')
        .populate('Medicine_ID', 'Medicine_Name');
    }

    // List all manufacturers
    const allManufacturers = await Manufacturer.find({}, 'Manufacturer_ID Manufacturer_Name');

    if (manufacturer) {
      return res.json({
        foundBy: "Manufacturer_ID",
        manufacturer: {
          id: manufacturer._id,
          manufacturerId: manufacturer.Manufacturer_ID,
          name: manufacturer.Manufacturer_Name,
          ordersCount: orders.length,
          orders: orders
        },
        allManufacturers: allManufacturers.map(m => ({
          manufacturerId: m.Manufacturer_ID,
          name: m.Manufacturer_Name
        }))
      });
    } else {
      return res.status(404).json({ 
        error: "Manufacturer not found",
        searchedId: manufacturerId,
        allManufacturers: allManufacturers.map(m => ({
          manufacturerId: m.Manufacturer_ID,
          name: m.Manufacturer_Name
        }))
      });
    }
  } catch (err) {
    console.error("🔥 Debug error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DEBUG INSTITUTE CONNECTION - No changes needed
manufacturerApp.get("/debug/test-institute-connection", async (req, res) => {
  try {
    console.log("🔍 Testing connection to institute API...");
    
    // Test basic connectivity
    try {
      const testResponse = await axios.get("http://localhost:6100/institute-api/institutions", {
        timeout: 5000
      });
      console.log("✅ Institute API is reachable");
      console.log("📊 Response:", testResponse.data.length + " institutions found");
    } catch (basicError) {
      console.error("❌ Institute API is NOT reachable:", basicError.message);
      console.error("❌ Check if institute server is running on port 6100");
      return res.status(500).json({
        instituteApiReachable: false,
        error: basicError.message,
        suggestion: "Make sure institute server is running on port 6100"
      });
    }
    
    // Test the specific update endpoint
    try {
      const testUpdate = await axios.put(
        "http://localhost:6100/institute-api/update-order-status/6901b433f087748c8f1d7e45/6901b3f6f087748c8f1d7e42",
        {
          Status: "Dispatched",
          Remarks: "Test update from manufacturer"
        },
        { timeout: 5000 }
      );
      
      console.log("✅ Institute update endpoint works:", testUpdate.data);
      
      res.json({
        instituteApiReachable: true,
        updateEndpointWorks: true,
        testResponse: "API is working",
        testUpdate: testUpdate.data
      });
    } catch (updateError) {
      console.error("❌ Institute update endpoint failed:", updateError.message);
      console.error("❌ Response status:", updateError.response?.status);
      console.error("❌ Response data:", updateError.response?.data);
      
      res.status(500).json({
        instituteApiReachable: true,
        updateEndpointWorks: false,
        error: updateError.message,
        status: updateError.response?.status,
        responseData: updateError.response?.data
      });
    }
    
  } catch (error) {
    console.error("❌ Institute connection test completely failed:", error.message);
    res.status(500).json({
      instituteApiReachable: false,
      error: error.message
    });
  }
});

manufacturerApp.put(
  "/manufacturer/order/deliver/:manufacturerId/:orderId",
  async (req, res) => {
    try {
      const { manufacturerId, orderId } = req.params;

      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ message: "Order not found" });

      const manufacturer = await Manufacturer.findOne({ Manufacturer_ID: manufacturerId });
      if (!manufacturer) return res.status(404).json({ message: "Manufacturer not found" });

      if (String(order.Manufacturer_ID) !== String(manufacturer._id)) {
        return res.status(400).json({ message: "Manufacturer mismatch" });
      }

      if (order.manufacture_Status !== "APPROVED") {
        return res.status(400).json({ message: "Order must be approved first" });
      }

      order.manufacture_Status = "DELIVERED";
      if (!order.Delivery_Date) order.Delivery_Date = new Date();
      await order.save();

      // ✅ If institute already delivered → update inventory + ledger
      if (order.institute_Status === "DELIVERED") {
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

        // ✅ LEDGER ENTRY (IN)
        await InstituteLedger.create({
          Institute_ID: institute._id,
          Transaction_Type: "ORDER_DELIVERY",
          Reference_ID: order._id,
          Medicine_ID: order.Medicine_ID,
          Medicine_Name: medicine.Medicine_Name,
          Manufacturer_Name: medicine.Manufacturer_ID?.Manufacturer_Name || "",
          Expiry_Date: medicine.Expiry_Date,
          Direction: "IN",
          Quantity: qty,
          Balance_After: invItem.Quantity
        });
      }

      return res.json({
        message: "Manufacturer delivery processed (ledger safe)"
      });

    } catch (err) {
      console.error("Manufacturer deliver error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

module.exports = manufacturerApp;