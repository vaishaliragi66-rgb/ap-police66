const mongoose = require("mongoose");
const MasterValue = require("../models/master_value");
const DiagnosticPanel = require("../models/diagnostic_panel");
const DiagnosticPanelTestMapping = require("../models/diagnostic_panel_test_mapping");
const {
  ensureTestMasterValues,
  trimString,
  normalize,
  findMasterTestByLooseName
} = require("./instituteMasterData");
const { DEFAULT_DIAGNOSTIC_PANELS } = require("../data/defaultDiagnosticPanels");

const normalizeLoose = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || "").trim());

const getTestsCategoryValue = async (instituteId, categoryName) => {
  const testsCategory = await ensureTestMasterValues(instituteId);
  if (!testsCategory) return null;

  return MasterValue.findOne({
    Institute_ID: instituteId,
    category_id: testsCategory._id,
    "meta.kind": "category",
    "meta.archived": { $ne: true },
    normalized_value: normalize(categoryName)
  }).lean();
};

const buildTestLookup = async (instituteId) => {
  const testsCategory = await ensureTestMasterValues(instituteId);
  if (!testsCategory) {
    return { byExact: new Map(), byLoose: new Map() };
  }

  const rows = await MasterValue.find({
    Institute_ID: instituteId,
    category_id: testsCategory._id,
    "meta.kind": "test",
    "meta.archived": { $ne: true },
    status: "Active"
  })
    .select("_id value_name normalized_value status meta name")
    .lean();

  const byExact = new Map();
  const byLoose = new Map();

  rows.forEach((row) => {
    const name = trimString(row?.value_name || row?.name);
    if (!name) return;
    const exactKey = normalize(name);
    const looseKey = normalizeLoose(name);
    if (exactKey && !byExact.has(exactKey)) {
      byExact.set(exactKey, row);
    }
    if (looseKey && !byLoose.has(looseKey)) {
      byLoose.set(looseKey, row);
    }
  });

  return { byExact, byLoose };
};

