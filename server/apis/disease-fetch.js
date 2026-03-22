const express = require("express");
const router = express.Router();

const DiseaseTypes = require("../models/diseasetypes");

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

    const diseases = extractDiseases(data, "cd");

    res.json(diseases); // ✅ THIS LINE MATTERS
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ncd", async (req, res) => {
  try {
    const data = await DiseaseTypes.find();

    const diseases = extractDiseases(data, "ncd");

    res.json(diseases);
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