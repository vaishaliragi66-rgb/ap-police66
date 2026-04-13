const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const MasterCategory = require("../models/master_category");
const MasterValue = require("../models/master_value");
const DiagnosisTest = require("../models/diagnostics_test");
const Xray = require("../models/XraySchema");

const DISEASES_FILE = path.join(__dirname, "..", "data", "diseases.json");

const TEST_CATEGORY_NAME = "Tests";
const DISEASE_CATEGORY_NAME = "Diseases";
const XRAY_CATEGORY_NAME = "Xray Types";

const DEFAULT_TEST_CATEGORIES = [
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

const normalize = (value) => String(value || "").trim().toLowerCase();
const trimString = (value) => String(value || "").trim();
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || "").trim());

const sortUniqueStrings = (items = []) => {
  const map = new Map();
  (items || []).forEach((item) => {
    const value = trimString(item);
    const key = normalize(value);
    if (value && !map.has(key)) {
      map.set(key, value);
    }
  });
  return [...map.values()].sort((a, b) => a.localeCompare(b));
};

const loadDiseaseSeedGroups = () => {
  if (!fs.existsSync(DISEASES_FILE)) {
    return { communicable: [], nonCommunicable: [] };
  }

  try {
    const raw = fs.readFileSync(DISEASES_FILE, "utf8");
    const body = JSON.parse(raw || "{}");
    return {
      communicable: sortUniqueStrings(body.communicable || []),
      nonCommunicable: sortUniqueStrings(body.nonCommunicable || [])
    };
  } catch (err) {
    console.error("Failed to read disease seed file", err);
    return { communicable: [], nonCommunicable: [] };
  }
};

const resolveInstituteIdFromRequest = (req) =>
  trimString(req?.user?.instituteId || req?.query?.instituteId || req?.headers?.["x-institute-id"] || "");

// A small compatibility feature: allow certain top-level categories (like Tests)
// to be backed by a single shared category document across institutes.
const GLOBAL_MASTER_INSTITUTE_ID = process.env.GLOBAL_MASTER_INSTITUTE_ID || "000000000000000000000000";

const ensureCategoryDoc = async (instituteId, categoryName) => {
  const normalizedName = normalize(categoryName);

  // Prefer a per-institute category when available
  if (isValidObjectId(instituteId)) {
    let category = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: normalizedName });
    if (category) return category;
  }

  // For Tests we support a shared global category id so all institutes can reference the same category doc
  if (String(categoryName) === TEST_CATEGORY_NAME) {
    // try global first
    let globalCat = await MasterCategory.findOne({ Institute_ID: GLOBAL_MASTER_INSTITUTE_ID, normalized_name: normalizedName });
    if (!globalCat) {
      // create a global category doc (Institute_ID will be the reserved global id)
      globalCat = await MasterCategory.create({
        Institute_ID: GLOBAL_MASTER_INSTITUTE_ID,
        category_name: categoryName,
        normalized_name: normalizedName,
        status: "Active",
        seed_version: 0
      });
    }
    return globalCat;
  }

  // fallback: create per-institute category (only when instituteId is valid)
  if (!isValidObjectId(instituteId)) return null;

  const normalized = normalizedName;
  let category = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: normalized });
  if (!category) {
    category = await MasterCategory.create({
      Institute_ID: instituteId,
      category_name: categoryName,
      normalized_name: normalized,
      status: "Active",
      seed_version: 0
    });
  }
  return category;
};

const ensureValueRecord = async ({ instituteId, categoryId, valueName, status = "Active", meta = {} }) => {
  const normalizedValue = normalize(valueName);
  if (!normalizedValue) return null;

  const existing = await MasterValue.findOne({
    Institute_ID: instituteId,
    category_id: categoryId,
    normalized_value: normalizedValue
  });

  if (!existing) {
    return MasterValue.create({
      Institute_ID: instituteId,
      category_id: categoryId,
      value_name: trimString(valueName),
      normalized_value: normalizedValue,
      status,
      meta
    });
  }

  const nextMeta = { ...(existing.meta || {}), ...(meta || {}) };
  const shouldUpdate =
    trimString(existing.value_name) !== trimString(valueName) ||
    String(existing.status || "Active") !== String(status || "Active") ||
    JSON.stringify(existing.meta || {}) !== JSON.stringify(nextMeta);

  if (shouldUpdate) {
    existing.value_name = trimString(valueName);
    existing.normalized_value = normalizedValue;
    existing.status = status || existing.status || "Active";
    existing.meta = nextMeta;
    await existing.save();
  }

  return existing;
};

