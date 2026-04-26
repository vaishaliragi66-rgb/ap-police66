const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const MasterCategory = require("../models/master_category");
const MasterValue = require("../models/master_value");
const DiagnosisTest = require("../models/diagnostics_test");
const Xray = require("../models/XraySchema");
const diagnosticReferencePanel = require("../data/diagnosticReferencePanel");
const { DEFAULT_XRAY_TYPES } = require("../data/xrayCatalog");

const CANONICAL_TEST_CATEGORIES = Array.isArray(diagnosticReferencePanel.categories)
  ? diagnosticReferencePanel.categories
  : Object.keys(diagnosticReferencePanel.testsByCategory || {});
const CANONICAL_TESTS_BY_CATEGORY = diagnosticReferencePanel.testsByCategory || {};
const CANONICAL_TEST_CATEGORY_ALIASES = diagnosticReferencePanel.categoryAliases || {};
const CANONICAL_TEST_ALIASES = diagnosticReferencePanel.testAliases || {};

const DISEASES_FILE = path.join(__dirname, "..", "data", "diseases.json");

const TEST_CATEGORY_NAME = "Tests";
const DISEASE_CATEGORY_NAME = "Diseases";
const XRAY_CATEGORY_NAME = "Xray Types";

const DEFAULT_TEST_CATEGORIES = CANONICAL_TEST_CATEGORIES;

const normalize = (value) => String(value || "").trim().toLowerCase();
const normalizeLoose = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
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
      name: trimString(valueName),
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
    existing.name = trimString(valueName);
    existing.normalized_value = normalizedValue;
    existing.status = status || existing.status || "Active";
    existing.meta = nextMeta;
    await existing.save();
  }

  return existing;
};

const archiveMasterValueRow = async (row, extraMeta = {}) => {
  if (!row?._id) return;
  const archivedNormalizedValue = `${normalize(trimString(row?.value_name) || "archived")}__archived__${String(row._id)}`;

  await MasterValue.updateOne(
    { _id: row._id },
    {
      $set: {
        normalized_value: archivedNormalizedValue,
        status: "Inactive",
        meta: {
          ...(row.meta || {}),
          ...extraMeta,
          archived: true,
          legacy_value_name: trimString(row?.value_name)
        }
      }
    }
  );
};

const getCanonicalTestCategoryName = (value) => {
  const raw = trimString(value);
  const alias = CANONICAL_TEST_CATEGORY_ALIASES[raw];
  return trimString(alias || raw);
};

const getCanonicalTestName = (categoryName, valueName) => {
  const rawCategory = trimString(categoryName);
  const rawName = trimString(valueName);
  const categoryAliases = CANONICAL_TEST_ALIASES[rawCategory] || {};
  const alias = categoryAliases[rawName];
  return trimString(alias || rawName);
};

const buildCanonicalTestIndex = () => {
  const byName = new Map();
  const byCategoryAndName = new Map();

  Object.entries(CANONICAL_TESTS_BY_CATEGORY).forEach(([categoryName, rows]) => {
    const normalizedCategory = normalizeLoose(categoryName);
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const testName = trimString(row?.name);
      if (!testName) return;
      const normalizedName = normalizeLoose(testName);
      const entry = {
        categoryName,
        testName,
        reference: trimString(row?.reference),
        unit: trimString(row?.unit)
      };
      byName.set(normalizedName, entry);
      byCategoryAndName.set(`${normalizedCategory}::${normalizedName}`, entry);
    });
  });

  return { byName, byCategoryAndName };
};

