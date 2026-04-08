const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { verifyToken } = require("./instituteAuth");
const MasterCategory = require("../models/master_category");
const MasterValue = require("../models/master_value");
const DiagnosisTest = require("../models/diagnostics_test");
const Medicine = require("../models/master_medicine");
const MainStoreMedicine = require("../models/main_store");

const router = express.Router();
const DISEASES_FILE = path.join(__dirname, "..", "data", "diseases.json");

const DEFAULT_CATEGORIES = [
  "Medicines",
  "Tests",
  "Diseases",
  "Disease Categories",
  "Disease Severity Levels",
  "Relationships",
  "Employee Report Roles",
  "Medicine Types",
  "Dosage Forms",
  "Xray Types",
  "Food Timings",
  "Institute Roles",
  "Issued From Sources",
  "Ledger Transaction Types",
  "Ledger Directions",
  "Rows Per Page",
  "Designations",
  "Blood Groups",
  "Districts",
  "States",
  "Residential Areas",
  "Rank Categories"
];

// Valid test categories from the diagnostic tests catalog
const VALID_TEST_CATEGORIES = [
  "HEMATOLOGY",
  "DIABETES & GLUCOSE",
  "LIPID PROFILE",
  "LIVER FUNCTION TESTS (LFT)",
  "KIDNEY FUNCTION TESTS (KFT)",
  "THYROID PROFILE",
  "ELECTROLYTES",
  "URINALYSIS",
  "CARDIAC MARKERS",
  "VITAMINS & MINERALS",
  "COAGULATION STUDIES",
  "INFECTIOUS DISEASE PANEL",
  "TUMOR MARKERS",
  "HORMONAL PROFILE",
  "BONE HEALTH",
  "IMMUNOLOGY"
];

const DEFAULT_VALUE_SEEDS = {
  "Blood Groups": ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
  "Designations": [
    "HC",
    "ARSI",
    "ASI",
    "RSI",
    "SI",
    "RI",
    "CI",
    "DSP",
    "AC",
    "Adl.Commandant",
    "Adl.SP",
    "SP",
    "COMMANDANT",
    "DIG",
    "IG",
    "ADGP",
    "DGP",
    "AO",
    "SR.Assistant",
    "Jr.Assistant",
    "Superintendent",
    "CLASS IV",
    "Record Assistant",
    "COOK",
    "OTHERS & PC"
  ],
  "Districts": [
    "Hyderabad",
    "Visakhapatnam",
    "Vijayawada",
    "Guntur",
    "Tirupati",
    "Warangal",
    "Karimnagar",
    "Khammam",
    "Nizamabad",
    "Rangareddy",
    "Medak",
    "Srikakulam",
    "Vizianagaram",
    "East Godavari",
    "West Godavari",
    "Krishna",
    "Prakasam",
    "Nellore",
    "Kurnool",
    "Anantapur",
    "Kadapa",
    "Chittoor"
  ],
  "States": [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry"
  ],
  "Tests": [
    "HEMATOLOGY",
    "DIABETES & GLUCOSE",
    "LIPID PROFILE",
    "LIVER FUNCTION TESTS (LFT)",
    "KIDNEY FUNCTION TESTS (KFT)",
    "THYROID PROFILE",
    "ELECTROLYTES",
    "URINALYSIS",
    "CARDIAC MARKERS",
    "VITAMINS & MINERALS",
    "COAGULATION STUDIES",
    "INFECTIOUS DISEASE PANEL",
    "TUMOR MARKERS",
    "HORMONAL PROFILE",
    "BONE HEALTH",
    "IMMUNOLOGY"
  ],
  "Diseases": ["Communicable", "Non-Communicable"],
  "Disease Categories": ["Communicable", "Non-Communicable"],
  "Disease Severity Levels": ["Mild", "Moderate", "Severe", "Chronic"],
  "Relationships": ["Father", "Mother", "Wife", "Husband", "Son", "Daughter"],
  "Employee Report Roles": ["Employee", "Family"],
  "Medicine Types": [
    "Antibiotics",
    "Analgesics",
    "Antipyretics",
    "Antacids",
    "Antihistamines",
    "Vitamins",
    "Antifungals",
    "Antivirals",
    "Others"
  ],
  "Dosage Forms": [
    "Tablet",
    "Capsule",
    "Syrup",
    "Injection",
    "Ointment",
    "Drops",
    "Inhaler",
    "Powder",
    "Other"
  ],
  "Xray Types": [
    "Skull X-ray – AP view",
    "Skull X-ray – Lateral view (Right)",
    "Skull X-ray – Lateral view (Left)",
    "Skull X-ray – Towne view",
    "Sinus X-ray – Waters view (occipitomental)",
    "Sinus X-ray – Caldwell view",
    "Cervical spine X-ray – AP view",
    "Chest X-ray – PA view",
    "Pelvis X-ray – AP view",
    "Abdomen X-ray – Supine view"
  ],
  "Food Timings": ["Before Food", "After Food"],
  "Institute Roles": ["doctor", "pharmacist", "diagnosis", "xray", "front_desk"],
  "Issued From Sources": [
    "Chief Office-Hyderabad",
    "1st Battalion-Yousufguda",
    "2nd Battalion-Asifabad",
    "3rd Battalion-Ibrahimpatnam",
    "4th Battalion-Nampally",
    "5th Battalion-Bhoopalapally",
    "6th Battalion-Kothagudem",
    "7th Battalion-Dichpally",
    "8th Battalion-Kondapur",
    "9th Battalion",
    "10th Battalion-Bachupally",
    "11th Battalion",
    "12th Battalion-Anantapur",
    "13th Battalion-Mancherial",
    "14th Battalion",
    "15th Battalion-Sattupally",
    "16th Battalion",
    "17th Battalion-Siricilla",
    "PTC - Warangal",
    "PTC - Karimnagar",
    "PTC - Medchal",
    "SAR CPL-Amberpet",
    "CAR-Gachibowli",
    "RBVRR TSPA",
    "GREYHOUNDS",
    "OCTOPUS"
  ],
  "Ledger Transaction Types": [
    "MAINSTORE_ADD",
    "STORE_TRANSFER",
    "PRESCRIPTION_ISSUE",
    "SUBSTORE_ADD"
  ],
  "Ledger Directions": ["IN", "OUT"],
  "Rows Per Page": ["5", "10", "25", "50", "100"],
  "Medicines": [
    { value_name: "Paracetamol", meta: { kind: "medicine", medicineType: "Antipyretics", dosageForm: "Tablet", strength: "500mg" } },
    { value_name: "Amoxicillin", meta: { kind: "medicine", medicineType: "Antibiotics", dosageForm: "Capsule", strength: "500mg" } },
    { value_name: "Ibuprofen", meta: { kind: "medicine", medicineType: "Analgesics", dosageForm: "Tablet", strength: "400mg" } },
    { value_name: "Vitamin D", meta: { kind: "medicine", medicineType: "Vitamins", dosageForm: "Tablet", strength: "60000 IU" } }
  ],
  "Residential Areas": [
    "Hyderabad",
    "Secunderabad",
    "Jubilee Hills",
    "Banjara Hills",
    "Begumpet",
    "Madhapur",
    "Gachibowli",
    "Ameerpet",
    "Kukatpally",
    "Hitech City",
    "MG Road",
    "100 Feet Road"
  ],
  "Rank Categories": [
    "Constable",
    "Head Constable",
    "Assistant Sub Inspector",
    "Sub-Inspector",
    "Inspector",
    "Deputy Superintendent of Police",
    "Superintendent of Police"
  ]
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const sortUnique = (arr) => {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((item) => String(item || "").trim()).filter(Boolean))].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const requireInstituteAdmin = (req, res, next) => {
  if (req.user?.role !== "institute") {
    return res.status(403).json({ message: "Only institute admin can modify master data" });
  }
  next();
};