const ensureTestMasterValues = async (instituteId) => {
  if (!isValidObjectId(instituteId)) return null;

  const category = await ensureCategoryDoc(instituteId, TEST_CATEGORY_NAME);
  if (!category) return null;
  if (Number(category.seed_version || 0) >= 2) {
    return category;
  }

  const legacyTests = await DiagnosisTest.find({})
    .select("Test_Name Group Reference_Range Units")
    .sort({ Group: 1, Test_Name: 1 })
    .lean();

  const categoryNames = sortUniqueStrings([
    ...DEFAULT_TEST_CATEGORIES,
    ...legacyTests.map((item) => item?.Group)
  ]);

  for (const categoryName of categoryNames) {
    await ensureValueRecord({
      instituteId,
      categoryId: category._id,
      valueName: categoryName,
      meta: { kind: "category" }
    });
  }

  for (const test of legacyTests) {
    const testName = trimString(test?.Test_Name);
    const group = trimString(test?.Group);
    if (!testName) continue;

    await ensureValueRecord({
      instituteId,
      categoryId: category._id,
      valueName: testName,
      meta: {
        kind: "test",
        category: group,
        categoryNormalized: normalize(group),
        reference: trimString(test?.Reference_Range),
        unit: trimString(test?.Units)
      }
    });
  }

  await MasterCategory.updateOne({ _id: category._id }, { $set: { seed_version: 2 } });
  category.seed_version = 2;

  return category;
};

const listMasterTests = async (instituteId, { includeInactive = false } = {}) => {
  if (!isValidObjectId(instituteId)) return [];

  const category = await ensureTestMasterValues(instituteId);
  if (!category) return [];

  const query = {
    Institute_ID: instituteId,
    category_id: category._id,
    "meta.kind": "test"
  };
  if (!includeInactive) {
    query.status = "Active";
  }

  const rows = await MasterValue.find(query).sort({ value_name: 1 }).lean();
  return rows.map((row) => ({
    _id: row._id,
    Test_Name: row.value_name,
    Group: trimString(row?.meta?.category),
    Reference_Range: trimString(row?.meta?.reference),
    Units: trimString(row?.meta?.unit),
    Display_Name: row.value_name,
    status: row.status || "Active",
    source: "master"
  }));
};

const findMasterTests = async (instituteId, { ids = [], names = [], includeInactive = true } = {}) => {
  if (!isValidObjectId(instituteId)) return [];

  const category = await ensureTestMasterValues(instituteId);
  if (!category) return [];

  const query = {
    Institute_ID: instituteId,
    category_id: category._id,
    "meta.kind": "test"
  };

  if (!includeInactive) {
    query.status = "Active";
  }

  const or = [];
  const validIds = (ids || []).filter(isValidObjectId).map((id) => new mongoose.Types.ObjectId(String(id)));
  if (validIds.length) {
    or.push({ _id: { $in: validIds } });
  }

  const normalizedNames = sortUniqueStrings(names).map((name) => normalize(name)).filter(Boolean);
  if (normalizedNames.length) {
    or.push({ normalized_value: { $in: normalizedNames } });
  }

  if (or.length) {
    query.$or = or;
  }

  return MasterValue.find(query).lean();
};