const ensureTestMasterValues = async (instituteId) => {
  if (!isValidObjectId(instituteId)) return null;

  const category = await ensureCategoryDoc(instituteId, TEST_CATEGORY_NAME);
  if (!category) return null;

  const canonicalCategoryNames = Array.isArray(CANONICAL_TEST_CATEGORIES) ? CANONICAL_TEST_CATEGORIES : [];
  const canonicalIndex = buildCanonicalTestIndex();
  // Avoid full repair scans on routine requests. Seed version 3 already has the
  // canonical shape used by this app; forcing deep repair for v3 was causing
  // 30-50s requests in production-like data volumes.
  const shouldRepair = Number(category.seed_version || 0) < 3;

  const categoryDocsByName = new Map();

  for (const categoryName of canonicalCategoryNames) {
    const categoryDoc = await ensureValueRecord({
      instituteId,
      categoryId: category._id,
      valueName: categoryName,
      meta: {
        kind: "category",
        canonical: true,
        canonicalCategoryName: categoryName
      }
    });
    if (categoryDoc) {
      categoryDocsByName.set(categoryName, categoryDoc);
    }
  }

  if (!shouldRepair) {
    return category;
  }

  const allRows = await MasterValue.find({
    Institute_ID: instituteId,
    category_id: category._id
  }).select("_id value_name normalized_value status meta name").lean();

  const exactCanonicalCategorySet = new Set(canonicalCategoryNames.map((value) => normalizeLoose(value)));
  const occupiedCategoryNames = new Set(
    allRows
      .filter((row) => trimString(row?.meta?.kind) === "category" && exactCanonicalCategorySet.has(normalizeLoose(row?.value_name)))
      .map((row) => normalizeLoose(row.value_name))
  );
  const testRowResolutionsByKey = new Map();

  for (const row of allRows) {
    const rowKind = trimString(row?.meta?.kind);
    const rowName = trimString(row?.value_name);
    const rowNameKey = normalizeLoose(rowName);

    if (rowKind === "category") {
      const canonicalCategoryName = getCanonicalTestCategoryName(rowName);
      const canonicalCategoryKey = normalizeLoose(canonicalCategoryName);
      const canonicalExists = exactCanonicalCategorySet.has(canonicalCategoryKey);

      if (occupiedCategoryNames.has(canonicalCategoryKey) && normalizeLoose(rowName) !== canonicalCategoryKey) {
        await archiveMasterValueRow(row, { kind: "category" });
        continue;
      }

      if (!canonicalExists) {
        await archiveMasterValueRow(row, { kind: "category" });
        continue;
      }

      if (canonicalCategoryName !== rowName && !canonicalCategoryNames.includes(rowName)) {
        const exactConflict = allRows.some(
          (item) =>
            String(item._id) !== String(row._id) &&
            trimString(item?.meta?.kind) === "category" &&
            normalizeLoose(item?.value_name) === canonicalCategoryKey
        );

        if (exactConflict) {
          await archiveMasterValueRow(row, { kind: "category" });
          continue;
        }
      }

      await MasterValue.updateOne(
        { _id: row._id },
        {
          $set: {
            value_name: canonicalCategoryName,
            name: canonicalCategoryName,
            normalized_value: normalize(canonicalCategoryName),
            status: "Active",
            meta: {
              ...(row.meta || {}),
              kind: "category",
              canonical: true,
              canonicalCategoryName
            }
          }
        }
      );
      occupiedCategoryNames.add(canonicalCategoryKey);
      continue;
    }

    if (rowKind !== "test") {
      continue;
    }

    const categoryFromAlias = trimString(row?.meta?.category || "");
    const canonicalCategoryName = getCanonicalTestCategoryName(categoryFromAlias);
    const canonicalCategoryNameFromTest = canonicalIndex.byName.get(rowNameKey)?.categoryName || "";
    const resolvedCategoryName = canonicalCategoryNameFromTest || canonicalCategoryName;
    const canonicalEntry = canonicalIndex.byName.get(rowNameKey) || canonicalIndex.byCategoryAndName.get(`${normalizeLoose(resolvedCategoryName)}::${rowNameKey}`);
    const aliasName = getCanonicalTestName(resolvedCategoryName, rowName);
    const resolvedTestName = canonicalEntry?.testName || aliasName || rowName;

    if (!canonicalEntry) {
      await archiveMasterValueRow(row, { kind: "test" });
      continue;
    }

    const canonicalKey = normalizeLoose(resolvedTestName);
    const entries = testRowResolutionsByKey.get(canonicalKey) || [];
    entries.push({
      row,
      resolvedCategoryName: canonicalEntry?.categoryName || resolvedCategoryName,
      resolvedTestName,
      resolvedCategoryDoc: categoryDocsByName.get(canonicalEntry?.categoryName || resolvedCategoryName),
      canonicalEntry,
      canonicalKey
    });
    testRowResolutionsByKey.set(canonicalKey, entries);
  }

  for (const entries of testRowResolutionsByKey.values()) {
    if (!entries.length) continue;

    const representative = entries[0];
    const resolvedTestName = representative.resolvedTestName;
    const resolvedCategoryName = representative.resolvedCategoryName;
    const resolvedCategoryDoc = representative.resolvedCategoryDoc;
    const canonicalEntry = representative.canonicalEntry;
    const keeper =
      entries.find((entry) => trimString(entry.row?.value_name) === resolvedTestName) ||
      entries.find((entry) => String(entry.row?.status || "Active") === "Active") ||
      entries[0];

    for (const entry of entries) {
      if (String(entry.row?._id) === String(keeper.row?._id)) continue;
      await archiveMasterValueRow(entry.row, {
        kind: "test",
        category: resolvedCategoryName,
        categoryNormalized: normalize(resolvedCategoryName),
        category_id: resolvedCategoryDoc?._id || entry.row?.meta?.category_id || null
      });
    }

    await MasterValue.updateOne(
      { _id: keeper.row._id },
      {
        $set: {
          value_name: resolvedTestName,
          name: resolvedTestName,
          normalized_value: normalize(resolvedTestName),
          status: "Active",
          meta: {
            ...(keeper.row.meta || {}),
            kind: "test",
            category: resolvedCategoryName,
            categoryNormalized: normalize(resolvedCategoryName),
            category_id: resolvedCategoryDoc?._id || keeper.row?.meta?.category_id || null,
            reference: canonicalEntry.reference || trimString(keeper.row?.meta?.reference),
            unit: canonicalEntry.unit || trimString(keeper.row?.meta?.unit),
            canonical: true,
            canonicalName: resolvedTestName
          }
        }
      }
    );
  }

  for (const [categoryName, tests] of Object.entries(CANONICAL_TESTS_BY_CATEGORY)) {
    const categoryDoc = categoryDocsByName.get(categoryName);
    if (!categoryDoc) continue;

    for (const test of tests || []) {
      const testName = trimString(test?.name);
      if (!testName) continue;

      const exactMatch = await MasterValue.findOne({
        Institute_ID: instituteId,
        category_id: category._id,
        "meta.kind": "test",
        normalized_value: normalize(testName),
        "meta.archived": { $ne: true }
      });

      if (exactMatch) {
        continue;
      }

      await ensureValueRecord({
        instituteId,
        categoryId: category._id,
        valueName: testName,
        status: "Active",
        meta: {
          kind: "test",
          category: categoryName,
          categoryNormalized: normalize(categoryName),
          category_id: categoryDoc._id,
          reference: trimString(test?.reference),
          unit: trimString(test?.unit),
          canonical: true,
          canonicalName: testName
        }
      });
    }
  }

  await MasterCategory.updateOne({ _id: category._id }, { $set: { seed_version: 4 } });
  category.seed_version = 4;

  return category;
};