const ensureDefaultCategories = async (instituteId) => {
  const existing = await MasterCategory.find({ Institute_ID: instituteId }).select("normalized_name");
  const existingSet = new Set(existing.map((item) => item.normalized_name));

  const docs = DEFAULT_CATEGORIES
    .filter((name) => !existingSet.has(normalize(name)))
    .map((category_name) => ({
      Institute_ID: instituteId,
      category_name,
      normalized_name: normalize(category_name),
      status: "Active"
    }));

  if (docs.length) {
    await MasterCategory.insertMany(docs, { ordered: false });
  }
};

const ensureDefaultValues = async (instituteId) => {
  const categories = await MasterCategory.find({ Institute_ID: instituteId }).select("_id category_name normalized_name");
  if (!categories.length) {
    return;
  }

  const existingValues = await MasterValue.find({ Institute_ID: instituteId }).select("category_id normalized_value");
  const existingByCategory = new Map();

  existingValues.forEach((item) => {
    const key = String(item.category_id);
    if (!existingByCategory.has(key)) {
      existingByCategory.set(key, new Set());
    }
    existingByCategory.get(key).add(item.normalized_value);
  });

  const docs = [];

  categories.forEach((category) => {
    const seedValues = DEFAULT_VALUE_SEEDS[category.category_name] || [];
    const existingSet = existingByCategory.get(String(category._id)) || new Set();

    seedValues.forEach((seedItem) => {
      const value_name = String(
        typeof seedItem === "string" ? seedItem : seedItem?.value_name || ""
      ).trim();
      if (!value_name) return;

      const normalized_value = normalize(value_name);
      if (existingSet.has(normalized_value)) {
        return;
      }

      const meta =
        seedItem && typeof seedItem === "object" && !Array.isArray(seedItem)
          ? seedItem.meta || {}
          : {};

      docs.push({
        Institute_ID: instituteId,
        category_id: category._id,
        value_name,
        normalized_value,
        status: "Active",
        meta
      });
    });
  });

  if (docs.length) {
    await MasterValue.insertMany(docs, { ordered: false });
  }
};

const getCategoryByName = async (instituteId, categoryName) => {
  return MasterCategory.findOne({
    Institute_ID: instituteId,
    normalized_name: normalize(categoryName)
  });
};

router.get("/public-map", async (req, res) => {
  try {
    const instituteId = String(req.query.instituteId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: "Valid instituteId is required" });
    }

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const categories = await MasterCategory.find({ Institute_ID: instituteId, status: "Active" });
    const values = await MasterValue.find({ Institute_ID: instituteId, status: "Active" });

    const categoryNameById = new Map(categories.map((c) => [String(c._id), c.category_name]));
    const result = {};

    categories.forEach((cat) => {
      result[cat.category_name] = [];
    });

    values.forEach((item) => {
      const categoryName = categoryNameById.get(String(item.category_id));
      if (!categoryName) return;
      result[categoryName].push({
        id: item._id,
        value_name: item.value_name,
        meta: item.meta || {}
      });
    });

    Object.keys(result).forEach((key) => {
      result[key].sort((a, b) => a.value_name.localeCompare(b.value_name));
    });

    res.json(result);
  } catch (err) {
    console.error("GET /master-data-api/public-map error", err);
    res.status(500).json({ message: "Failed to load public master data", error: err.message });
  }
});

