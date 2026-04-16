const express = require("express");
const mongoose = require("mongoose");
const { verifyToken } = require("./instituteAuth");
const MasterCategory = require("../models/master_category");
const MasterValue = require("../models/master_value");
const Medicine = require("../models/master_medicine");
const MainStoreMedicine = require("../models/main_store");
const {
  DEFAULT_TEST_CATEGORIES,
  ensureTestMasterValues,
  listMasterTests,
  ensureDiseaseMasterValues,
  listMasterDiseases,
  GLOBAL_MASTER_INSTITUTE_ID
} = require("../utils/instituteMasterData");

const router = express.Router();

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
const VALID_TEST_CATEGORIES = DEFAULT_TEST_CATEGORIES;

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
  "Medicines": (function () {
    try {
      const parsed = require(path.join(__dirname, '..', 'imports', 'parsed_medicines_20260413003118.json'));
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((r) => r && r.name && String(r.name).trim().toLowerCase() !== 'medicine')
        .map((r) => ({
          value_name: String(r.name || '').trim(),
          meta: {
            kind: 'medicine',
            medicineType: String(r.medicineType || r.medicine_type || '').trim(),
            dosageForm: String(r.dosageForm || r.dosage_form || r.form || '').trim(),
            strength: String(r.strength || '').trim()
          }
        }));
    } catch (err) {
      console.warn('Could not load parsed medicines JSON for default seeds:', err && err.message);
      return [];
    }
  })(),
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
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || "").trim());
const normalizeLoose = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const MEDICINE_TYPE_LABELS = {
  analgesics: "Analgesics",
  antacids: "Antacids",
  antibiotics: "Antibiotics",
  antidiabetics: "Antidiabetics",
  antifungals: "Antifungals",
  antihelmenthics: "Antihelminthics",
  antihelminthics: "Antihelminthics",
  antihelmintics: "Antihelminthics",
  antihistamines: "Antihistamines",
  antihypertensives: "Antihypertensives",
  antimalarials: "Antimalarials",
  antipyretics: "Antipyretics",
  antivirals: "Antivirals",
  others: "Others",
  vitamins: "Vitamins"
};
const normalizeMedicineMetaValue = (value, fallback = "") => String(value || fallback || "").trim();
const getCanonicalMedicineTypeKey = (value) => normalizeLoose(value);
const canonicalizeMedicineTypeLabel = (value) => {
  const raw = String(value || "").trim();
  const key = getCanonicalMedicineTypeKey(raw);
  if (!key) return "";
  if (MEDICINE_TYPE_LABELS[key]) return MEDICINE_TYPE_LABELS[key];
  if (key.startsWith("anti") && key.length > 4) {
    return `Anti${key.charAt(4).toUpperCase()}${key.slice(5)}`;
  }
  return raw
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
const getMedicineTypeFromMeta = (meta = {}) =>
  canonicalizeMedicineTypeLabel(
    normalizeMedicineMetaValue(meta?.medicineType || meta?.medicine_type || meta?.typeCategory, "Others")
  );
const getMedicineDosageFormFromMeta = (meta = {}) =>
  normalizeMedicineMetaValue(meta?.dosageForm || meta?.dosage_form || meta?.form || meta?.type, "Other");
const getMedicineStrengthFromMeta = (meta = {}) => normalizeMedicineMetaValue(meta?.strength);
const makeMedicineKey = ({ value_name, medicineType, dosageForm, strength }) =>
  [
    normalize(medicineType || "Others"),
    normalize(dosageForm || "Other"),
    normalize(value_name),
    normalize(strength)
  ].join("::");

const sortUnique = (arr) => {
  if (!Array.isArray(arr)) return [];
  const uniqueValues = new Map();
  arr.forEach((item) => {
    const value = String(item || "").trim();
    const key = normalize(value);
    if (!value || uniqueValues.has(key)) return;
    uniqueValues.set(key, value);
  });
  return [...uniqueValues.values()].sort((a, b) =>
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
      status: "Active",
      seed_version: 0
    }));

  if (docs.length) {
    await MasterCategory.insertMany(docs, { ordered: false });
  }
};

