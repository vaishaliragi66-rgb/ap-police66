const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const { listMasterDiseases } = require("../utils/instituteMasterData");

const sortUniqueByName = (arr) => {
  const seen = new Set();
  const out = [];
  arr.forEach((item) => {
    const name = String(item?.name || item || "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    if (typeof item === "string") {
      out.push({ name });
    } else {
      out.push({ ...item, name });
    }
  });
  return out.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
};

router.get("/cd", async (req, res) => {
  try {
    const instituteId = String(req.query.instituteId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ error: "Valid instituteId is required" });
    }

    const { communicable } = await listMasterDiseases(instituteId);
    res.json(sortUniqueByName((communicable || []).map((name) => ({
      name,
      category: "Communicable Diseases",
      type: "Master Data"
    }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ncd", async (req, res) => {
  try {
    const instituteId = String(req.query.instituteId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ error: "Valid instituteId is required" });
    }

    const { nonCommunicable } = await listMasterDiseases(instituteId);
    res.json(sortUniqueByName((nonCommunicable || []).map((name) => ({
      name,
      category: "Non-Communicable Diseases",
      type: "Master Data"
    }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 DEBUG ROUTE
router.get("/all", async (req, res) => {
  try {
    const instituteId = String(req.query.instituteId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ error: "Valid instituteId is required" });
    }

    const { communicable, nonCommunicable } = await listMasterDiseases(instituteId);
    res.json({
      communicable: sortUniqueByName(communicable || []),
      nonCommunicable: sortUniqueByName(nonCommunicable || [])
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 SEARCH ROUTE (fixed for both CD + NCD)
router.get("/search", async (req, res) => {
  try {
    const { q, category } = req.query;
    const instituteId = String(req.query.instituteId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ error: "Valid instituteId is required" });
    }

    const { communicable, nonCommunicable } = await listMasterDiseases(instituteId);
    const comm = (communicable || []).map((name) => ({
      Disease_Name: name,
      Category: "Communicable Diseases"
    }));
    const nonComm = (nonCommunicable || []).map((name) => ({
      Disease_Name: name,
      Category: "Non-Communicable Diseases"
    }));

    const results = [...comm, ...nonComm].filter((item) => {
      if (category && item.Category !== category) return false;
      if (!q) return true;
      return String(item.Disease_Name || "").toLowerCase().includes(String(q).toLowerCase());
    });

    res.json(results.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