router.get("/categories", verifyToken, async (req, res) => {
  try {
    const instituteId = req.user?.instituteId;
    if (!instituteId) {
      return res.status(400).json({ message: "Institute id missing in token" });
    }

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);
    const categories = await MasterCategory.find({ Institute_ID: instituteId }).sort({ category_name: 1 });
    res.json(categories);
  } catch (err) {
    console.error("GET /master-data-api/categories error", err);
    res.status(500).json({ message: "Failed to load categories", error: err.message });
  }
});

router.post("/categories", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = String(req.user?.instituteId || req.query?.instituteId || req.headers['x-institute-id'] || "").trim();
    if (!instituteId) {
      return res.status(400).json({ message: "Institute id missing in request (provide via token or ?instituteId)" });
    }
    const categoryName = String(req.body.category_name || "").trim();

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const normalizedName = normalize(categoryName);

    const existing = await MasterCategory.findOne({
      Institute_ID: instituteId,
      normalized_name: normalizedName
    });

    if (existing) {
      return res.status(409).json({ message: "Category already exists" });
    }

    const created = await MasterCategory.create({
      Institute_ID: instituteId,
      category_name: categoryName,
      normalized_name: normalizedName,
      status: "Active"
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /master-data-api/categories error", err);
    res.status(500).json({ message: "Failed to create category", error: err.message });
  }
});

router.put("/categories/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const { id } = req.params;
    const categoryName = String(req.body.category_name || "").trim();
    const status = req.body.status;

    const category = await MasterCategory.findOne({ _id: id, Institute_ID: instituteId });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (categoryName) {
      const normalizedName = normalize(categoryName);
      const duplicate = await MasterCategory.findOne({
        _id: { $ne: id },
        Institute_ID: instituteId,
        normalized_name: normalizedName
      });
      if (duplicate) {
        return res.status(409).json({ message: "Category already exists" });
      }
      category.category_name = categoryName;
      category.normalized_name = normalizedName;
    }

    if (status === "Active" || status === "Inactive") {
      category.status = status;
    }

    await category.save();
    res.json(category);
  } catch (err) {
    console.error("PUT /master-data-api/categories/:id error", err);
    res.status(500).json({ message: "Failed to update category", error: err.message });
  }
});

router.delete("/categories/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const { id } = req.params;

    const category = await MasterCategory.findOne({ _id: id, Institute_ID: instituteId });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await MasterValue.deleteMany({ Institute_ID: instituteId, category_id: category._id });
    await category.deleteOne();

    res.json({ message: "Category and related values deleted" });
  } catch (err) {
    console.error("DELETE /master-data-api/categories/:id error", err);
    res.status(500).json({ message: "Failed to delete category", error: err.message });
  }
});

router.get("/values", verifyToken, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const { categoryId, status } = req.query;

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const query = { Institute_ID: instituteId };

    if (categoryId) {
      query.category_id = categoryId;
    }

    if (status && ["Active", "Inactive"].includes(status)) {
      query.status = status;
    }

    const values = await MasterValue.find(query)
      .populate("category_id", "category_name")
      .sort({ value_name: 1 });

    res.json(values);
  } catch (err) {
    console.error("GET /master-data-api/values error", err);
    res.status(500).json({ message: "Failed to load values", error: err.message });
  }
});

router.post("/values", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const categoryId = String(req.body.category_id || "").trim();
    const valueName = String(req.body.value_name || "").trim();

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Valid category_id is required" });
    }

    if (!valueName) {
      return res.status(400).json({ message: "value_name is required" });
    }

    const category = await MasterCategory.findOne({ _id: categoryId, Institute_ID: instituteId });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const normalizedValue = normalize(valueName);

    const duplicate = await MasterValue.findOne({
      Institute_ID: instituteId,
      category_id: categoryId,
      normalized_value: normalizedValue
    });

    if (duplicate) {
      return res.status(409).json({ message: "Value already exists in this category" });
    }

    const created = await MasterValue.create({
      Institute_ID: instituteId,
      category_id: categoryId,
      value_name: valueName,
      normalized_value: normalizedValue,
      status: req.body.status === "Inactive" ? "Inactive" : "Active",
      meta: req.body.meta || {}
    });

    const populated = await MasterValue.findById(created._id).populate("category_id", "category_name");
    res.status(201).json(populated);
  } catch (err) {
    console.error("POST /master-data-api/values error", err);
    res.status(500).json({ message: "Failed to create value", error: err.message });
  }
});

