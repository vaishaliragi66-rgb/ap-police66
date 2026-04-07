const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const DiseaseTypes = require("../models/diseasetypes");
const MasterCategory = require("../models/master_category");
const MasterValue = require("../models/master_value");

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

const getCustomDiseases = async (instituteId, mode) => {
  if (!mongoose.Types.ObjectId.isValid(instituteId)) return [];

  const diseasesCategory = await MasterCategory.findOne({
    Institute_ID: instituteId,
    normalized_name: "diseases"
  }).select("_id");

  if (!diseasesCategory) return [];

  const values = await MasterValue.find({
    Institute_ID: instituteId,
    category_id: diseasesCategory._id,
    status: "Active",
    "meta.kind": "disease"
  }).lean();

  return values
    .filter((item) => {
      const group = String(item?.meta?.group || "").trim();
      if (mode === "cd") return group === "Communicable";
      if (mode === "ncd") return group === "Non-Communicable";
      return group === "Communicable" || group === "Non-Communicable";
    })
    .map((item) => ({
      name: item.value_name,
      category: item?.meta?.group === "Communicable" ? "Communicable Diseases" : "Non-Communicable Diseases",
      type: "Custom"
    }));
};

const extractDiseases = (data, mode) => {
  let diseases = [];

  data.forEach(category => {

    const isCD = category.category === "Communicable Diseases";
    const isNCD = category.category === "Non-Communicable Diseases";

    category.types?.forEach(type => {

      // ✅ COMMUNICABLE (STRICT CHECK)
      if ((mode === "cd" || mode === "all") && isCD) {
        type.diseases?.forEach(d => {
          if (!d.name) return;

          diseases.push({
            name: d.name,
            category: category.category,
            type: type.name
          });
        });
      }

      // ✅ NON-COMMUNICABLE
      if ((mode === "ncd" || mode === "all") && isNCD) {
        type.subgroups?.forEach(sub => {
          sub.diseases?.forEach(d => {
            if (!d.name) return;

            diseases.push({
              name: d.name,
              category: category.category,
              type: type.name,
              subgroup: sub.name
            });
          });
        });
      }

    });
  });

  return diseases;
};
router.get("/cd", async (req, res) => {
  try {
    const data = await DiseaseTypes.find().lean(); // important

    const instituteId = String(req.query.instituteId || "").trim();
    const diseases = extractDiseases(data, "cd");
    const custom = await getCustomDiseases(instituteId, "cd");

    res.json(sortUniqueByName([...diseases, ...custom])); // ✅ THIS LINE MATTERS
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ncd", async (req, res) => {
  try {
    const data = await DiseaseTypes.find();

    const instituteId = String(req.query.instituteId || "").trim();
    const diseases = extractDiseases(data, "ncd");
    const custom = await getCustomDiseases(instituteId, "ncd");

    res.json(sortUniqueByName([...diseases, ...custom]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 DEBUG ROUTE
router.get("/all", async (req, res) => {
  const data = await DiseaseTypes.find();
  console.log("DATA LENGTH:", data.length);
  res.json(data);
});

// 🔹 SEARCH ROUTE (fixed for both CD + NCD)
router.get("/search", async (req, res) => {
  try {
    const { q, category } = req.query;

    const data = await DiseaseTypes.find();

    let results = [];

    data.forEach(main => {
      if (category && main.category !== category) return;

      main.types.forEach(type => {

        // ✅ COMMUNICABLE SEARCH
        if (type.diseases) {
          type.diseases.forEach(disease => {
            if (
              q &&
              disease.name.toLowerCase().includes(q.toLowerCase())
            ) {
              results.push({
                Disease_Name: disease.name,
                Category: main.category
              });
            }
          });
        }

        // ✅ NON-COMMUNICABLE SEARCH
        if (type.subgroups) {
          type.subgroups.forEach(sub => {

            // subgroup match
            if (
              q &&
              sub.name.toLowerCase().includes(q.toLowerCase())
            ) {
              results.push({
                Disease_Name: sub.name,
                Category: main.category
              });
            }

            // diseases inside subgroup
            sub.diseases?.forEach(disease => {
              if (
                q &&
                disease.name.toLowerCase().includes(q.toLowerCase())
              ) {
                results.push({
                  Disease_Name: disease.name,
                  Category: main.category
                });
              }
            });

          });
        }

      });
    });

    // 🔥 REMOVE DUPLICATES
    const unique = [
      ...new Map(results.map(d => [d.Disease_Name, d])).values()
    ];

    res.json(unique.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;