const findMasterTestByLooseName = async (instituteId, testName) => {
  if (!isValidObjectId(instituteId) || !trimString(testName)) return null;

  const category = await ensureTestMasterValues(instituteId);
  if (!category) return null;

  const safeName = trimString(testName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = await MasterValue.find({
    Institute_ID: instituteId,
    category_id: category._id,
    "meta.kind": "test",
    normalized_value: { $regex: safeName, $options: "i" }
  })
    .limit(2)
    .lean();

  return matches.length === 1 ? matches[0] : null;
};

const ensureDiseaseMasterValues = async (instituteId) => {
  if (!isValidObjectId(instituteId)) return null;

  const category = await ensureCategoryDoc(instituteId, DISEASE_CATEGORY_NAME);
  if (!category) return null;
  if (Number(category.seed_version || 0) >= 2) {
    return category;
  }

  const seeds = loadDiseaseSeedGroups();
  for (const diseaseName of seeds.communicable) {
    await ensureValueRecord({
      instituteId,
      categoryId: category._id,
      valueName: diseaseName,
      meta: { kind: "disease", group: "Communicable" }
    });
  }

  for (const diseaseName of seeds.nonCommunicable) {
    await ensureValueRecord({
      instituteId,
      categoryId: category._id,
      valueName: diseaseName,
      meta: { kind: "disease", group: "Non-Communicable" }
    });
  }

  await MasterCategory.updateOne({ _id: category._id }, { $set: { seed_version: 2 } });
  category.seed_version = 2;

  return category;
};

const listMasterDiseases = async (instituteId, { includeInactive = false } = {}) => {
  if (!isValidObjectId(instituteId)) {
    return { communicable: [], nonCommunicable: [] };
  }

  const category = await ensureDiseaseMasterValues(instituteId);
  if (!category) {
    return { communicable: [], nonCommunicable: [] };
  }

  const query = {
    Institute_ID: instituteId,
    category_id: category._id,
    "meta.kind": "disease"
  };
  if (!includeInactive) {
    query.status = "Active";
  }

  const rows = await MasterValue.find(query).sort({ value_name: 1 }).lean();

  return {
    communicable: sortUniqueStrings(
      rows.filter((row) => trimString(row?.meta?.group) === "Communicable").map((row) => row.value_name)
    ),
    nonCommunicable: sortUniqueStrings(
      rows.filter((row) => trimString(row?.meta?.group) === "Non-Communicable").map((row) => row.value_name)
    )
  };
};

const ensureXrayMasterValues = async (instituteId) => {
  if (!isValidObjectId(instituteId)) return null;

  const category = await ensureCategoryDoc(instituteId, XRAY_CATEGORY_NAME);
  if (!category) return null;
  if (Number(category.seed_version || 0) >= 2) {
    return category;
  }

  const legacyXrays = await Xray.find({})
    .select("Xray_Type Body_Part Side View Film_Size status")
    .sort({ Body_Part: 1, Xray_Type: 1 })
    .lean();

  const bodyParts = sortUniqueStrings(legacyXrays.map((row) => row?.Body_Part));

  for (const bodyPart of bodyParts) {
    await ensureValueRecord({
      instituteId,
      categoryId: category._id,
      valueName: bodyPart,
      meta: { kind: "xray_body_part", bodyPart }
    });
  }

  for (const row of legacyXrays) {
    const xrayType = trimString(row?.Xray_Type);
    const bodyPart = trimString(row?.Body_Part);
    if (!xrayType || !bodyPart) continue;

    await ensureValueRecord({
      instituteId,
      categoryId: category._id,
      valueName: xrayType,
      status: row?.status === "Inactive" ? "Inactive" : "Active",
      meta: {
        kind: "xray",
        bodyPart,
        side: trimString(row?.Side) || "NA",
        view: trimString(row?.View),
        filmSize: trimString(row?.Film_Size)
      }
    });
  }

  await MasterCategory.updateOne({ _id: category._id }, { $set: { seed_version: 2 } });
  category.seed_version = 2;

  return category;
};

const listMasterXrays = async (instituteId, { includeInactive = false } = {}) => {
  if (!isValidObjectId(instituteId)) return [];

  const category = await ensureXrayMasterValues(instituteId);
  if (!category) return [];

  const query = {
    Institute_ID: instituteId,
    category_id: category._id,
    "meta.kind": "xray"
  };
  if (!includeInactive) {
    query.status = "Active";
  }

  const rows = await MasterValue.find(query).sort({ value_name: 1 }).lean();
  return rows.map((row) => ({
    _id: row._id,
    Xray_Type: row.value_name,
    Body_Part: trimString(row?.meta?.bodyPart),
    Side: trimString(row?.meta?.side) || "NA",
    View: trimString(row?.meta?.view),
    Film_Size: trimString(row?.meta?.filmSize),
    status: row.status || "Active"
  }));
};

const listMasterXrayBodyParts = async (instituteId, { includeInactive = false } = {}) => {
  if (!isValidObjectId(instituteId)) return [];

  const category = await ensureXrayMasterValues(instituteId);
  if (!category) return [];

  const query = {
    Institute_ID: instituteId,
    category_id: category._id,
    "meta.kind": "xray_body_part"
  };
  if (!includeInactive) {
    query.status = "Active";
  }

  const rows = await MasterValue.find(query).sort({ value_name: 1 }).lean();
  return rows.map((row) => ({
    _id: row._id,
    Body_Part: row.value_name,
    status: row.status || "Active"
  }));
};

const findMasterXrays = async (instituteId, { ids = [], names = [], includeInactive = true } = {}) => {
  if (!isValidObjectId(instituteId)) return [];

  const category = await ensureXrayMasterValues(instituteId);
  if (!category) return [];

  const query = {
    Institute_ID: instituteId,
    category_id: category._id,
    "meta.kind": "xray"
  };
  if (!includeInactive) {
    query.status = "Active";
  }

  const or = [];
  const validIds = (ids || []).filter(isValidObjectId).map((id) => new mongoose.Types.ObjectId(String(id)));
  if (validIds.length) {
    or.push({ _id: { $in: validIds } });
  }

  const normalizedNames = sortUniqueStrings(names).map((name) => normalize(name)).filter(Boolean);
  if (normalizedNames.length) {
    or.push({ normalized_value: { $in: normalizedNames } });
  }

  if (or.length) {
    query.$or = or;
  }

  return MasterValue.find(query).lean();
};

module.exports = {
  TEST_CATEGORY_NAME,
  DISEASE_CATEGORY_NAME,
  XRAY_CATEGORY_NAME,
  DEFAULT_TEST_CATEGORIES,
  GLOBAL_MASTER_INSTITUTE_ID,
  normalize,
  trimString,
  isValidObjectId,
  resolveInstituteIdFromRequest,
  ensureCategoryDoc,
  ensureValueRecord,
  ensureTestMasterValues,
  listMasterTests,
  findMasterTests,
  findMasterTestByLooseName,
  ensureDiseaseMasterValues,
  listMasterDiseases,
  ensureXrayMasterValues,
  listMasterXrays,
  listMasterXrayBodyParts,
  findMasterXrays
};