router.put("/values/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const { id } = req.params;
    const valueName = String(req.body.value_name || "").trim();
    const status = req.body.status;

    const valueDoc = await MasterValue.findOne({ _id: id, Institute_ID: instituteId });
    if (!valueDoc) {
      return res.status(404).json({ message: "Value not found" });
    }

    if (valueName) {
      const normalizedValue = normalize(valueName);
      const duplicate = await MasterValue.findOne({
        _id: { $ne: id },
        Institute_ID: instituteId,
        category_id: valueDoc.category_id,
        normalized_value: normalizedValue
      });
      if (duplicate) {
        return res.status(409).json({ message: "Value already exists in this category" });
      }
      valueDoc.value_name = valueName;
      valueDoc.normalized_value = normalizedValue;
    }

    if (status === "Active" || status === "Inactive") {
      valueDoc.status = status;
    }

    if (req.body.meta && typeof req.body.meta === "object") {
      valueDoc.meta = req.body.meta;
    }

    await valueDoc.save();
    const populated = await MasterValue.findById(valueDoc._id).populate("category_id", "category_name");
    res.json(populated);
  } catch (err) {
    console.error("PUT /master-data-api/values/:id error", err);
    res.status(500).json({ message: "Failed to update value", error: err.message });
  }
});

router.delete("/values/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const { id } = req.params;

    const valueDoc = await MasterValue.findOne({ _id: id, Institute_ID: instituteId });
    if (!valueDoc) {
      return res.status(404).json({ message: "Value not found" });
    }

    await valueDoc.deleteOne();
    res.json({ message: "Value deleted" });
  } catch (err) {
    console.error("DELETE /master-data-api/values/:id error", err);
    res.status(500).json({ message: "Failed to delete value", error: err.message });
  }
});

router.get("/active-map", verifyToken, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const categories = await MasterCategory.find({ Institute_ID: instituteId, status: "Active" });
    const values = await MasterValue.find({ Institute_ID: instituteId, status: "Active" });

    const categoryNameById = new Map(categories.map((c) => [String(c._id), c.category_name]));
    const result = {};

    categories.forEach((cat) => {
      result[cat.category_name] = [];
    });

    values.forEach((item) => {
      const categoryName = categoryNameById.get(String(item.category_id));
      if (!categoryName) return;
      result[categoryName].push({
        id: item._id,
        value_name: item.value_name,
        meta: item.meta || {}
      });
    });

    Object.keys(result).forEach((key) => {
      result[key].sort((a, b) => a.value_name.localeCompare(b.value_name));
    });

    res.json(result);
  } catch (err) {
    console.error("GET /master-data-api/active-map error", err);
    res.status(500).json({ message: "Failed to load active master data", error: err.message });
  }
});

router.get("/tests-structure", verifyToken, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const testsCategory = await getCategoryByName(instituteId, "Tests");
    const customValues = testsCategory
      ? await MasterValue.find({
          Institute_ID: instituteId,
          category_id: testsCategory._id,
          status: "Active"
        }).lean()
      : [];

    const dbTests = await DiagnosisTest.find().sort({ Group: 1, Test_Name: 1 }).lean();

    // Build set of valid categories
    const validCategoriesSet = new Set(VALID_TEST_CATEGORIES);
    
    // Get custom test category names
    const customCategoryNames = new Set();
    customValues
      .filter((value) => value?.meta?.kind === "category")
      .forEach((value) => {
        if (value.value_name) {
          customCategoryNames.add(String(value.value_name).trim());
        }
      });

    // Build set of categories: static + custom only
    const categoriesSet = new Set();
    
    // Add all valid static categories
    validCategoriesSet.forEach(cat => categoriesSet.add(cat));
    
    // Add custom categories
    customCategoryNames.forEach(cat => categoriesSet.add(cat));
    
    // Also check DiagnosisTest for categories that match our valid list or are custom
    dbTests.forEach((test) => {
      const group = String(test.Group || "").trim();
      if (group && (validCategoriesSet.has(group) || customCategoryNames.has(group))) {
        categoriesSet.add(group);
      }
    });

    const testsByCategory = {};
    const seenByCategory = new Map();

    [...categoriesSet].forEach((category) => {
      testsByCategory[category] = [];
      seenByCategory.set(category, new Set());
    });

    // Add tests from DiagnosisTest - only for valid categories
    dbTests.forEach((test) => {
      const category = String(test.Group || "").trim();
      const testName = String(test.Test_Name || "").trim();
      
      // Only add if category is valid (static or custom)
      if (!category || !testsByCategory.hasOwnProperty(category)) {
        if (test.Group && test.Group.length > 0) {
          console.warn(`Skipping test "${testName}" - invalid category "${category}"`);
        }
        return;
      }
      
      if (!testName) return;

      const key = normalize(testName);
      if (seenByCategory.get(category).has(key)) return;
      seenByCategory.get(category).add(key);
      
      testsByCategory[category].push({
        id: test._id,
        name: testName,
        reference: test.Reference_Range || "",
        unit: test.Units || "",
        source: "diagnosis-test"
      });
    });

    // Add custom test entries from MasterValue
    customValues
      .filter((value) => value?.meta?.kind === "test")
      .forEach((value) => {
        const category = String(value?.meta?.category || "").trim();
        const testName = String(value.value_name || "").trim();
        
        if (!category || !testName) return;
        
        // Only add if category exists in our valid set
        if (!testsByCategory[category]) {
          console.warn(`Skipping custom test "${testName}" - invalid category "${category}"`);
          return;
        }
        
        const key = normalize(testName);
        if (seenByCategory.get(category).has(key)) return;
        seenByCategory.get(category).add(key);
        
        testsByCategory[category].push({
          id: value._id,
          name: testName,
          reference: value?.meta?.reference || "",
          unit: value?.meta?.unit || "",
          source: "master"
        });
      });

    // Sort tests within each category
    Object.keys(testsByCategory).forEach((category) => {
      testsByCategory[category].sort((a, b) => 
        String(a.name || "").localeCompare(String(b.name || ""))
      );
    });

    const categories = Object.keys(testsByCategory).sort((a, b) => 
      a.localeCompare(b)
    );
    
    const totalTests = Object.values(testsByCategory).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`Tests structure loaded: ${categories.length} categories, ${totalTests} total tests`);
    
    res.json({ categories, testsByCategory });
  } catch (err) {
    console.error("GET /master-data-api/tests-structure error", err);
    res.status(500).json({ message: "Failed to load tests structure", error: err.message });
  }
});