const resolveTestsForSelection = async (instituteId, { testNames = [], testIds = [] } = {}) => {
  const lookup = await buildTestLookup(instituteId);
  const resolved = [];
  const seen = new Set();

  const validIds = (testIds || [])
    .map((id) => String(id || "").trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (validIds.length) {
    const rows = await MasterValue.find({
      Institute_ID: instituteId,
      _id: { $in: validIds },
      "meta.kind": "test",
      "meta.archived": { $ne: true }
    })
      .select("_id value_name normalized_value status meta name")
      .lean();

    rows.forEach((row) => {
      const id = String(row._id || "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      resolved.push(row);
    });
  }

  for (const rawName of testNames || []) {
    const name = trimString(rawName);
    if (!name) continue;
    const exactKey = normalize(name);
    const looseKey = normalizeLoose(name);
    const match =
      lookup.byExact.get(exactKey) ||
      lookup.byLoose.get(looseKey) ||
      (await findMasterTestByLooseName(instituteId, name));

    if (!match) continue;
    const id = String(match._id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    resolved.push(match);
  }

  return resolved;
};

const upsertPanelWithMappings = async ({
  instituteId,
  panelId = null,
  name,
  categoryId,
  status = "Active",
  testIds = [],
  testNames = []
}) => {
  if (!isValidObjectId(instituteId)) {
    throw new Error("Valid instituteId is required");
  }

  const panelName = trimString(name);
  if (!panelName) {
    throw new Error("Panel name is required");
  }

  const resolvedCategoryId = trimString(categoryId);
  if (!isValidObjectId(resolvedCategoryId)) {
    throw new Error("Valid category_id is required");
  }

  const resolvedTests = await resolveTestsForSelection(instituteId, { testIds, testNames });
  const normalizedName = normalize(panelName);

  let panel = null;
  if (isValidObjectId(panelId)) {
    panel = await DiagnosticPanel.findOne({ _id: panelId, Institute_ID: instituteId });
  }
  if (!panel) {
    panel = await DiagnosticPanel.findOne({ Institute_ID: instituteId, normalized_name: normalizedName });
  }

  if (!panel) {
    panel = await DiagnosticPanel.create({
      Institute_ID: instituteId,
      name: panelName,
      normalized_name: normalizedName,
      category_id: resolvedCategoryId,
      status: status === "Inactive" ? "Inactive" : "Active"
    });
  } else {
    panel.name = panelName;
    panel.normalized_name = normalizedName;
    panel.category_id = resolvedCategoryId;
    panel.status = status === "Inactive" ? "Inactive" : "Active";
    await panel.save();
  }

  await DiagnosticPanelTestMapping.deleteMany({ panel_id: panel._id });
  if (resolvedTests.length) {
    await DiagnosticPanelTestMapping.insertMany(
      resolvedTests.map((test, index) => ({
        panel_id: panel._id,
        test_id: test._id,
        sequence_order: index + 1
      })),
      { ordered: false }
    );
  }

  return panel;
};

const ensureDefaultDiagnosticPanels = async (instituteId) => {
  if (!isValidObjectId(instituteId)) return [];
  await ensureTestMasterValues(instituteId);

  const resolved = [];
  for (const panelDef of DEFAULT_DIAGNOSTIC_PANELS) {
    const categoryValue = await getTestsCategoryValue(instituteId, panelDef.categoryName);
    if (!categoryValue?._id) continue;

    const resolvedTests = await resolveTestsForSelection(instituteId, { testNames: panelDef.tests });
    if (!resolvedTests.length) continue;

    const existing = await DiagnosticPanel.findOne({
      Institute_ID: instituteId,
      normalized_name: normalize(panelDef.name)
    }).lean();

    if (existing) {
      const existingMappings = await DiagnosticPanelTestMapping.find({
        panel_id: existing._id
      })
        .sort({ sequence_order: 1 })
        .lean();

      const existingIds = existingMappings.map((row) => String(row?.test_id || ""));
      const desiredIds = resolvedTests.map((row) => String(row?._id || ""));
      const sameMapping =
        String(existing.category_id || "") === String(categoryValue._id || "") &&
        String(existing.status || "Active") === "Active" &&
        existingIds.length === desiredIds.length &&
        existingIds.every((id, index) => id === desiredIds[index]);

      if (sameMapping) {
        resolved.push(existing);
        continue;
      }
    }

    const panel = await upsertPanelWithMappings({
      instituteId,
      name: panelDef.name,
      categoryId: categoryValue._id,
      status: "Active",
      testIds: resolvedTests.map((row) => row._id)
    });
    resolved.push(panel);
  }

  return resolved;
};

const deletePanelMappingsByTestIds = async (instituteId, testIds = []) => {
  if (!isValidObjectId(instituteId)) return 0;
  const ids = (testIds || []).map((id) => String(id || "").trim()).filter(Boolean);
  if (!ids.length) return 0;

  const result = await DiagnosticPanelTestMapping.deleteMany({ test_id: { $in: ids } });
  return result?.deletedCount || 0;
};

const deletePanelMappingsByPanelIds = async (instituteId, panelIds = []) => {
  if (!isValidObjectId(instituteId)) return 0;
  const ids = (panelIds || []).map((id) => String(id || "").trim()).filter(Boolean);
  if (!ids.length) return 0;

  const result = await DiagnosticPanelTestMapping.deleteMany({ panel_id: { $in: ids } });
  return result?.deletedCount || 0;
};

module.exports = {
  DEFAULT_DIAGNOSTIC_PANELS,
  ensureDefaultDiagnosticPanels,
  resolveTestsForSelection,
  upsertPanelWithMappings,
  deletePanelMappingsByTestIds,
  deletePanelMappingsByPanelIds
};