const listMasterTests = async (instituteId, { includeInactive = false } = {}) => {
  if (!isValidObjectId(instituteId)) return [];

  const category = await ensureTestMasterValues(instituteId);
  if (!category) return [];

  const query = {
    Institute_ID: instituteId,
    category_id: category._id,
    "meta.kind": "test",
    "meta.archived": { $ne: true }
  };
  if (!includeInactive) {
    query.status = "Active";
  }

  const rows = await MasterValue.find(query).sort({ value_name: 1 }).lean();
  return rows.map((row) => ({
    _id: row._id,
    name: row.value_name,
    Test_Name: row.value_name,
    Group: trimString(row?.meta?.category),
    category_id: row?.meta?.category_id || null,
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
    "meta.kind": "test",
    "meta.archived": { $ne: true }
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
    "meta.archived": { $ne: true },
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
  const canonicalXrays = Array.isArray(DEFAULT_XRAY_TYPES) ? DEFAULT_XRAY_TYPES : [];
  const canonicalOrderMap = new Map();
  const bodyPartOrderMap = new Map();
  canonicalXrays.forEach((row, index) => {
    const xrayType = trimString(row?.Xray_Type);
    const bodyPart = trimString(row?.Body_Part);
    const key = `${normalize(xrayType)}::${normalize(bodyPart)}`;
    if (xrayType && bodyPart && !canonicalOrderMap.has(key)) {
      canonicalOrderMap.set(key, index);
    }
    if (bodyPart && !bodyPartOrderMap.has(normalize(bodyPart))) {
      bodyPartOrderMap.set(normalize(bodyPart), bodyPartOrderMap.size);
    }
  });
  const existingXrayCount = await MasterValue.countDocuments({
    Institute_ID: instituteId,
    category_id: category._id,
    "meta.kind": "xray"
  });
  if (Number(category.seed_version || 0) >= 3 && existingXrayCount >= canonicalXrays.length) {
    return category;
  }

  const legacyXrays = await Xray.find({})
    .select("Xray_Type Body_Part Side View Film_Size status")
    .sort({ Body_Part: 1, Xray_Type: 1 })
    .lean();

  const mergedXrays = new Map();
  let nextSortOrder = canonicalXrays.length;

  [...canonicalXrays, ...legacyXrays].forEach((row) => {
    const xrayType = trimString(row?.Xray_Type);
    const bodyPart = trimString(row?.Body_Part);
    if (!xrayType || !bodyPart) return;

    const key = `${normalize(xrayType)}::${normalize(bodyPart)}`;
    const sortOrder =
      canonicalOrderMap.has(key) ? canonicalOrderMap.get(key) : nextSortOrder++;
    const bodyPartSortOrder = bodyPartOrderMap.has(normalize(bodyPart))
      ? bodyPartOrderMap.get(normalize(bodyPart))
      : bodyPartOrderMap.size;
    if (!bodyPartOrderMap.has(normalize(bodyPart))) {
      bodyPartOrderMap.set(normalize(bodyPart), bodyPartSortOrder);
    }

    const existing = mergedXrays.get(key) || {};
    mergedXrays.set(key, {
      ...existing,
      Xray_Type: xrayType,
      Body_Part: bodyPart,
      Side: trimString(row?.Side) || existing.Side || "NA",
      View: trimString(row?.View) || existing.View || "",
      Film_Size: trimString(row?.Film_Size) || existing.Film_Size || "",
      category: trimString(row?.category || row?.Category) || existing.category || "",
      subcategory: trimString(row?.subcategory || row?.Subcategory || row?.subCategory) || existing.subcategory || "",
      status: row?.status === "Inactive" ? "Inactive" : existing.status || "Active",
      sortOrder,
      bodyPartSortOrder
    });
  });

  const bodyParts = sortUniqueStrings(
    [...canonicalXrays, ...legacyXrays].map((row) => row?.Body_Part)
  );

  for (const bodyPart of bodyParts) {
    await ensureValueRecord({
      instituteId,
      categoryId: category._id,
      valueName: bodyPart,
      meta: { kind: "xray_body_part", bodyPart }
    });
  }

  for (const row of mergedXrays.values()) {
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
        filmSize: trimString(row?.Film_Size),
        category: trimString(row?.category),
        subcategory: trimString(row?.subcategory),
        sortOrder: Number.isFinite(Number(row?.sortOrder)) ? Number(row.sortOrder) : 0,
        bodyPartSortOrder: Number.isFinite(Number(row?.bodyPartSortOrder)) ? Number(row.bodyPartSortOrder) : 0
      }
    });
  }

  await MasterCategory.updateOne({ _id: category._id }, { $set: { seed_version: 3 } });
  category.seed_version = 3;

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

  const rows = await MasterValue.find(query).lean();
  rows.sort((a, b) => {
    const orderA = Number(a?.meta?.sortOrder);
    const orderB = Number(b?.meta?.sortOrder);
    if (Number.isFinite(orderA) && Number.isFinite(orderB) && orderA !== orderB) {
      return orderA - orderB;
    }
    if (Number.isFinite(orderA) && !Number.isFinite(orderB)) return -1;
    if (!Number.isFinite(orderA) && Number.isFinite(orderB)) return 1;
    const categoryCompare = String(a?.meta?.category || "").localeCompare(String(b?.meta?.category || ""));
    if (categoryCompare !== 0) return categoryCompare;
    const subcategoryCompare = String(a?.meta?.subcategory || "").localeCompare(String(b?.meta?.subcategory || ""));
    if (subcategoryCompare !== 0) return subcategoryCompare;
    const bodyPartCompare = String(a?.meta?.bodyPart || "").localeCompare(String(b?.meta?.bodyPart || ""));
    if (bodyPartCompare !== 0) return bodyPartCompare;
    return String(a?.value_name || "").localeCompare(String(b?.value_name || ""));
  });
  return rows.map((row) => ({
    _id: row._id,
    Xray_Type: row.value_name,
    Body_Part: trimString(row?.meta?.bodyPart),
    Side: trimString(row?.meta?.side) || "NA",
    View: trimString(row?.meta?.view),
    Film_Size: trimString(row?.meta?.filmSize),
    category: trimString(row?.meta?.category),
    subcategory: trimString(row?.meta?.subcategory),
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

  const rows = await MasterValue.find(query).lean();
  rows.sort((a, b) => {
    const orderA = Number(a?.meta?.bodyPartSortOrder);
    const orderB = Number(b?.meta?.bodyPartSortOrder);
    if (Number.isFinite(orderA) && Number.isFinite(orderB) && orderA !== orderB) {
      return orderA - orderB;
    }
    if (Number.isFinite(orderA) && !Number.isFinite(orderB)) return -1;
    if (!Number.isFinite(orderA) && Number.isFinite(orderB)) return 1;
    return String(a?.value_name || "").localeCompare(String(b?.value_name || ""));
  });
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