router.post("/tests/category", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const categoryName = String(req.body.name || "").trim();

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);
    const testsCategory = await getCategoryByName(instituteId, "Tests");
    if (!testsCategory) {
      return res.status(404).json({ message: "Tests category not found" });
    }

    const duplicate = await MasterValue.findOne({
      Institute_ID: instituteId,
      category_id: testsCategory._id,
      normalized_value: normalize(categoryName),
      "meta.kind": "category"
    });

    if (duplicate) {
      return res.status(409).json({ message: "Test category already exists" });
    }

    const created = await MasterValue.create({
      Institute_ID: instituteId,
      category_id: testsCategory._id,
      value_name: categoryName,
      normalized_value: normalize(categoryName),
      status: "Active",
      meta: { kind: "category" }
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /master-data-api/tests/category error", err);
    res.status(500).json({ message: "Failed to create test category", error: err.message });
  }
});

router.delete("/tests/category/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const { id } = req.params;

    if (!id || id === "undefined") {
      return res.status(400).json({ message: "Invalid category ID provided" });
    }

    const testsCategory = await getCategoryByName(instituteId, "Tests");
    if (!testsCategory) {
      console.warn(`Tests category not found for institute ${instituteId}`);
      return res.status(404).json({ message: "Tests category not found" });
    }

    // Find the category to delete
    const categoryValue = await MasterValue.findOne({
      _id: id,
      Institute_ID: instituteId,
      category_id: testsCategory._id,
      "meta.kind": "category"
    });

    if (!categoryValue) {
      console.warn(`Test category not found: id=${id}, category_id=${testsCategory._id}`);
      return res.status(404).json({ message: "Test category not found or is not a custom category" });
    }

    const categoryName = String(categoryValue.value_name || "").trim();
    console.log(`Deleting test category: ${categoryName} (ID: ${id})`);

    // Delete the category itself
    await MasterValue.deleteOne({
      _id: categoryValue._id
    });

    // Delete all tests in this category
    const deleteResult = await MasterValue.deleteMany({
      Institute_ID: instituteId,
      category_id: testsCategory._id,
      $or: [
        { "meta.category": categoryName },
        { "meta.categoryNormalized": normalize(categoryName) }
      ]
    });

    console.log(`Deleted ${deleteResult.deletedCount} tests from category ${categoryName}`);

    // Also delete from DiagnosisTest if it exists
    const diagnosisDeleteResult = await DiagnosisTest.deleteMany({
      Group: { $regex: `^${escapeRegex(categoryName)}$`, $options: "i" }
    }).catch(err => {
      console.warn("DiagnosisTest deletion failed (may not exist):", err.message);
      return { deletedCount: 0 };
    });

    console.log(`Deleted ${diagnosisDeleteResult.deletedCount} diagnosis tests from group ${categoryName}`);

    res.json({ 
      message: "Test category deleted successfully",
      categoryName,
      testsDeleted: deleteResult.deletedCount,
      diagnosisTestsDeleted: diagnosisDeleteResult.deletedCount
    });
  } catch (err) {
    console.error("DELETE /master-data-api/tests/category/:id error", err);
    res.status(500).json({ 
      message: "Failed to delete test category", 
      error: err.message 
    });
  }
});

router.post("/tests", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const category = String(req.body.category || "").trim();
    const testName = String(req.body.testName || "").trim();
    const referenceRange = String(req.body.referenceRange || "").trim();
    const unit = String(req.body.unit || "").trim();

    if (!category || !testName) {
      return res.status(400).json({ message: "Both category and testName are required" });
    }

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);
    const testsCategory = await getCategoryByName(instituteId, "Tests");
    if (!testsCategory) {
      return res.status(404).json({ message: "Tests category not found" });
    }

    const categoryExists = await MasterValue.findOne({
      Institute_ID: instituteId,
      category_id: testsCategory._id,
      normalized_value: normalize(category),
      "meta.kind": "category"
    });

    if (!categoryExists) {
      await MasterValue.create({
        Institute_ID: instituteId,
        category_id: testsCategory._id,
        value_name: category,
        normalized_value: normalize(category),
        status: "Active",
        meta: { kind: "category" }
      });
    }

    const existingTest = await DiagnosisTest.findOne({
      Test_Name: { $regex: `^${escapeRegex(testName)}$`, $options: "i" }
    });

    if (existingTest) {
      existingTest.Group = category;
      if (referenceRange) existingTest.Reference_Range = referenceRange;
      if (unit) existingTest.Units = unit;
      await existingTest.save();
    } else {
      await DiagnosisTest.create({
        Test_Name: testName,
        Group: category,
        Reference_Range: referenceRange,
        Units: unit
      });
    }

    const duplicateMasterTest = await MasterValue.findOne({
      Institute_ID: instituteId,
      category_id: testsCategory._id,
      normalized_value: normalize(testName),
      "meta.kind": "test",
      "meta.categoryNormalized": normalize(category)
    });

    if (!duplicateMasterTest) {
      await MasterValue.create({
        Institute_ID: instituteId,
        category_id: testsCategory._id,
        value_name: testName,
        normalized_value: normalize(testName),
        status: "Active",
        meta: {
          kind: "test",
          category,
          categoryNormalized: normalize(category),
          reference: referenceRange,
          unit
        }
      });
    }

    res.status(201).json({ message: "Test added successfully" });
  } catch (err) {
    console.error("POST /master-data-api/tests error", err);
    res.status(500).json({ message: "Failed to add test", error: err.message });
  }
});

