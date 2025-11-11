const express = require("express");
const manufacturerApp = express.Router();
const Manufacturer = require("../models/master_manufacture");
const Institute = require('../models/master_institute');
const Medicine = require("../models/master_medicine");
const Order = require("../models/master_order"); // ✅ Import the new Order model
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

manufacturerApp.put("/manufacturer/order/deliver/:manufacturerId/:orderId", async (req, res) => {
  try {
    const { manufacturerId, orderId } = req.params;
    console.log("🚚 Deliver route hit:", { manufacturerId, orderId });
    const debug = { steps: [] };

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.log("❌ Invalid orderId");
      return res.status(400).json({ error: "Invalid Order ID", debug });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      console.log("❌ Order not found");
      return res.status(404).json({ error: "Order not found", debug });
    }

    console.log("📦 Order found:", order._id, "status:", order.manufacture_Status, order.institute_Status);

    const manufacturer = await Manufacturer.findOne({ Manufacturer_ID: manufacturerId });
    if (!manufacturer) {
      console.log("❌ Manufacturer not found");
      return res.status(404).json({ error: "Manufacturer not found", debug });
    }

    console.log("🏭 Manufacturer found:", manufacturer._id);

    if (String(order.Manufacturer_ID) !== String(manufacturer._id)) {
      console.log("❌ Mismatch:", order.Manufacturer_ID, "vs", manufacturer._id);
      return res.status(400).json({ error: "Manufacturer ID mismatch", debug });
    }

    const status = (order.manufacture_Status || "").toUpperCase();
    console.log("🟡 manufacture_Status:", status);

    if (status !== "APPROVED") {
      console.log("❌ Order not APPROVED, skipping delivery");
      return res.status(400).json({ error: "Order must be APPROVED before marking DELIVERED", debug });
    }

    order.manufacture_Status = "DELIVERED";
    if (!order.Delivery_Date) order.Delivery_Date = new Date();
    await order.save();

    console.log("✅ Manufacturer marked DELIVERED");

    if ((order.institute_Status || "").toUpperCase() === "DELIVERED") {
      console.log("🔄 Both sides DELIVERED - syncing inventory");

      const medDoc = await Medicine.findById(order.Medicine_ID);
      console.log("💊 Medicine found:", medDoc ? medDoc.Medicine_Name : "❌ Not found");

      const qty = Number(order.Quantity_Requested || 0);

      if (!medDoc) {
        console.log("❌ Medicine not found in manufacturer stock");
        return res.status(404).json({ error: "Medicine not found in manufacturer inventory", debug });
      }

      medDoc.Quantity = Math.max(0, (medDoc.Quantity || 0) - qty);
      await medDoc.save();
      console.log("📉 Medicine quantity decreased:", medDoc.Quantity);

      const institute = await Institute.findById(order.Institute_ID);
      console.log("🏫 Institute found:", institute ? institute.Institute_Name : "❌ Not found");

      const existingMed = institute.Medicine_Inventory.find(
        (it) => String(it.Medicine_ID) === String(order.Medicine_ID)
      );

      if (existingMed) {
        existingMed.Quantity = (existingMed.Quantity || 0) + qty;
        console.log("➕ Increased existing medicine:", existingMed.Quantity);
      } else {
        institute.Medicine_Inventory.push({ Medicine_ID: order.Medicine_ID, Quantity: qty });
        console.log("🆕 Added new medicine to inventory");
      }
      await institute.save();
      console.log("✅ Institute inventory updated");
    } else {
      console.log("⏳ Waiting for institute side to mark DELIVERED");
    }

    return res.status(200).json({ message: "Processed", debug });
  } catch (err) {
    console.error("🔥 manufacturer-deliver-error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});



module.exports = manufacturerApp;