const ensureDefaultValues = async (instituteId) => {
  const categories = await MasterCategory.find({ Institute_ID: instituteId }).select("_id category_name normalized_name seed_version");
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
<<<<<<< HEAD
  const categorySeedUpdates = [];
  // Build seed docs for any missing default values per category
  for (const [categoryName, seedValues] of Object.entries(DEFAULT_VALUE_SEEDS)) {
    try {
      const category = categories.find((c) => normalize(c.category_name) === normalize(categoryName));
      if (!category) continue;
      const existingSet = existingByCategory.get(String(category._id)) || new Set();
      for (const seed of (Array.isArray(seedValues) ? seedValues : [])) {
        // Seed entries may be strings or objects with value_name/meta
        const valueName = typeof seed === 'string' ? seed : String(seed?.value_name || '').trim();
        if (!valueName) continue;
        const normalizedValue = normalize(valueName);
        if (existingSet.has(normalizedValue)) continue;
        const meta = (typeof seed === 'object' && seed?.meta) ? seed.meta : {};
        docs.push({
          Institute_ID: instituteId,
          category_id: category._id,
          value_name: valueName,
          normalized_value: normalizedValue,
          status: 'Active',
          meta
        });
        existingSet.add(normalizedValue);
      }
    } catch (e) {
      console.warn('ensureDefaultValues seed error for', categoryName, e.message);
    }
  }
=======

  categories.forEach((category) => {
    const seedValues = DEFAULT_VALUE_SEEDS[category.category_name] || [];
    const existingSet = existingByCategory.get(String(category._id)) || new Set();

    // dedupe seedValues by normalized value to avoid duplicate insert attempts
    const seenSeedNormalized = new Set();
    seedValues.forEach((seedItem) => {
      const value_name = String(
        typeof seedItem === "string" ? seedItem : seedItem?.value_name || ""
      ).trim();
      if (!value_name) return;

      let meta =
        seedItem && typeof seedItem === "object" && !Array.isArray(seedItem)
          ? seedItem.meta || seedItem.meta || {}
          : {};

      // If the seed item itself contains medicine meta fields (from parsed JSON), prefer them
      if (!meta || Object.keys(meta).length === 0) {
        meta = {
          medicineType: seedItem?.meta?.medicineType || seedItem?.medicineType || seedItem?.meta?.medicine_type || seedItem?.medicine_type || "",
          dosageForm: seedItem?.meta?.dosageForm || seedItem?.dosageForm || seedItem?.meta?.dosage_form || seedItem?.dosage_form || "",
          strength: seedItem?.meta?.strength || seedItem?.strength || ""
        };
      }

      // For medicines, include medicineType/dosageForm/strength in the normalized key
      let normalized_value;
      if (String(category.category_name || "").trim() === "Medicines") {
        normalized_value = makeMedicineKey({
          value_name,
          medicineType: meta.medicineType || meta.medicine_type || "",
          dosageForm: meta.dosageForm || meta.dosage_form || meta.form || "",
          strength: meta.strength || ""
        });
      } else {
        normalized_value = normalize(value_name);
      }

      if (!normalized_value || existingSet.has(normalized_value) || seenSeedNormalized.has(normalized_value)) {
        return;
      }
      seenSeedNormalized.add(normalized_value);

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
>>>>>>> f14dbc1 (wip: restore stash after pull)

  if (docs.length) {
    try {
      await MasterValue.insertMany(docs, { ordered: false });
<<<<<<< HEAD
    } catch (e) {
      // ignore duplicate errors or continue
=======
    } catch (err) {
      // Ignore duplicate key errors that can occur when parallel inserts or
      // existing values conflict with seeds. Log other errors.
      if (err && (err.code === 11000 || (err.message && err.message.toLowerCase().includes('duplicate key')))) {
        console.warn('Ignored duplicate key error while seeding master values');
      } else {
        console.error('Failed to insert default master values', err);
        throw err;
      }
>>>>>>> f14dbc1 (wip: restore stash after pull)
    }
  }
};

const getCategoryByName = async (instituteId, categoryName) => {
  const normalized = normalize(categoryName);
  // Prefer per-institute category, fall back to global shared category
  let category = null;
  if (instituteId && mongoose.Types.ObjectId.isValid(String(instituteId))) {
    category = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: normalized });
    if (category) return category;
  }

  // fallback to global reserved category id
  category = await MasterCategory.findOne({ Institute_ID: GLOBAL_MASTER_INSTITUTE_ID, normalized_name: normalized });
  return category;
};

router.get("/public-map", async (req, res) => {
  try {
    const instituteId = String(req.query.instituteId || "").trim();
    if (!isValidObjectId(instituteId)) {
      return res.status(400).json({ message: "Valid instituteId is required" });
    }

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    // include global categories (reserved global institute id) so shared categories like Tests are visible
    const categories = await MasterCategory.find({ Institute_ID: { $in: [instituteId, GLOBAL_MASTER_INSTITUTE_ID] }, status: "Active" });
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
    const categories = await MasterCategory.find({ Institute_ID: { $in: [instituteId, GLOBAL_MASTER_INSTITUTE_ID] } }).sort({ category_name: 1 });
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

    const categories = await MasterCategory.find({ Institute_ID: { $in: [instituteId, GLOBAL_MASTER_INSTITUTE_ID] }, status: "Active" });
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
    await ensureTestMasterValues(instituteId);

    const testsCategory = await getCategoryByName(instituteId, "Tests");
    const allRows = testsCategory
      ? await MasterValue.find({
          Institute_ID: instituteId,
          category_id: testsCategory._id,
          status: "Active"
        }).lean()
      : [];

    const categoriesSet = new Set(VALID_TEST_CATEGORIES);

    // Map of keywords (lowercased) to high-level test categories
    const TEST_GROUPS = {
      HEMATOLOGY: ['hemoglobin','rbc','wbc','platelet','hematocrit','mcv','mch','mchc','esr','neutrophil','lymphocyte','eosinophil','monocyte','basophil','rdw'],
      'DIABETES & GLUCOSE': ['fasting blood sugar','postprandial','ppbs','hba1c','random blood sugar','rbs','insulin','c-peptide'],
      'LIPID PROFILE': ['total cholesterol','ldl','hdl','triglyceride','vldl','non-hdl','ldl/hdl','ldl ratio'],
      'LIVER FUNCTION TESTS (LFT)': ['bilirubin','alt','ast','alkaline phosphatase','ggt','total protein','albumin','globulin','a/g ratio'],
      'KIDNEY FUNCTION TESTS (KFT)': ['creatinine','blood urea nitrogen','bun','urea','uric acid','egfr','cystatin'],
      'THYROID PROFILE': ['tsh','free t4','free t3','total t4','total t3','anti-tpo'],
      ELECTROLYTES: ['sodium','potassium','chloride','calcium','magnesium','phosphate','bicarbonate'],
      URINALYSIS: ['urine pH','urine specific gravity','urine protein','urine glucose','urine ketones','urine rbc','urine wbc','urine nitrite','urine bilirubin','microalbuminuria'],
      'CARDIAC MARKERS': ['troponin','ck-mb','bnp','hs-crp','homocysteine','lipoprotein'],
      'VITAMINS & MINERALS': ['vitamin d','vitamin b12','folate','serum iron','ferritin','tibc','zinc','vitamin b1'],
      'COAGULATION STUDIES': ['prothrombin time','inr','aptt','fibrinogen','d-dimer','bleeding time'],
      'INFECTIOUS DISEASE PANEL': ['hbsag','anti-hcv','hiv','vdrl','dengue','malaria','widal'],
      'TUMOR MARKERS': ['psa','cea','afp','ca-125','ca 19-9'],
      'HORMONAL PROFILE': ['testosterone','fsh','lh','prolactin','cortisol','dhea-s'],
      'BONE HEALTH': ['pth','alkaline phosphatase (bone)','calcium (serum)','phosphorus'],
      IMMUNOLOGY: ['ige','ana','rheumatoid factor','crp']
    };

    const normalizedValidCategories = new Set(Array.from(categoriesSet).map((c) => normalize(c)));

    const guessCategory = (test) => {
      const name = normalize(test?.Test_Name || '');
      const group = normalize(test?.Group || '');

      // If group already matches a valid high-level category, keep it
      if (group && normalizedValidCategories.has(group)) return String(test.Group).trim();

      // If group looks like the same as the test name (mis-grouped), prefer mapping by test name
      if (group && name && group === name) {
        // fall through to keyword mapping
      }

      // Keyword mapping: prefer test name, then group text
      for (const [category, terms] of Object.entries(TEST_GROUPS)) {
        for (const term of terms) {
          if (!term) continue;
          const t = normalize(term);
          if (name.includes(t) || group.includes(t)) return category;
        }
      }

      // Fallback: if group is present return it, else mark Uncategorized
      return test?.Group || 'Uncategorized';
    };
    allRows
      .filter((row) => row?.meta?.kind === "category")
      .forEach((row) => {
        const categoryName = String(row?.value_name || "").trim();
        if (categoryName) categoriesSet.add(categoryName);
      });

    const masterTests = await listMasterTests(instituteId);
    masterTests.forEach((test) => {
      const categoryName = String(test?.Group || "").trim();
      if (categoryName) categoriesSet.add(categoryName);
    });

    const testsByCategory = {};
    [...categoriesSet].forEach((categoryName) => {
      testsByCategory[categoryName] = [];
    });

    masterTests.forEach((test) => {
      const guessedCategory = String(guessCategory(test) || '').trim();
      const testName = String(test?.Test_Name || '').trim();
      const categoryName = guessedCategory || 'Uncategorized';
      if (!testName) return;
      if (!testsByCategory[categoryName]) testsByCategory[categoryName] = [];
      testsByCategory[categoryName].push({
        id: test._id,
        name: testName,
        reference: test.Reference_Range || '',
        unit: test.Units || '',
        source: 'master'
      });
    });

    Object.keys(testsByCategory).forEach((categoryName) => {
      const seen = new Set();
      testsByCategory[categoryName] = (testsByCategory[categoryName] || [])
        .filter((item) => {
          const key = String(item?.name || item?.Test_Name || '').trim().toLowerCase();
          if (!key) return false;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => String(a.name || a.Test_Name || '').localeCompare(String(b.name || b.Test_Name || '')));
    });

    const categories = Object.keys(testsByCategory)
      .filter((categoryName) => categoryName && (testsByCategory[categoryName]?.length || categoriesSet.has(categoryName)))
      .sort((a, b) => {
        const leftIndex = VALID_TEST_CATEGORIES.indexOf(a);
        const rightIndex = VALID_TEST_CATEGORIES.indexOf(b);

        if (leftIndex !== -1 && rightIndex !== -1) {
          return leftIndex - rightIndex;
        }
        if (leftIndex !== -1) return -1;
        if (rightIndex !== -1) return 1;
        return String(a).localeCompare(String(b));
      });

    res.json({
      categories,
      testsByCategory
    });
  } catch (err) {
    console.error("GET /master-data-api/tests-structure error", err);
    res.status(500).json({ message: "Failed to load tests structure", error: err.message });
  }
});

router.post("/tests/category", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const categoryName = String(req.body.categoryName || "").trim();

    if (!categoryName) {
      return res.status(400).json({ message: "categoryName is required" });
    }

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);
    await ensureTestMasterValues(instituteId);

    const testsCategory = await getCategoryByName(instituteId, "Tests");
    if (!testsCategory) {
      return res.status(404).json({ message: "Tests category not found" });
    }

    const existing = await MasterValue.findOne({
      Institute_ID: instituteId,
      category_id: testsCategory._id,
      normalized_value: normalize(categoryName),
      "meta.kind": "category"
    });

    if (existing) {
      return res.status(200).json(existing);
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

    res.json({ 
      message: "Test category deleted successfully",
      categoryName,
      testsDeleted: deleteResult.deletedCount
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

    const duplicateMasterTest = await MasterValue.findOne({
      Institute_ID: instituteId,
      category_id: testsCategory._id,
      normalized_value: normalize(testName),
      "meta.kind": "test",
      "meta.categoryNormalized": normalize(category)
    });

    let created = false;
    let createdDoc = null;
    if (!duplicateMasterTest) {
      createdDoc = await MasterValue.create({
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
      created = true;
    }

    res.status(201).json({ message: "Test add processed", created, test: createdDoc ? { _id: createdDoc._id, Test_Name: createdDoc.value_name } : null });
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
    await ensureDiseaseMasterValues(instituteId);

    const { communicable, nonCommunicable } = await listMasterDiseases(instituteId);
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
        .select("Medicine_Name Type Category Strength")
        .lean()
        .catch(() => []),
      MainStoreMedicine.find({ Institute_ID: instituteId })
        .select("Medicine_Name Type Category Strength")
        .lean()
        .catch(() => [])
    ]);

    const defaultTypes = medicineTypeValues.length === 0 && Array.isArray(DEFAULT_VALUE_SEEDS["Medicine Types"])
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
      const typeName = canonicalizeMedicineTypeLabel(row?.value_name || "");
      if (!typeName) return;
      const key = getCanonicalMedicineTypeKey(typeName);
      if (!typeMetaByName.has(key) || (row?._id && !typeMetaByName.get(key)?._id)) {
        typeMetaByName.set(key, {
          _id: row?._id || null,
          value_name: typeName,
          status: row?.status || "Active"
        });
      }
    });

    // Map dosage form name -> meta (id, value_name)
    const dosageFormMetaByName = new Map();
    dosageFormValues.forEach((row) => {
      const formName = String(row?.value_name || "").trim();
      if (!formName) return;
      const key = normalizeLoose(formName);
      if (!dosageFormMetaByName.has(key) || (row?._id && !dosageFormMetaByName.get(key)?._id)) {
        dosageFormMetaByName.set(key, { _id: row?._id || null, value_name: formName, status: row?.status || 'Active' });
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
      const hintMedicineType = canonicalizeMedicineTypeLabel(medicineType || "Others") || "Others";
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

    // Build hints from existing master medicine entries
    (medicineValues || []).forEach((row) => {
      const name = String(row?.value_name || "").trim();
      if (!name) return;
      if (row?.meta?.kind === "medicine") {
        addHint(name, getMedicineTypeFromMeta(row?.meta), getMedicineDosageFormFromMeta(row?.meta), getMedicineStrengthFromMeta(row?.meta));
      }
    });

    // Build hints from inventory rows (main/sub store)
    ([...subStoreRows, ...mainStoreRows] || []).forEach((row) => {
      const inventoryMedicineType = canonicalizeMedicineTypeLabel(row?.Type || row?.Category || "Others") || "Others";
      addHint(row?.Medicine_Name, inventoryMedicineType, "Other", row?.Strength);
    });

    // Build flattened medicine rows using hints and master entries
    const medicineRows = [];
    (medicineValues || []).forEach((row) => {
      const name = String(row?.value_name || "").trim();
      if (!name) return;

      if (row?.meta?.kind === "medicine") {
        const medType = getMedicineTypeFromMeta(row?.meta);
        const medForm = getMedicineDosageFormFromMeta(row?.meta);
        const typeMeta = typeMetaByName.get(getCanonicalMedicineTypeKey(medType));
        const formMeta = dosageFormMetaByName.get(getCanonicalMedicineTypeKey(medForm));
        medicineRows.push({
          _id: row?._id || null,
          value_name: name,
          medicineType: medType,
          medicine_type_id: typeMeta?._id || null,
          dosageForm: medForm,
          dosage_form_id: formMeta?._id || null,
          strength: getMedicineStrengthFromMeta(row?.meta),
          status: row?.status || "Active",
          meta: row?.meta || {}
        });
        return;
      }

      const hints = hintsByMedicineName.get(normalize(name)) || [];
      if (hints.length === 0) {
        medicineRows.push({
          _id: row?._id || null,
          value_name: name,
          medicineType: "Others",
          medicine_type_id: null,
          dosageForm: "Other",
          dosage_form_id: null,
          strength: "",
          status: row?.status || "Active",
          meta: row?.meta || {}
        });
        return;
      }

      hints.forEach((hint) => {
        const medType = hint.medicineType || "Others";
        const medForm = hint.dosageForm || "Other";
        const typeMeta = typeMetaByName.get(getCanonicalMedicineTypeKey(medType));
        const formMeta = dosageFormMetaByName.get(getCanonicalMedicineTypeKey(medForm));
        medicineRows.push({
          _id: row?._id || null,
          value_name: name,
          medicineType: medType,
          medicine_type_id: typeMeta?._id || null,
          dosageForm: medForm,
          dosage_form_id: formMeta?._id || null,
          strength: hint.strength || "",
          status: row?.status || "Active",
          meta: row?.meta || {}
        });
      });
    });

    const seenMedicine = new Set();
    const medicines = (medicineRows || [])
      .filter((item) => String(item?.value_name || "").trim())
      .filter((item) => {
        const key = makeMedicineKey(item);
        if (seenMedicine.has(key)) return false;
        seenMedicine.add(key);
        return true;
      })
      .sort((a, b) => String(a.value_name || "").localeCompare(String(b.value_name || "")));

    // Final pass: ensure medicine_type_id and dosage_form_id are attached when possible
    try {
      const typeLookup = new Map();
      (medicineTypeValues || []).forEach((r) => {
        const key = getCanonicalMedicineTypeKey(canonicalizeMedicineTypeLabel(r?.value_name || ""));
        if (key) typeLookup.set(key, r?._id || null);
      });

      const formLookup = new Map();
      (dosageFormValues || []).forEach((r) => {
        const key = normalizeLoose(r?.value_name || "");
        if (key) formLookup.set(key, r?._id || null);
      });

      medicines.forEach((m) => {
        try {
          if ((!m.medicine_type_id || String(m.medicine_type_id) === 'null') && m.medicineType) {
            const key = getCanonicalMedicineTypeKey(m.medicineType || "");
            if (typeLookup.has(key)) m.medicine_type_id = typeLookup.get(key) || null;
          }
          if ((!m.dosage_form_id || String(m.dosage_form_id) === 'null') && m.dosageForm) {
            const key = normalizeLoose(m.dosageForm || "");
            if (formLookup.has(key)) m.dosage_form_id = formLookup.get(key) || null;
          }
        } catch (e) {
          // ignore per-row mapping errors
        }
      });
    } catch (e) {
      console.warn('medicine id attach pass failed', e.message);
    }

    const medicineTypes = sortUnique([
      ...defaultTypes,
      ...medicineTypeValues.map((row) => canonicalizeMedicineTypeLabel(row?.value_name || "")),
      ...medicines.map((item) => item?.medicineType)
    ]);

    const dosageForms = sortUnique([
      ...(dosageFormValues.length === 0 ? defaultDosageForms : []),
      ...dosageFormValues.map((row) => row?.value_name),
      ...medicines.map((item) => item?.dosageForm)
    ]);

    const medicineTypeEntries = medicineTypes.map((type) => {
      const meta = typeMetaByName.get(getCanonicalMedicineTypeKey(type));
      return {
        _id: meta?._id || null,
        value_name: canonicalizeMedicineTypeLabel(type),
        status: meta?.status || "Active"
      };
    });
    const medicinesByType = {};
    (medicineTypes || []).forEach((type) => {
      medicinesByType[type] = (medicines || [])
        .filter((item) => getCanonicalMedicineTypeKey(item.medicineType) === getCanonicalMedicineTypeKey(type))
        .sort((a, b) => String(a.value_name || "").localeCompare(String(b.value_name || "")));
    });

    return res.json({
      success: true,
      data: {
        medicineTypes: Array.isArray(medicineTypes) ? medicineTypes : [],
        dosageForms: Array.isArray(dosageForms) ? dosageForms : [],
        medicineTypeEntries: Array.isArray(medicineTypeEntries) ? medicineTypeEntries : [],
        medicines: Array.isArray(medicines) ? medicines : [],
        medicinesByType: medicinesByType || {},
        // hierarchical grouping for exact UI mapping: type -> dosageForm -> medicines[]
        hierarchy: (medicineTypes || []).map((type) => {
          const formsMap = new Map();
          (medicines || [])
            .filter((m) => getCanonicalMedicineTypeKey(m.medicineType) === getCanonicalMedicineTypeKey(type))
            .forEach((m) => {
              const formKey = String(m.dosageForm || 'Other').trim();
              if (!formsMap.has(formKey)) formsMap.set(formKey, []);
              formsMap.get(formKey).push({
                id: m._id,
                name: m.value_name,
                strength: m.strength || "",
                dosageForm: m.dosageForm,
                medicine_type_id: m.medicine_type_id || null,
                dosage_form_id: m.dosage_form_id || null,
                status: m.status || 'Active',
                meta: m.meta || {}
              });
            });

          const forms = Array.from(formsMap.entries()).map(([formName, meds]) => ({
            dosageForm: formName,
            medicines: meds.sort((a,b)=> (a.name||'').localeCompare(b.name||''))
          }));

          return {
            type: {
              name: canonicalizeMedicineTypeLabel(type),
              id: (typeMetaByName.get(getCanonicalMedicineTypeKey(type)) || {})._id || null
            },
            forms: forms.sort((a,b)=> a.dosageForm.localeCompare(b.dosageForm))
          };
        })
      }
    });
  } catch (err) {
    console.error("GET /master-data-api/medicines-structure error", err);
    res.status(500).json({ message: "Failed to load medicines structure", error: err.message });
  }
});

router.post("/medicines", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const medicineName = String(req.body.medicineName || "").trim();
    const medicineType = canonicalizeMedicineTypeLabel(req.body.medicineType || "");
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

    // Check if a value with same normalized name already exists for this category
    const existingName = await MasterValue.findOne({
      Institute_ID: instituteId,
      category_id: medicinesCategory._id,
      normalized_value: normalize(medicineName)
    });

    if (existingName) {
      // If an exact medicine (including type/strength) already exists, report conflict
      const exactMatch = await MasterValue.findOne({
        Institute_ID: instituteId,
        category_id: medicinesCategory._id,
        normalized_value: normalize(medicineName),
        "meta.kind": "medicine",
        "meta.medicineType": medicineType,
        "meta.dosageForm": dosageForm,
        "meta.strength": strength
      });

      if (exactMatch) {
        return res.status(409).json({ message: "Medicine with this type and strength already exists" });
      }

      // Name exists but different meta; return informative conflict to avoid duplicate key error
      return res.status(409).json({ message: "Medicine name already exists with different attributes" });
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
    // Handle duplicate key errors more gracefully
    if (err?.code === 11000 || (err?.message || "").includes('duplicate key')) {
      return res.status(409).json({ message: "Medicine name already exists" });
    }
    res.status(500).json({ message: "Failed to add medicine", error: err.message });
  }
});

router.post("/medicines/type", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const typeName = canonicalizeMedicineTypeLabel(req.body.name || "");

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
    const existingTypes = await MasterValue.find({
      Institute_ID: instituteId,
      category_id: medicineTypesCategory._id
    }).select("value_name");
    const duplicate = existingTypes.find(
      (row) => getCanonicalMedicineTypeKey(row?.value_name) === getCanonicalMedicineTypeKey(typeName)
    );

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

router.put("/medicines/type/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const { id } = req.params;
    const nextName = canonicalizeMedicineTypeLabel(req.body.name || "");
    const nextStatus = req.body.status;

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const medicineTypesCategory = await getCategoryByName(instituteId, "Medicine Types");
    const medicinesCategory = await getCategoryByName(instituteId, "Medicines");

    if (!medicineTypesCategory) {
      return res.status(404).json({ message: "Medicine Types category not found" });
    }

    const typeDoc = await MasterValue.findOne({
      _id: id,
      Institute_ID: instituteId,
      category_id: medicineTypesCategory._id
    });

    if (!typeDoc) {
      return res.status(404).json({ message: "Medicine type not found" });
    }

    const previousName = canonicalizeMedicineTypeLabel(typeDoc.value_name || "");

    if (nextName) {
      const existingTypes = await MasterValue.find({
        Institute_ID: instituteId,
        category_id: medicineTypesCategory._id
      }).select("_id value_name");
      const duplicate = existingTypes.find(
        (row) =>
          String(row?._id) !== String(id) &&
          getCanonicalMedicineTypeKey(row?.value_name) === getCanonicalMedicineTypeKey(nextName)
      );

      if (duplicate) {
        return res.status(409).json({ message: "Medicine type already exists" });
      }

      typeDoc.value_name = nextName;
      typeDoc.normalized_value = normalize(nextName);
    }

    if (nextStatus === "Active" || nextStatus === "Inactive") {
      typeDoc.status = nextStatus;
    }

    await typeDoc.save();

    if (nextName && medicinesCategory && getCanonicalMedicineTypeKey(previousName) !== getCanonicalMedicineTypeKey(nextName)) {
      const relatedMedicines = await MasterValue.find({
        Institute_ID: instituteId,
        category_id: medicinesCategory._id,
        "meta.kind": "medicine"
      });

      const updates = relatedMedicines
        .filter(
          (row) => getCanonicalMedicineTypeKey(getMedicineTypeFromMeta(row.meta)) === getCanonicalMedicineTypeKey(previousName)
        )
        .map(async (row) => {
          row.meta = {
            ...(row.meta || {}),
            kind: "medicine",
            medicineType: nextName,
            dosageForm: getMedicineDosageFormFromMeta(row.meta),
            type: getMedicineDosageFormFromMeta(row.meta),
            strength: getMedicineStrengthFromMeta(row.meta),
            typeNormalized: normalize(nextName)
          };
          await row.save();
        });

      if (updates.length) {
        await Promise.all(updates);
      }
    }

    res.json(typeDoc);
  } catch (err) {
    console.error("PUT /master-data-api/medicines/type/:id error", err);
    res.status(500).json({ message: "Failed to update medicine type", error: err.message });
  }
});

router.delete("/medicines/type/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const { id } = req.params;

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const medicineTypesCategory = await getCategoryByName(instituteId, "Medicine Types");
    const medicinesCategory = await getCategoryByName(instituteId, "Medicines");

    if (!medicineTypesCategory) {
      return res.status(404).json({ message: "Medicine Types category not found" });
    }

    const typeDoc = await MasterValue.findOne({
      _id: id,
      Institute_ID: instituteId,
      category_id: medicineTypesCategory._id
    });

    if (!typeDoc) {
      return res.status(404).json({ message: "Medicine type not found" });
    }

    if (medicinesCategory) {
      // Reassign any linked medicines to 'Others' instead of blocking delete
      const relatedMedicines = await MasterValue.find({
        Institute_ID: instituteId,
        category_id: medicinesCategory._id,
        "meta.kind": "medicine"
      });

      const targetKey = getCanonicalMedicineTypeKey(typeDoc.value_name);
      for (const row of relatedMedicines) {
        try {
          const rowKey = getCanonicalMedicineTypeKey(getMedicineTypeFromMeta(row.meta));
          if (rowKey === targetKey) {
            row.meta = {
              ...(row.meta || {}),
              medicineType: "Others",
              type: "Other",
              typeNormalized: normalize("Others")
            };
            await row.save();
          }
        } catch (e) {
          console.warn('Failed to reassign medicine', row._id, e.message);
        }
      }

    }

    // Delete the type document (allow deletion even if it was in use)
    await typeDoc.deleteOne();
    res.json({ message: "Medicine type deleted" });
  } catch (err) {
    console.error("DELETE /master-data-api/medicines/type/:id error", err);
    res.status(500).json({ message: "Failed to delete medicine type", error: err.message });
  }
});