router.get("/diseases-structure", verifyToken, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    let communicable = [];
    let nonCommunicable = [];

    if (fs.existsSync(DISEASES_FILE)) {
      const raw = fs.readFileSync(DISEASES_FILE, "utf8");
      const data = JSON.parse(raw || "{}");
      communicable = sortUnique(data.communicable || []);
      nonCommunicable = sortUnique(data.nonCommunicable || []);
    }

    const diseasesCategory = await getCategoryByName(instituteId, "Diseases");
    const customValues = diseasesCategory
      ? await MasterValue.find({
          Institute_ID: instituteId,
          category_id: diseasesCategory._id,
          status: "Active",
          "meta.kind": "disease"
        }).lean()
      : [];

    customValues.forEach((value) => {
      const group = String(value?.meta?.group || "").trim();
      if (group === "Communicable") communicable.push(value.value_name);
      if (group === "Non-Communicable") nonCommunicable.push(value.value_name);
    });

    communicable = sortUnique(communicable);
    nonCommunicable = sortUnique(nonCommunicable);
    const all = sortUnique([...communicable, ...nonCommunicable]);

    res.json({
      groups: ["Communicable", "Non-Communicable"],
      communicable,
      nonCommunicable,
      all
    });
  } catch (err) {
    console.error("GET /master-data-api/diseases-structure error", err);
    res.status(500).json({ message: "Failed to load diseases structure", error: err.message });
  }
});

// Temporary debug route - returns default seeded medicines without requiring instituteId
router.get("/medicines-debug", async (req, res) => {
  try {
    const medicineDefaults = DEFAULT_VALUE_SEEDS["Medicines"] || [];
    const medicineTypes = DEFAULT_VALUE_SEEDS["Medicine Types"] || [];
    const dosageForms = DEFAULT_VALUE_SEEDS["Dosage Forms"] || [];
    const medicines = medicineDefaults.map((m, idx) => ({
      _id: m._id || `default-${idx}`,
      value_name: m.value_name || m,
      medicineType: m.meta?.medicineType || "",
      dosageForm: m.meta?.dosageForm || "",
      strength: m.meta?.strength || "",
      status: m.status || "Active"
    }));

    return res.json({
      success: true,
      data: {
        medicineTypes: Array.isArray(medicineTypes) ? medicineTypes : [],
        dosageForms: Array.isArray(dosageForms) ? dosageForms : [],
        medicineTypeEntries: (Array.isArray(medicineTypes) ? medicineTypes : []).map((t) => ({ _id: null, value_name: t, status: "Active" })),
        medicines,
        medicinesByType: {}
      }
    });
  } catch (err) {
    console.error("GET /master-data-api/medicines-debug error", err);
    res.status(500).json({ success: false, message: "Failed to load debug medicines", error: err?.message || String(err) });
  }
});

