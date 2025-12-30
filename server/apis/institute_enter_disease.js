// routes/diseaseRoutes.js
const express = require("express");
const diseaseApp = express.Router();
const Disease = require("../models/disease");
const FamilyMember = require("../models/family_member");
const Employee = require("../models/employee");

// ➕ Add a new disease record
diseaseApp.post("/diseases", async (req, res) => {
  try {
    // Step 1️⃣ — Create and save the disease record
    const newDisease = new Disease(req.body);
    const savedDisease = await newDisease.save();

    // Step 2️⃣ — If it's for a Family Member
    if (req.body.IsFamilyMember && req.body.FamilyMember_ID) {
      console.log("➡ Updating family member medical history...");

      await FamilyMember.findByIdAndUpdate(
        req.body.FamilyMember_ID,
        {
          $push: {
            Medical_History: {
              Date: new Date(),
              Disease: [savedDisease._id], // ✅ link new disease ID
              Diagnosis: req.body.Description || "",
              Medicines: (req.body.Common_Medicines || []).map((m) => ({
                Medicine_Name: m,
                Quantity: 0,
              })),
              Notes: req.body.Notes || "",
            },
          },
        },
        { new: true }
      );
    }

    // Step 3️⃣ — Otherwise, it's for the Employee themself
    else if (!req.body.IsFamilyMember && req.body.Employee_ID) {
      console.log("➡ Updating employee medical history...");

      await Employee.findByIdAndUpdate(
        req.body.Employee_ID,
        {
          $push: {
            Medical_History: {
              Date: new Date(),
              Disease: [savedDisease._id], // ✅ link new disease ID
              Diagnosis: req.body.Description || "",
              Medicines: (req.body.Common_Medicines || []).map((m) => ({
                Medicine_Name: m,
                Quantity: 0,
              })),
              Notes: req.body.Notes || "",
            },
          },
        },
        { new: true }
      );
    }

    // Step 4️⃣ — Respond to client
    res.status(201).json({
      message: "✅ Disease record added successfully",
      data: savedDisease,
    });
  } catch (err) {
    console.error("❌ Error adding disease:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📋 Get all disease records
diseaseApp.get("/", async (req, res) => {
  try {
    const diseases = await Disease.find()
      .populate("Institute_ID", "Institute_Name")
      .populate("Employee_ID", "Name ABS_NO")
      .populate("FamilyMember_ID", "Name Relationship");
    res.json(diseases);
  } catch (err) {
    console.error("❌ Error fetching diseases:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔍 Get disease by ID
diseaseApp.get("/:id", async (req, res) => {
  try {
    const disease = await Disease.findById(req.params.id)
      .populate("Institute_ID", "Institute_Name")
      .populate("Employee_ID", "Name ABS_NO")
      .populate("FamilyMember_ID", "Name Relationship");

    if (!disease)
      return res.status(404).json({ message: "Disease not found" });

    res.json(disease);
  } catch (err) {
    console.error("❌ Error fetching disease by ID:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔎 Get diseases by category (Communicable / Non-Communicable)
diseaseApp.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const diseases = await Disease.find({ Category: category });
    res.json(diseases);
  } catch (err) {
    console.error("❌ Error fetching diseases by category:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = diseaseApp;
