const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const medicineApp = express.Router();
const Medicine = require("../models/master_medicine");
const Manufacturer = require("../models/master_manufacture");

// ✅ CREATE - Add a new medicine by a manufacturer
medicineApp.post("/medicine_add", expressAsyncHandler(async (req, res) => {
  try {
    const {
      Medicine_Code,
      Manufacturer_ID,
      Medicine_Name,
      Type,
      Category,
      Quantity,
      Threshold_Qty,
      Expiry_Date
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "Medicine_Code", "Manufacturer_ID", "Medicine_Name", 
      "Quantity", "Threshold_Qty", "Expiry_Date"
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(", ")}` 
      });
    }

    // Validate expiry date is in the future
    const expiryDate = new Date(Expiry_Date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare only date, not time
    
    if (expiryDate <= today) {
      return res.status(400).json({ 
        message: "Expiry date must be in the future" 
      });
    }

    // Check if manufacturer exists
    const manufacturer = await Manufacturer.findById(Manufacturer_ID);
    if (!manufacturer) {
      return res.status(404).json({ message: "Manufacturer not found" });
    }

    // Check if medicine code already exists for this manufacturer
    const existingMedicine = await Medicine.findOne({
      Manufacturer_ID,
      Medicine_Code
    });

    if (existingMedicine) {
      return res.status(400).json({ 
        message: `Medicine code ${Medicine_Code} already exists for this manufacturer` 
      });
    }

    // Create new medicine
    const newMedicine = new Medicine({
      Medicine_Code,
      Manufacturer_ID,
      Medicine_Name,
      Type,
      Category,
      Quantity: Number(Quantity),
      Threshold_Qty: Number(Threshold_Qty),
      Expiry_Date: expiryDate
    });

    await newMedicine.save();
    
    res.status(201).json({ 
      message: "Medicine added successfully", 
      medicine: newMedicine 
    });
    
  } catch (err) {
    console.error("Add medicine error:", err);
    
    // Handle duplicate key error (unique index violation)
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: `Medicine code already exists for this manufacturer`,
        error: err.message 
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
      message: "Failed to add medicine",
      error: err.message 
    });
  }
}));

// ✅ GET medicines near expiry (within 30 days)
medicineApp.get("/expiring-soon/:manufacturerId", async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(manufacturerId)) {
      return res.status(400).json({ message: "Invalid manufacturer ID" });
    }
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringMedicines = await Medicine.find({
      Manufacturer_ID: manufacturerId,
      Expiry_Date: { 
        $gte: new Date(), // Not expired yet
        $lte: thirtyDaysFromNow // Expiring within 30 days
      }
    })
    .populate("Manufacturer_ID", "Manufacturer_Name")
    .sort({ Expiry_Date: 1 });
    
    res.json(expiringMedicines);
  } catch (err) {
    console.error("Get expiring medicines error:", err);
    res.status(500).json({ 
      message: "Failed to fetch expiring medicines",
      error: err.message 
    });
  }
});

// ✅ GET expired medicines
medicineApp.get("/expired/:manufacturerId", async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(manufacturerId)) {
      return res.status(400).json({ message: "Invalid manufacturer ID" });
    }
    
    const expiredMedicines = await Medicine.find({
      Manufacturer_ID: manufacturerId,
      Expiry_Date: { $lt: new Date() } // Already expired
    })
    .populate("Manufacturer_ID", "Manufacturer_Name")
    .sort({ Expiry_Date: 1 });
    
    res.json(expiredMedicines);
  } catch (err) {
    console.error("Get expired medicines error:", err);
    res.status(500).json({ 
      message: "Failed to fetch expired medicines",
      error: err.message 
    });
  }
});

// ✅ READ - Get all medicines (optionally filter by Manufacturer_ID)
medicineApp.get("/medicines/:manufacturerId", async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    
    // Validate manufacturer ID format
    if (!mongoose.Types.ObjectId.isValid(manufacturerId)) {
      return res.status(400).json({ message: "Invalid manufacturer ID" });
    }
    
    const medicines = await Medicine.find({ Manufacturer_ID: manufacturerId })
      .populate("Manufacturer_ID", "Manufacturer_Name")
      .sort({ Expiry_Date: 1 });
      
    // Add expiry status
    const medicinesWithStatus = medicines.map(medicine => {
      const medicineObj = medicine.toObject();
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      if (medicine.Expiry_Date < today) {
        medicineObj.expiryStatus = "expired";
        medicineObj.daysUntilExpiry = Math.ceil((medicine.Expiry_Date - today) / (1000 * 60 * 60 * 24));
      } else if (medicine.Expiry_Date <= thirtyDaysFromNow) {
        medicineObj.expiryStatus = "expiring-soon";
        medicineObj.daysUntilExpiry = Math.ceil((medicine.Expiry_Date - today) / (1000 * 60 * 60 * 24));
      } else {
        medicineObj.expiryStatus = "valid";
        medicineObj.daysUntilExpiry = Math.ceil((medicine.Expiry_Date - today) / (1000 * 60 * 60 * 24));
      }
      
      return medicineObj;
    });
    
    res.json(medicinesWithStatus);
  } catch (err) {
    console.error("Get medicines error:", err);
    res.status(500).json({ 
      message: "Failed to fetch medicines",
      error: err.message 
    });
  }
});

// ✅ READ (Single) - Get details of one medicine
medicineApp.get("/medicine/:id", async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id)
      .populate("Manufacturer_ID", "Manufacturer_Name");
      
    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }
    
    // Add expiry status
    const medicineObj = medicine.toObject();
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    if (medicine.Expiry_Date < today) {
      medicineObj.expiryStatus = "expired";
      medicineObj.daysUntilExpiry = Math.ceil((medicine.Expiry_Date - today) / (1000 * 60 * 60 * 24));
    } else if (medicine.Expiry_Date <= thirtyDaysFromNow) {
      medicineObj.expiryStatus = "expiring-soon";
      medicineObj.daysUntilExpiry = Math.ceil((medicine.Expiry_Date - today) / (1000 * 60 * 60 * 24));
    } else {
      medicineObj.expiryStatus = "valid";
      medicineObj.daysUntilExpiry = Math.ceil((medicine.Expiry_Date - today) / (1000 * 60 * 60 * 24));
    }
    
    res.json(medicineObj);
  } catch (err) {
    console.error("Get medicine error:", err);
    res.status(500).json({ 
      message: "Failed to fetch medicine",
      error: err.message 
    });
  }
});

// ✅ UPDATE - Update medicine details
medicineApp.put("/medicine_update/:id", async (req, res) => {
  try {
    const updates = req.body;
    
    // Convert numeric fields if present
    if (updates.Quantity) updates.Quantity = Number(updates.Quantity);
    if (updates.Threshold_Qty) updates.Threshold_Qty = Number(updates.Threshold_Qty);
    
    // Validate expiry date if being updated
    if (updates.Expiry_Date) {
      const expiryDate = new Date(updates.Expiry_Date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (expiryDate <= today) {
        return res.status(400).json({ 
          message: "Expiry date must be in the future" 
        });
      }
      updates.Expiry_Date = expiryDate;
    }
    
    const updatedMedicine = await Medicine.findByIdAndUpdate(
      req.params.id, 
      updates, 
      { new: true, runValidators: true }
    );

    if (!updatedMedicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }
    
    res.json({ 
      message: "Medicine updated successfully", 
      medicine: updatedMedicine 
    });
  } catch (err) {
    console.error("Update medicine error:", err);
    res.status(500).json({ 
      message: "Failed to update medicine",
      error: err.message 
    });
  }
});

// ✅ DELETE - Delete medicine
medicineApp.delete("/medicine_delete/:id/:manufacturerId", async (req, res) => {
  try {
    const { id, manufacturerId } = req.params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(manufacturerId)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Find medicine
    const medicine = await Medicine.findById(id);
    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    // Check if it belongs to the given manufacturer
    if (medicine.Manufacturer_ID.toString() !== manufacturerId) {
      return res.status(403).json({ message: "Not authorized to delete this medicine" });
    }

    // Delete it
    await Medicine.findByIdAndDelete(id);

    res.json({ message: "Medicine deleted successfully" });
  } catch (err) {
    console.error("Error deleting medicine:", err);
    res.status(500).json({ 
      message: "Failed to delete medicine",
      error: err.message 
    });
  }
});

// ✅ GET all medicines (admin view)
medicineApp.get("/all-medicines", async (req, res) => {
  try {
    const medicines = await Medicine.find()
      .populate("Manufacturer_ID", "Manufacturer_Name")
      .sort({ Expiry_Date: 1 });
      
    // Add expiry status to each medicine
    const medicinesWithStatus = medicines.map(medicine => {
      const medicineObj = medicine.toObject();
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      if (medicine.Expiry_Date < today) {
        medicineObj.expiryStatus = "expired";
        medicineObj.daysUntilExpiry = Math.ceil((medicine.Expiry_Date - today) / (1000 * 60 * 60 * 24));
      } else if (medicine.Expiry_Date <= thirtyDaysFromNow) {
        medicineObj.expiryStatus = "expiring-soon";
        medicineObj.daysUntilExpiry = Math.ceil((medicine.Expiry_Date - today) / (1000 * 60 * 60 * 24));
      } else {
        medicineObj.expiryStatus = "valid";
        medicineObj.daysUntilExpiry = Math.ceil((medicine.Expiry_Date - today) / (1000 * 60 * 60 * 24));
      }
      
      return medicineObj;
    });
    
    res.json(medicinesWithStatus);
  } catch (err) {
    console.error("Get all medicines error:", err);
    res.status(500).json({ 
      message: "Failed to fetch medicines",
      error: err.message 
    });
  }
});
medicineApp.get("/all-medicine", async (req, res) => {
  try {

    const medicines = await Medicine.find()
      .select("-Manufacturer_ID")   // ⬅ exclude manufacturer field
      .sort({ Expiry_Date: 1 });

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const medicinesWithStatus = medicines.map(med => {
      const m = med.toObject();

      const daysUntilExpiry = Math.ceil(
        (m.Expiry_Date - today) / (1000 * 60 * 60 * 24)
      );

      if (m.Expiry_Date < today) {
        m.expiryStatus = "expired";
      } 
      else if (m.Expiry_Date <= thirtyDaysFromNow) {
        m.expiryStatus = "expiring-soon";
      } 
      else {
        m.expiryStatus = "valid";
      }

      m.daysUntilExpiry = daysUntilExpiry;

      return m;
    });

    res.json(medicinesWithStatus);

  } catch (err) {
    console.error("Get all medicines error:", err);
    res.status(500).json({
      message: "Failed to fetch medicines",
      error: err.message
    });
  }
});

module.exports = medicineApp;