// Public endpoint: returns medicines structure for an institute.
// Accepts instituteId via token (verifyToken) or via query param `?instituteId=` or header `x-institute-id` for unauthenticated requests.
router.get("/medicines-structure", async (req, res) => {
  try {
    // defensively extract instituteId (token, query param, or header)
    let instituteId = "";
    try {
      instituteId = String(req.user?.instituteId || req.query?.instituteId || req.headers["x-institute-id"] || "").trim();
    } catch (e) {
      instituteId = "";
    }

    // If no valid instituteId provided, return default seeded medicines so UI can still display values
    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      const medicineDefaults = DEFAULT_VALUE_SEEDS["Medicines"] || [];
      const medicineTypes = DEFAULT_VALUE_SEEDS["Medicine Types"] || [];
      const dosageForms = DEFAULT_VALUE_SEEDS["Dosage Forms"] || [];

      const medicines = (medicineDefaults || []).map((m, idx) => ({
        _id: m._id || `default-${idx}`,
        value_name: m.value_name || m,
        medicineType: m.meta?.medicineType || "",
        dosageForm: m.meta?.dosageForm || "",
        strength: m.meta?.strength || "",
        status: m.status || "Active"
      }));

      return res.json({
        success: true,
        data: {
          medicineTypes: Array.isArray(medicineTypes) ? medicineTypes : [],
          dosageForms: Array.isArray(dosageForms) ? dosageForms : [],
          medicineTypeEntries: (Array.isArray(medicineTypes) ? medicineTypes : []).map((t) => ({ _id: null, value_name: t, status: "Active" })),
          medicines,
          medicinesByType: {}
        }
      });
    }

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const medicinesCategory = await getCategoryByName(instituteId, "Medicines");
    const medicineTypesCategory = await getCategoryByName(instituteId, "Medicine Types");

    const [medicineValues, medicineTypeValues, subStoreRows, mainStoreRows] = await Promise.all([
      medicinesCategory
        ? MasterValue.find({
            Institute_ID: instituteId,
            category_id: medicinesCategory._id
          }).lean()
        : Promise.resolve([]),
      medicineTypesCategory
        ? MasterValue.find({
            Institute_ID: instituteId,
            category_id: medicineTypesCategory._id
          }).lean()
        : Promise.resolve([]),
      Medicine.find({ Institute_ID: instituteId })
        .select("Medicine_Name Type Strength")
        .lean()
        .catch(() => []),
      MainStoreMedicine.find({ Institute_ID: instituteId })
        .select("Medicine_Name Type Strength")
        .lean()
        .catch(() => [])
    ]);

    const defaultTypes = Array.isArray(DEFAULT_VALUE_SEEDS["Medicine Types"])
      ? DEFAULT_VALUE_SEEDS["Medicine Types"]
      : [];
    const defaultDosageForms = Array.isArray(DEFAULT_VALUE_SEEDS["Dosage Forms"])
      ? DEFAULT_VALUE_SEEDS["Dosage Forms"]
      : [];

    const dosageFormsCategory = await getCategoryByName(instituteId, "Dosage Forms");
    const dosageFormValues = dosageFormsCategory
      ? await MasterValue.find({
          Institute_ID: instituteId,
          category_id: dosageFormsCategory._id
        }).lean()
      : [];

    const typeMetaByName = new Map();
    medicineTypeValues.forEach((row) => {
      const typeName = String(row?.value_name || "").trim();
      if (!typeName) return;
      const key = normalize(typeName);
      if (!typeMetaByName.has(key)) {
        typeMetaByName.set(key, {
          _id: row?._id || null,
          value_name: typeName,
          status: row?.status || "Active"
        });
      }
    });

    const hintsByMedicineName = new Map();
    const addHint = (name, medicineType, dosageForm, strength) => {
      const normalizedName = normalize(name);
      if (!normalizedName) return;
      if (!hintsByMedicineName.has(normalizedName)) {
        hintsByMedicineName.set(normalizedName, []);
      }
      const bucket = hintsByMedicineName.get(normalizedName);
      const hintMedicineType = String(medicineType || "").trim() || "Others";
      const hintDosageForm = String(dosageForm || "").trim() || "Other";
      const hintStrength = String(strength || "").trim();
      const dedupeKey = `${normalize(hintMedicineType)}::${normalize(hintDosageForm)}::${normalize(hintStrength)}`;
      if (!bucket.some((item) => item.key === dedupeKey)) {
        bucket.push({
          key: dedupeKey,
          medicineType: hintMedicineType,
          dosageForm: hintDosageForm,
          strength: hintStrength
        });
      }
    };

    medicineValues.forEach((row) => {
      const name = String(row?.value_name || "").trim();
      if (!name) return;
      if (row?.meta?.kind === "medicine") {
        addHint(
          name,
          row?.meta?.medicineType || row?.meta?.medicine_type || row?.meta?.typeCategory,
          row?.meta?.dosageForm || row?.meta?.dosage_form || row?.meta?.form,
          row?.meta?.strength
        );
      }
    });

    [...subStoreRows, ...mainStoreRows].forEach((row) => {
      addHint(row?.Medicine_Name, "", row?.Type, row?.Strength);
    });

    const medicineRows = [];
    medicineValues.forEach((row) => {
      const name = String(row?.value_name || "").trim();
      if (!name) return;

      if (row?.meta?.kind === "medicine") {
        medicineRows.push({
          _id: row?._id || null,
          value_name: name,
          medicineType:
            String(
              row?.meta?.medicineType || row?.meta?.medicine_type || row?.meta?.typeCategory || ""
            ).trim() || "Others",
          dosageForm:
            String(row?.meta?.dosageForm || row?.meta?.dosage_form || row?.meta?.form || "").trim() || "Other",
          strength: String(row?.meta?.strength || "").trim(),
          status: row?.status || "Active"
        });
        return;
      }

      const hints = hintsByMedicineName.get(normalize(name)) || [];
      if (hints.length === 0) {
        medicineRows.push({
          _id: row?._id || null,
          value_name: name,
          medicineType: "Others",
          dosageForm: "Other",
          strength: "",
          status: row?.status || "Active"
        });
        return;
      }

      hints.forEach((hint) => {
        medicineRows.push({
          _id: row?._id || null,
          value_name: name,
          medicineType: hint.medicineType || "Others",
          dosageForm: hint.dosageForm || "Other",
          strength: hint.strength || "",
          status: row?.status || "Active"
        });
      });
    });

    [...subStoreRows, ...mainStoreRows].forEach((row) => {
      const name = String(row?.Medicine_Name || "").trim();
      if (!name) return;
      medicineRows.push({
        _id: null,
        value_name: name,
        medicineType: "Others",
        dosageForm: String(row?.Type || "").trim() || "Other",
        strength: String(row?.Strength || "").trim(),
        status: "Active"
      });
    });

    const seenMedicine = new Set();
    const medicines = (medicineRows || [])
      .filter((item) => String(item?.value_name || "").trim())
      .filter((item) => {
        const key = `${normalize(item.medicineType)}::${normalize(item.dosageForm)}::${normalize(item.value_name)}::${normalize(item.strength)}`;
        if (seenMedicine.has(key)) return false;
        seenMedicine.add(key);
        return true;
      })
      .sort((a, b) => String(a.value_name || "").localeCompare(String(b.value_name || "")));

    const medicineTypes = sortUnique([
      ...defaultTypes,
      ...medicineTypeValues.map((row) => row?.value_name),
      ...medicines.map((item) => item?.medicineType)
    ]);

    const dosageForms = sortUnique([
      ...defaultDosageForms,
      ...dosageFormValues.map((row) => row?.value_name),
      ...medicines.map((item) => item?.dosageForm)
    ]);

    const medicineTypeEntries = medicineTypes.map((type) => {
      const meta = typeMetaByName.get(normalize(type));
      return {
        _id: meta?._id || null,
        value_name: type,
        status: meta?.status || "Active"
      };
    });

    const medicinesByType = {};
    medicineTypes.forEach((type) => {
      medicinesByType[type] = medicines
        .filter((item) => normalize(item.medicineType) === normalize(type))
        .sort((a, b) => String(a.value_name || "").localeCompare(String(b.value_name || "")));
    });

    return res.json({
      success: true,
      data: {
        medicineTypes: Array.isArray(medicineTypes) ? medicineTypes : [],
        dosageForms: Array.isArray(dosageForms) ? dosageForms : [],
        medicineTypeEntries: Array.isArray(medicineTypeEntries) ? medicineTypeEntries : [],
        medicines: Array.isArray(medicines) ? medicines : [],
        medicinesByType: medicinesByType || {}
      }
    });
  } catch (err) {
    console.error("GET /master-data-api/medicines-structure error", err?.stack || err);
    res.status(500).json({ success: false, message: "Failed to load medicines structure", error: err?.message || String(err) });
  }
});