// DELETE by name: allow deleting built-in or frontend-only types by name.
router.delete("/medicines/type", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const name = String(req.query.name || req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Missing name parameter" });

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const medicinesCategory = await getCategoryByName(instituteId, "Medicines");
    const medicineTypesCategory = await getCategoryByName(instituteId, "Medicine Types");
    if (!medicineTypesCategory) return res.status(404).json({ message: "Medicine Types category not found" });

    // Find existing type doc (case-insensitive)
    const typeDoc = await MasterValue.findOne({
      Institute_ID: instituteId,
      category_id: medicineTypesCategory._id,
      value_name: { $regex: `^${escapeRegExp(name)}$`, $options: 'i' }
    });

    if (!typeDoc) {
      // Create an inactive override so frontend no longer shows the built-in type
      const created = new MasterValue({
        Institute_ID: instituteId,
        category_id: medicineTypesCategory._id,
        value_name: name,
        normalized_value: normalize(name),
        status: "Inactive",
        meta: { kind: "medicineType" }
      });
      await created.save();
      return res.json({ message: "Medicine type removed (override created)" });
    }

    // If a DB doc exists, reassign linked medicines and delete it
    if (medicinesCategory) {
      const relatedMedicines = await MasterValue.find({
        Institute_ID: instituteId,
        category_id: medicinesCategory._id,
        "meta.kind": "medicine"
      });

      const targetKey = getCanonicalMedicineTypeKey(typeDoc.value_name);
      for (const row of relatedMedicines) {
        try {
          const rowKey = getCanonicalMedicineTypeKey(getMedicineTypeFromMeta(row.meta));
          if (rowKey === targetKey) {
            row.meta = {
              ...(row.meta || {}),
              medicineType: "Others",
              type: "Other",
              typeNormalized: normalize("Others")
            };
            await row.save();
          }
        } catch (e) {
          console.warn('Failed to reassign medicine', row._id, e.message);
        }
      }
    }

    await typeDoc.deleteOne();
    res.json({ message: "Medicine type deleted" });
  } catch (err) {
    console.error("DELETE /master-data-api/medicines/type error", err);
    res.status(500).json({ message: "Failed to delete medicine type", error: err.message });
  }
});

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.put("/medicines/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid medicine id" });
    }
    const nextName = String(req.body.medicineName || req.body.value_name || "").trim();
    const nextMedicineType = canonicalizeMedicineTypeLabel(req.body.medicineType || "");
    const nextDosageForm = String(req.body.dosageForm || "").trim();
    const nextStrength = String(req.body.strength || "").trim();
    const nextStatus = req.body.status;

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const medicinesCategory = await getCategoryByName(instituteId, "Medicines");
    if (!medicinesCategory) {
      return res.status(404).json({ message: "Medicines category not found" });
    }

    const medicineDoc = await MasterValue.findOne({
      _id: id,
      Institute_ID: instituteId,
      category_id: medicinesCategory._id
    });

    if (!medicineDoc) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    const resolvedName = nextName || String(medicineDoc.value_name || "").trim();
    const resolvedMedicineType = nextMedicineType || getMedicineTypeFromMeta(medicineDoc.meta);
    const resolvedDosageForm = nextDosageForm || getMedicineDosageFormFromMeta(medicineDoc.meta);
    const resolvedStrength = nextStrength || getMedicineStrengthFromMeta(medicineDoc.meta);

    const existingMedicines = await MasterValue.find({
      _id: { $ne: id },
      Institute_ID: instituteId,
      category_id: medicinesCategory._id,
      "meta.kind": "medicine"
    }).select("value_name meta");

    const duplicate = existingMedicines.find((row) =>
      makeMedicineKey({
        value_name: row.value_name,
        medicineType: getMedicineTypeFromMeta(row.meta),
        dosageForm: getMedicineDosageFormFromMeta(row.meta),
        strength: getMedicineStrengthFromMeta(row.meta)
      }) ===
      makeMedicineKey({
        value_name: resolvedName,
        medicineType: resolvedMedicineType,
        dosageForm: resolvedDosageForm,
        strength: resolvedStrength
      })
    );

    if (duplicate) {
      return res.status(409).json({ message: "Medicine with the same type, dosage form, and strength already exists" });
    }

    medicineDoc.value_name = resolvedName;
    medicineDoc.normalized_value = normalize(resolvedName);
    medicineDoc.meta = {
      ...(medicineDoc.meta || {}),
      kind: "medicine",
      medicineType: resolvedMedicineType || "Others",
      dosageForm: resolvedDosageForm || "Other",
      type: resolvedDosageForm || "Other",
      strength: resolvedStrength,
      typeNormalized: normalize(resolvedMedicineType || "Others")
    };

    if (nextStatus === "Active" || nextStatus === "Inactive") {
      medicineDoc.status = nextStatus;
    }

    await medicineDoc.save();
    res.json(medicineDoc);
  } catch (err) {
    console.error("PUT /master-data-api/medicines/:id error", err);
    res.status(500).json({ message: "Failed to update medicine", error: err.message });
  }
});

router.delete("/medicines/:id", verifyToken, requireInstituteAdmin, async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid medicine id" });
    }

    await ensureDefaultCategories(instituteId);
    await ensureDefaultValues(instituteId);

    const medicinesCategory = await getCategoryByName(instituteId, "Medicines");
    if (!medicinesCategory) {
      return res.status(404).json({ message: "Medicines category not found" });
    }

    const medicineDoc = await MasterValue.findOne({
      _id: id,
      Institute_ID: instituteId,
      category_id: medicinesCategory._id
    });

    if (!medicineDoc) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    await medicineDoc.deleteOne();
    res.json({ message: "Medicine deleted" });
  } catch (err) {
    console.error("DELETE /master-data-api/medicines/:id error", err);
    res.status(500).json({ message: "Failed to delete medicine", error: err.message });
  }
});

module.exports = router;