router.post("/diseases", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const group = String(req.body.group || "").trim();
    const diseaseName = String(req.body.diseaseName || "").trim();

    if (!["Communicable", "Non-Communicable"].includes(group)) {
      return res.status(400).json({ message: "group must be Communicable or Non-Communicable" });
    }
    if (!diseaseName) {
      return res.status(400).json({ message: "diseaseName is required" });
    }

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);
    const diseasesCategory = await getCategoryByName(instituteId, "Diseases");
    if (!diseasesCategory) {
      return res.status(404).json({ message: "Diseases category not found" });
    }

    const duplicate = await MasterValue.findOne({
      Institute_ID: instituteId,
      category_id: diseasesCategory._id,
      normalized_value: normalize(diseaseName),
      "meta.kind": "disease",
      "meta.group": group
    });

    if (duplicate) {
      return res.status(409).json({ message: "Disease already exists in this group" });
    }

    const created = await MasterValue.create({
      Institute_ID: instituteId,
      category_id: diseasesCategory._id,
      value_name: diseaseName,
      normalized_value: normalize(diseaseName),
      status: "Active",
      meta: {
        kind: "disease",
        group
      }
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /master-data-api/diseases error", err);
    res.status(500).json({ message: "Failed to add disease", error: err.message });
  }
});

router.post("/medicines", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const medicineName = String(req.body.medicineName || "").trim();
    const medicineType = String(req.body.medicineType || "").trim();
    const dosageForm = String(req.body.dosageForm || "").trim();
    const strength = String(req.body.strength || "").trim();

    if (!medicineName) {
      return res.status(400).json({ message: "medicineName is required" });
    }
    if (!medicineType) {
      return res.status(400).json({ message: "medicineType is required" });
    }
    if (!dosageForm) {
      return res.status(400).json({ message: "dosageForm is required" });
    }
    if (!strength) {
      return res.status(400).json({ message: "strength is required" });
    }

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const medicinesCategory = await getCategoryByName(instituteId, "Medicines");
    if (!medicinesCategory) {
      return res.status(404).json({ message: "Medicines category not found" });
    }

    // Check for duplicate (same name + type + strength combination)
    const duplicate = await MasterValue.findOne({
      Institute_ID: instituteId,
      category_id: medicinesCategory._id,
      normalized_value: normalize(medicineName),
      "meta.kind": "medicine",
      "meta.medicineType": medicineType,
      "meta.dosageForm": dosageForm,
      "meta.strength": strength
    });

    if (duplicate) {
      return res.status(409).json({ message: "Medicine with this type and strength already exists" });
    }

    const created = await MasterValue.create({
      Institute_ID: instituteId,
      category_id: medicinesCategory._id,
      value_name: medicineName,
      normalized_value: normalize(medicineName),
      status: "Active",
      meta: {
        kind: "medicine",
        medicineType,
        dosageForm,
        type: dosageForm,
        strength: strength,
        typeNormalized: normalize(medicineType)
      }
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /master-data-api/medicines error", err);
    res.status(500).json({ message: "Failed to add medicine", error: err.message });
  }
});

router.post("/medicines/type", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const typeName = String(req.body.name || "").trim();

    if (!typeName) {
      return res.status(400).json({ message: "name is required" });
    }

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const medicineTypesCategory = await getCategoryByName(instituteId, "Medicine Types");
    if (!medicineTypesCategory) {
      return res.status(404).json({ message: "Medicine Types category not found" });
    }

    // Check for duplicate
    const duplicate = await MasterValue.findOne({
      Institute_ID: instituteId,
      category_id: medicineTypesCategory._id,
      normalized_value: normalize(typeName)
    });

    if (duplicate) {
      return res.status(409).json({ message: "Medicine type already exists" });
    }

    const created = await MasterValue.create({
      Institute_ID: instituteId,
      category_id: medicineTypesCategory._id,
      value_name: typeName,
      normalized_value: normalize(typeName),
      status: "Active"
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /master-data-api/medicines/type error", err);
    res.status(500).json({ message: "Failed to add medicine type", error: err.message });
  }
});

module.exports = router;
