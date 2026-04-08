import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  invalidateMasterDataCache,
  DEFAULT_MASTER_OPTIONS,
  getMergedMasterValueObjects,
  fetchMasterDataMap,
  getMasterMedicineEntries
} from "../../utils/masterData";
import diagnosticTestsByCategory from "../../data/diagnosticTests";
import { mergeXrayTypes } from "../../data/xrayTypes";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const FIXED_CATEGORIES = Object.keys(DEFAULT_MASTER_OPTIONS).filter(
  (categoryName) =>
    categoryName !== "Disease Categories" &&
    categoryName !== "Xray Categories" &&
    categoryName !== "Xray Body Parts" &&
    categoryName !== "Xray Views"
);

const sortUnique = (items) =>
  [...new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean))].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const makePairKey = (left, right) => `${normalizeText(left)}::${normalizeText(right)}`;
const makeTripleKey = (a, b, c) => `${normalizeText(a)}::${normalizeText(b)}::${normalizeText(c)}`;

const getStaticTestsStructure = () => {
  const testsByCategory = {};
  Object.keys(diagnosticTestsByCategory || {}).forEach((category) => {
    testsByCategory[category] = (diagnosticTestsByCategory[category] || []).map((test, idx) => ({
      id: `static-${category}-${idx}`,
      name: test.name,
      reference: test.reference || "",
      unit: test.unit || "",
      source: "static"
    }));
  });

  return {
    categories: Object.keys(testsByCategory).sort((a, b) => a.localeCompare(b)),
    testsByCategory
  };
};

const mergeTestsStructure = (base, incoming) => {
  const grouped = {};
  const addCategory = (category) => {
    const key = String(category || "").trim();
    if (!key) return;
    if (!grouped[key]) grouped[key] = [];
  };
  const addTest = (category, item) => {
    const key = String(category || "").trim();
    const name = String(item?.name || "").trim();
    if (!key || !name) return;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      id: item?.id,
      name,
      reference: item?.reference || "",
      unit: item?.unit || "",
      source: item?.source || "merged"
    });
  };

  (base?.categories || []).forEach(addCategory);
  Object.keys(base?.testsByCategory || {}).forEach((category) => {
    (base.testsByCategory[category] || []).forEach((item) => addTest(category, item));
  });

  (incoming?.categories || []).forEach(addCategory);
  Object.keys(incoming?.testsByCategory || {}).forEach((category) => {
    (incoming.testsByCategory[category] || []).forEach((item) => addTest(category, item));
  });

  Object.keys(grouped).forEach((category) => {
    const seen = new Set();
    grouped[category] = grouped[category]
      .filter((item) => {
        const dedupeKey = String(item.name || "").trim().toLowerCase();
        if (!dedupeKey || seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);
        return true;
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  });

  return {
    categories: Object.keys(grouped).sort((a, b) => a.localeCompare(b)),
    testsByCategory: grouped
  };
};

const MasterData = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [values, setValues] = useState([]);
  const [testsStructure, setTestsStructure] = useState({ categories: [], testsByCategory: {} });
  const [customTestMap, setCustomTestMap] = useState({});
  const [customTestCategoryMap, setCustomTestCategoryMap] = useState({});
  const [selectedTestCategory, setSelectedTestCategory] = useState("");
  const [newTestCategoryName, setNewTestCategoryName] = useState("");
  const [newTestName, setNewTestName] = useState("");
  const [newTestReference, setNewTestReference] = useState("");
  const [newTestUnit, setNewTestUnit] = useState("");
  const [diseasesStructure, setDiseasesStructure] = useState({ communicable: [], nonCommunicable: [] });
  const [customDiseaseMap, setCustomDiseaseMap] = useState({});
  const [selectedDiseaseGroup, setSelectedDiseaseGroup] = useState("Communicable");
  const [newDiseaseName, setNewDiseaseName] = useState("");
  const [xrayTypes, setXrayTypes] = useState([]);
  const [selectedXrayBodyPart, setSelectedXrayBodyPart] = useState("");
  const [newXrayBodyPart, setNewXrayBodyPart] = useState("");
  const [newXrayName, setNewXrayName] = useState("");
  const [newXraySide, setNewXraySide] = useState("NA");
  const [newXrayFilmSize, setNewXrayFilmSize] = useState("");
  const [customBodyPartMap, setCustomBodyPartMap] = useState({});
  const [medicinesStructure, setMedicinesStructure] = useState({ medicineTypes: [], dosageForms: [], medicines: [], medicinesByType: {} });
  const [customMedicineMap, setCustomMedicineMap] = useState({});
  const [customMedicineTypeMap, setCustomMedicineTypeMap] = useState({});
  const [selectedMedicineType, setSelectedMedicineType] = useState("");
  const [selectedMedicineDosageForm, setSelectedMedicineDosageForm] = useState("");
  const [newMedicineName, setNewMedicineName] = useState("");
  const [newMedicineType, setNewMedicineType] = useState("");
  const [newMedicineDosageForm, setNewMedicineDosageForm] = useState("");
  const [newMedicineStrength, setNewMedicineStrength] = useState("");
  const [showImportArea, setShowImportArea] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [newValueName, setNewValueName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isInstituteAdmin = useMemo(() => localStorage.getItem("role") === "institute", []);

  const loadCategories = async () => {
    const res = await axios.get(`${BACKEND_URL}/master-data-api/categories`);
    let data = (Array.isArray(res.data) ? res.data : [])
      .filter((item) => FIXED_CATEGORIES.includes(item.category_name))
      .sort((a, b) => FIXED_CATEGORIES.indexOf(a.category_name) - FIXED_CATEGORIES.indexOf(b.category_name));

    if (isInstituteAdmin) {
      const existingNames = new Set(data.map((item) => item.category_name));
      const missingCategories = FIXED_CATEGORIES.filter((categoryName) => !existingNames.has(categoryName));

      if (missingCategories.length > 0) {
        let createdAny = false;
        await Promise.all(
          missingCategories.map(async (categoryName) => {
            try {
              await axios.post(`${BACKEND_URL}/master-data-api/categories`, { category_name: categoryName });
              createdAny = true;
            } catch (err) {
              if (err?.response?.status !== 409 && err?.response?.status !== 403) {
                console.warn(`Skipping auto-create for category: ${categoryName}`, err);
              }
            }
          })
        );

        if (createdAny) {
          const refreshed = await axios.get(`${BACKEND_URL}/master-data-api/categories`);
          data = (Array.isArray(refreshed.data) ? refreshed.data : [])
            .filter((item) => FIXED_CATEGORIES.includes(item.category_name))
            .sort((a, b) => FIXED_CATEGORIES.indexOf(a.category_name) - FIXED_CATEGORIES.indexOf(b.category_name));
        }
      }
    }
    setCategories(data);

    const preferred = data.find((item) => item.category_name === "Blood Groups") || data[0] || null;

    if (!selectedCategoryId && preferred) {
      setSelectedCategoryId(preferred._id || "");
    } else if (selectedCategoryId && !data.some((item) => item._id === selectedCategoryId)) {
      setSelectedCategoryId(preferred?._id || "");
    }
  };

  const loadValues = async (categoryId) => {
    if (!categoryId) {
      setValues([]);
      return;
    }
    const categoryName = categories.find((item) => item._id === categoryId)?.category_name || "";
    const res = await axios.get(`${BACKEND_URL}/master-data-api/values`, {
      params: { categoryId }
    });
    const fetched = Array.isArray(res.data) ? res.data : [];
    const merged = getMergedMasterValueObjects(
      {
        [categoryName]: fetched
      },
      categoryName
    );
    setValues(merged);
  };

  const loadTestsStructure = async () => {
    const staticStructure = getStaticTestsStructure();
    const staticCategories = staticStructure.categories || [];
    const preferredStatic = staticCategories.includes("HEMATOLOGY")
      ? "HEMATOLOGY"
      : staticCategories[0] || "";
    try {
      const [res, valuesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/master-data-api/tests-structure`),
        selectedCategoryId
          ? axios.get(`${BACKEND_URL}/master-data-api/values`, { params: { categoryId: selectedCategoryId } })
          : Promise.resolve({ data: [] })
      ]);

      const masterValues = Array.isArray(valuesRes.data) ? valuesRes.data : [];
      const testMap = {};
      const testCategoryMap = {};
      masterValues
        .filter((item) => item?.meta?.kind === "category")
        .forEach((item) => {
          const key = normalizeText(item?.value_name);
          if (key && !testCategoryMap[key]) testCategoryMap[key] = item;
        });
      masterValues
        .filter((item) => item?.meta?.kind === "test")
        .forEach((item) => {
          const key = makePairKey(item?.meta?.category, item?.value_name);
          if (key !== "::") testMap[key] = item;
        });
      setCustomTestCategoryMap(testCategoryMap);
      setCustomTestMap(testMap);

      const data = mergeTestsStructure(staticStructure, res.data || { categories: [], testsByCategory: {} });
      const withMeta = {
        ...data,
        testsByCategory: Object.fromEntries(
          Object.entries(data.testsByCategory || {}).map(([category, rows]) => [
            category,
            (rows || []).map((row) => {
              const masterValue = testMap[makePairKey(category, row?.name)] || null;
              return {
                ...row,
                masterValue,
                status: masterValue?.status || "Active"
              };
            })
          ])
        )
      };
      setTestsStructure(withMeta);
      const shouldKeepSelected = selectedTestCategory && staticCategories.includes(selectedTestCategory);
      if (shouldKeepSelected) {
        setSelectedTestCategory(selectedTestCategory);
      } else if (preferredStatic && withMeta.categories.includes(preferredStatic)) {
        setSelectedTestCategory(preferredStatic);
      } else {
        setSelectedTestCategory(withMeta.categories[0] || "");
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status && status !== 404) {
        throw err;
      }

      const [testsRes, valuesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/diagnosis-api/tests`).catch(() => ({ data: [] })),
        selectedCategoryId
          ? axios
              .get(`${BACKEND_URL}/master-data-api/values`, { params: { categoryId: selectedCategoryId } })
              .catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] })
      ]);

      const diagnosisTests = Array.isArray(testsRes.data) ? testsRes.data : [];
      const masterValues = Array.isArray(valuesRes.data) ? valuesRes.data : [];
      const testMap = {};
      const testCategoryMap = {};
      masterValues
        .filter((item) => item?.meta?.kind === "category")
        .forEach((item) => {
          const key = normalizeText(item?.value_name);
          if (key && !testCategoryMap[key]) testCategoryMap[key] = item;
        });
      masterValues
        .filter((item) => item?.meta?.kind === "test")
        .forEach((item) => {
          const key = makePairKey(item?.meta?.category, item?.value_name);
          if (key !== "::") testMap[key] = item;
        });
      setCustomTestCategoryMap(testCategoryMap);
      setCustomTestMap(testMap);

      const grouped = { ...staticStructure.testsByCategory };
      const knownCategories = new Set(Object.keys(grouped));

      diagnosisTests.forEach((test) => {
        const category = String(test?.Group || "").trim();
        const name = String(test?.Test_Name || "").trim();
        if (!category || !name) return;
        if (!grouped[category]) grouped[category] = [];
        knownCategories.add(category);
        grouped[category].push({
          id: test._id,
          name,
          reference: test.Reference_Range || "",
          unit: test.Units || "",
          source: "diagnosis-test"
        });
      });

      masterValues
        .filter((item) => item?.meta?.kind === "category")
        .forEach((item) => {
          const category = String(item?.value_name || "").trim();
          if (!category) return;
          if (!grouped[category]) grouped[category] = [];
          knownCategories.add(category);
        });

      masterValues
        .filter((item) => item?.meta?.kind === "test")
        .forEach((item) => {
          const category = String(item?.meta?.category || "").trim();
          const name = String(item?.value_name || "").trim();
          if (!category || !name) return;
          if (!grouped[category]) grouped[category] = [];
          knownCategories.add(category);
          grouped[category].push({
            id: item._id,
            name,
            reference: item?.meta?.reference || "",
            unit: item?.meta?.unit || "",
            source: "master"
          });
        });

      Object.keys(grouped).forEach((category) => {
        const seen = new Set();
        grouped[category] = grouped[category]
          .filter((item) => {
            const key = String(item?.name || "").trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      });

      const merged = mergeTestsStructure(staticStructure, {
        categories: [...knownCategories],
        testsByCategory: grouped
      });
      merged.testsByCategory = Object.fromEntries(
        Object.entries(merged.testsByCategory || {}).map(([category, rows]) => [
          category,
          (rows || []).map((row) => {
            const masterValue = testMap[makePairKey(category, row?.name)] || null;
            return {
              ...row,
              masterValue,
              status: masterValue?.status || "Active"
            };
          })
        ])
      );
      const categories = merged.categories;
      setTestsStructure(merged);
      const shouldKeepSelected = selectedTestCategory && staticCategories.includes(selectedTestCategory);
      if (shouldKeepSelected) {
        setSelectedTestCategory(selectedTestCategory);
      } else if (preferredStatic && categories.includes(preferredStatic)) {
        setSelectedTestCategory(preferredStatic);
      } else {
        setSelectedTestCategory(categories[0] || "");
      }
    }
  };

  const loadDiseasesStructure = async () => {
    try {
      const [res, valuesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/master-data-api/diseases-structure`),
        selectedCategoryId
          ? axios.get(`${BACKEND_URL}/master-data-api/values`, { params: { categoryId: selectedCategoryId } })
          : Promise.resolve({ data: [] })
      ]);

      const data = res.data || {};
      const masterValues = Array.isArray(valuesRes.data) ? valuesRes.data : [];
      const diseaseMap = {};
      masterValues
        .filter((item) => item?.meta?.kind === "disease")
        .forEach((item) => {
          const key = makePairKey(item?.meta?.group, item?.value_name);
          if (key !== "::") diseaseMap[key] = item;
        });
      setCustomDiseaseMap(diseaseMap);

      const buildGroupRows = (group, names) =>
        sortUnique(names).map((name) => {
          const masterValue = diseaseMap[makePairKey(group, name)] || null;
          return {
            name,
            group,
            masterValue,
            status: masterValue?.status || "Active"
          };
        });

      setDiseasesStructure({
        communicable: buildGroupRows("Communicable", Array.isArray(data.communicable) ? data.communicable : []),
        nonCommunicable: buildGroupRows("Non-Communicable", Array.isArray(data.nonCommunicable) ? data.nonCommunicable : [])
      });
    } catch (err) {
      const status = err?.response?.status;
      if (status && status !== 404) {
        throw err;
      }

      const instituteId = localStorage.getItem("instituteId") || "";
      const [listRes, cdRes, ncdRes, valuesRes] = await Promise.all([
        axios
          .get(`${BACKEND_URL}/disease-list/static`, {
            params: instituteId ? { instituteId } : {}
          })
          .catch(() => ({ data: {} })),
        axios
          .get(`${BACKEND_URL}/disease-master-api/cd`, {
            params: instituteId ? { instituteId } : {}
          })
          .catch(() => ({ data: [] })),
        axios
          .get(`${BACKEND_URL}/disease-master-api/ncd`, {
            params: instituteId ? { instituteId } : {}
          })
          .catch(() => ({ data: [] })),
        selectedCategoryId
          ? axios
              .get(`${BACKEND_URL}/master-data-api/values`, { params: { categoryId: selectedCategoryId } })
              .catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] })
      ]);

      const body = listRes.data || {};
      const cdMaster = Array.isArray(cdRes.data)
        ? cdRes.data.map((item) => (typeof item === "string" ? item : item?.name)).filter(Boolean)
        : [];
      const ncdMaster = Array.isArray(ncdRes.data)
        ? ncdRes.data.map((item) => (typeof item === "string" ? item : item?.name)).filter(Boolean)
        : [];
      const masterValues = Array.isArray(valuesRes.data) ? valuesRes.data : [];
      const communicable = [
        ...(Array.isArray(body.communicable) ? body.communicable : []),
        ...cdMaster
      ];
      const nonCommunicable = [
        ...(Array.isArray(body.nonCommunicable) ? body.nonCommunicable : []),
        ...ncdMaster
      ];

      masterValues
        .filter((item) => item?.meta?.kind === "disease")
        .forEach((item) => {
          const group = String(item?.meta?.group || "").trim();
          const name = String(item?.value_name || "").trim();
          if (!name) return;
          if (group === "Communicable") communicable.push(name);
          if (group === "Non-Communicable") nonCommunicable.push(name);
        });

      const diseaseMap = {};
      masterValues
        .filter((item) => item?.meta?.kind === "disease")
        .forEach((item) => {
          const key = makePairKey(item?.meta?.group, item?.value_name);
          if (key !== "::") diseaseMap[key] = item;
        });
      setCustomDiseaseMap(diseaseMap);

      const buildGroupRows = (group, names) =>
        sortUnique(names).map((name) => {
          const masterValue = diseaseMap[makePairKey(group, name)] || null;
          return {
            name,
            group,
            masterValue,
            status: masterValue?.status || "Active"
          };
        });

      setDiseasesStructure({
        communicable: buildGroupRows("Communicable", communicable),
        nonCommunicable: buildGroupRows("Non-Communicable", nonCommunicable)
      });
    }
  };

  const loadMedicinesStructure = async () => {
    try {
      const instituteId = localStorage.getItem("instituteId") || "";
      const res = await axios.get(`${BACKEND_URL}/master-data-api/medicines-structure`, {
        params: instituteId ? { instituteId } : {}
      });
      // support both old shape (direct fields) and new shape { success, data }
      const data = res.data && res.data.data ? res.data.data : res.data || {};

      const medicineTypeEntries = Array.isArray(data.medicineTypeEntries) ? data.medicineTypeEntries : [];
      const apiMedicines = Array.isArray(data.medicines) ? data.medicines : [];

      // Also fetch masterMap (local DB map) to include any pasted/built-in medicines
      let masterMedicines = [];
      try {
        const masterMap = await fetchMasterDataMap();
        masterMedicines = getMasterMedicineEntries(masterMap || {});
      } catch (e) {
        masterMedicines = [];
      }

      // Merge API medicines (prefer records with _id) and masterMedicines (fallback pasted/built-in)
      const mergedMap = new Map();
      const makeMergeKey = (it) =>
        `${String(it?.medicineType || it?.meta?.medicineType || "").trim().toLowerCase()}::${String(
          it?.dosageForm || it?.meta?.dosageForm || it?.meta?.form || ""
        ).trim().toLowerCase()}::${String(it?.value_name || it?.value_name || "").trim().toLowerCase()}::${String(
          it?.strength || it?.meta?.strength || ""
        ).trim().toLowerCase()}`;

      apiMedicines.forEach((it) => {
        const key = makeMergeKey(it);
        if (!mergedMap.has(key)) mergedMap.set(key, it);
      });

      masterMedicines.forEach((it, idx) => {
        const key = makeMergeKey(it);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            _id: `master-${idx}`,
            value_name: it.value_name,
            medicineType: it.medicineType,
            dosageForm: it.dosageForm,
            strength: it.strength,
            status: it.status || "Active"
          });
        }
      });

      const medicines = Array.from(mergedMap.values());

      // Build combined medicine types and dosage forms from API + master map so pasted values are visible
      const apiTypes = Array.isArray(data.medicineTypes) ? data.medicineTypes : [];
      const masterTypes = masterMedicines.map((m) => m.medicineType).filter(Boolean);
      const combinedTypes = [...new Set([...apiTypes, ...masterTypes])];

      const apiDosageForms = Array.isArray(data.dosageForms) ? data.dosageForms : [];
      const masterForms = masterMedicines.map((m) => m.dosageForm).filter(Boolean);
      const combinedForms = [...new Set([...apiDosageForms, ...masterForms])];

      // Merge medicineTypeEntries with any master types missing in API entries
      const masterTypeEntries = masterTypes
        .filter((t) => t)
        .map((t) => ({ _id: null, value_name: t, status: "Active" }));
      const combinedTypeEntriesMap = new Map();
      [...medicineTypeEntries, ...masterTypeEntries].forEach((it) => {
        const key = normalizeText(it?.value_name);
        if (!combinedTypeEntriesMap.has(key)) combinedTypeEntriesMap.set(key, it);
      });
      const combinedTypeEntries = Array.from(combinedTypeEntriesMap.values());

      // Debug: log fetched medicines data to help diagnose empty UI
      try {
        // eslint-disable-next-line no-console
        console.debug("loadMedicinesStructure: medicineTypes:", Array.isArray(data.medicineTypes) ? data.medicineTypes.length : 0, data.medicineTypes);
        // eslint-disable-next-line no-console
        console.debug("loadMedicinesStructure: medicines count:", medicines.length, medicines.slice(0, 10));
      } catch (e) {
        // ignore logging failures
      }

      const medicineTypeMap = {};
      (combinedTypeEntries || []).forEach((item) => {
        const key = normalizeText(item?.value_name);
        if (key && !medicineTypeMap[key]) medicineTypeMap[key] = item;
      });
      setCustomMedicineTypeMap(medicineTypeMap);

      const medicineMap = {};
      medicines.forEach((item) => {
        const key = makeTripleKey(item?.medicineType, item?.dosageForm, item?.value_name);
        if (key !== "::" && item?._id) {
          medicineMap[key] = {
            _id: item._id,
            value_name: item.value_name,
            status: item.status || "Active",
            meta: {
              kind: "medicine",
              medicineType: item.medicineType || "",
              dosageForm: item.dosageForm || "",
              strength: item.strength || ""
            }
          };
        }
      });
      setCustomMedicineMap(medicineMap);

      const buildTypeRows = (type, entries) =>
        entries
          .filter((entry) => normalizeText(entry.medicineType) === normalizeText(type))
          .map((entry) => {
            const masterValue =
              medicineMap[makeTripleKey(entry.medicineType, entry.dosageForm, entry.value_name)] || null;
            return {
              value_name: entry.value_name,
              medicineType: entry.medicineType || "",
              dosageForm: entry.dosageForm || "",
              strength: entry.strength || "",
              masterValue,
              status: masterValue?.status || entry.status || "Active"
            };
          })
          .sort((a, b) => a.value_name.localeCompare(b.value_name));

      const medicineTypes = combinedTypes || [];
      const medicinesByType = {};

      medicineTypes.forEach((type) => {
        medicinesByType[type] = buildTypeRows(type, medicines);
      });

      // Debug: inspect computed medicinesByType keys and counts
      try {
        // eslint-disable-next-line no-console
        console.debug("loadMedicinesStructure: medicinesByType keys:", Object.keys(medicinesByType).map((k) => [k, medicinesByType[k]?.length || 0]));
      } catch (e) {
        // ignore
      }
      setMedicinesStructure({
        medicineTypes,
        medicines,
        medicinesByType,
        dosageForms: combinedForms || []
      });

      if (medicineTypes.length > 0) {
        if (!selectedMedicineType || !medicineTypes.includes(selectedMedicineType)) {
          setSelectedMedicineType(medicineTypes[0]);
        }
      } else {
        setSelectedMedicineType("");
      }

      setSelectedMedicineDosageForm("");
    } catch (err) {
      const status = err?.response?.status;
      if (status && status !== 404) {
        throw err;
      }
      // If endpoint doesn't exist, show empty structure
      setMedicinesStructure({ medicineTypes: [], dosageForms: [], medicines: [], medicinesByType: {} });
    }
  };

  const loadXrayTypes = async () => {
    try {
      const [xrayRes, bodyPartRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/xray-api/types`),
        axios.get(`${BACKEND_URL}/xray-api/body-parts`).catch(() => ({ data: [] }))
      ]);
      
      const rows = Array.isArray(xrayRes.data) ? xrayRes.data : [];
      const merged = mergeXrayTypes(rows).filter((item) => String(item?.status || "Active") === "Active");
      setXrayTypes(merged);

      // Build map of custom body parts
      const bodyPartMap = {};
      const bodyPartsData = Array.isArray(bodyPartRes.data) ? bodyPartRes.data : [];
      bodyPartsData.forEach((bp) => {
        if (bp?._id && bp?.Body_Part) {
          bodyPartMap[String(bp.Body_Part).trim().toLowerCase()] = bp;
        }
      });
      setCustomBodyPartMap(bodyPartMap);

      if (!selectedXrayBodyPart && merged.length > 0) {
        setSelectedXrayBodyPart(String(merged[0]?.Body_Part || ""));
      }
    } catch (err) {
      console.error(err);
      const fallback = mergeXrayTypes([]);
      setXrayTypes(fallback);
      setCustomBodyPartMap({});
      setSelectedXrayBodyPart(fallback[0]?.Body_Part || "");
      throw err;
    }
  };

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      await loadCategories();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load master data categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId || categories.length === 0) return;

    const selected = categories.find((c) => c._id === selectedCategoryId);
    if (!selected) return;

    const loader =
      selected.category_name === "Tests"
        ? loadTestsStructure
        : selected.category_name === "Diseases"
        ? loadDiseasesStructure
        : selected.category_name === "Medicines"
        ? loadMedicinesStructure
        : selected.category_name === "Xray Types"
        ? loadXrayTypes
        : () => loadValues(selectedCategoryId);

    loader().catch((err) => {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load values");
    });
  }, [selectedCategoryId, categories]);

  const selectedCategory = categories.find((c) => c._id === selectedCategoryId) || null;

  const filteredValues = values.filter((item) =>
    item.value_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredTests = (testsStructure.testsByCategory?.[selectedTestCategory] || []).filter((item) =>
    String(item.name || "").toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredDiseases =
    selectedDiseaseGroup === "Communicable"
      ? diseasesStructure.communicable.filter((item) =>
          String(item?.name || "").toLowerCase().includes(searchText.toLowerCase())
        )
      : diseasesStructure.nonCommunicable.filter((item) =>
          String(item?.name || "").toLowerCase().includes(searchText.toLowerCase())
        );

  const medicinesBySelectedType = medicinesStructure.medicinesByType?.[selectedMedicineType] || [];
  const fallbackMedicines = (medicinesStructure.medicines || []).filter((item) =>
    (!selectedMedicineType || normalizeText(item.medicineType) === normalizeText(selectedMedicineType)) &&
    (!selectedMedicineDosageForm || normalizeText(item.dosageForm) === normalizeText(selectedMedicineDosageForm))
  );

  const filteredMedicines = (medicinesBySelectedType.length ? medicinesBySelectedType : fallbackMedicines)
    .filter((item) => String(item.value_name || "").toLowerCase().includes(searchText.toLowerCase()));

  const xrayBodyParts = useMemo(
    () =>
      [...new Set([...xrayTypes, newXrayBodyPart, selectedXrayBodyPart].map((item) => String(item?.Body_Part || item || "").trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [xrayTypes, newXrayBodyPart, selectedXrayBodyPart]
  );

  const filteredXrays = xrayTypes.filter((item) => {
    const partMatch = !selectedXrayBodyPart || String(item.Body_Part || "").trim() === selectedXrayBodyPart;
    const searchMatch =
      !searchText.trim() ||
      String(item.Body_Part || "").toLowerCase().includes(searchText.toLowerCase()) ||
      String(item.Xray_Type || "").toLowerCase().includes(searchText.toLowerCase());
    return partMatch && searchMatch;
  });

  const handleEditSpecialValue = async (item, reloadFn) => {
    const itemId = item?.masterValue?._id || item?.id;

    const updated = window.prompt("Edit value", item.name || item.value_name);
    if (updated === null) return;
    const valueName = updated.trim();
    if (!valueName) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (item?.masterValue?._id) {
        await axios.put(`${BACKEND_URL}/master-data-api/values/${item.masterValue._id}`, {
          value_name: valueName,
          meta: item.masterValue.meta || {}
        });
        setMessage("Value updated successfully");
      } else {
        setMessage("Built-in items cannot be edited");
      }
      await reloadFn();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update value");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSpecialValue = async (item, reloadFn) => {
    const itemId = item?.masterValue?._id || item?.id;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (item?.masterValue?._id) {
        await axios.put(`${BACKEND_URL}/master-data-api/values/${item.masterValue._id}`, {
          status: item.status === "Active" ? "Inactive" : "Active"
        });
        setMessage("Value status updated");
      } else {
        setMessage("Built-in items cannot be deactivated");
      }
      await reloadFn();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to toggle status");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSpecialValue = async (item, reloadFn) => {
    const itemId = item?.masterValue?._id || item?.id;

    const ok = window.confirm(`Delete '${item.name || item.value_name}'?`);
    if (!ok) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (item?.masterValue?._id) {
        await axios.delete(`${BACKEND_URL}/master-data-api/values/${item.masterValue._id}`);
        setMessage("Value deleted successfully");
      } else {
        setMessage("Built-in items cannot be deleted directly");
      }
      await reloadFn();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to delete value");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTestCategory = async (categoryName) => {
    if (!categoryName) {
      setError("Category name is required");
      return;
    }

    const categoryKey = normalizeText(categoryName);
    const masterValue = customTestCategoryMap[categoryKey];
    
    if (!masterValue || !masterValue._id) {
      console.log("Info: Built-in category (no delete needed)", categoryName);
      setMessage("Built-in categories cannot be deleted");
      return;
    }

    const ok = window.confirm(`Delete test category '${categoryName}' and all its tests?`);
    if (!ok) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await axios.delete(`${BACKEND_URL}/master-data-api/tests/category/${masterValue._id}`);
      setMessage("Test category deleted successfully");
      await loadTestsStructure();
      invalidateMasterDataCache();
    } catch (err) {
      console.error("Delete category error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to delete test category";
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddValue = async () => {
    if (!selectedCategoryId || !newValueName.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.post(`${BACKEND_URL}/master-data-api/values`, {
        category_id: selectedCategoryId,
        value_name: newValueName.trim()
      });
      setNewValueName("");
      setMessage("Value added successfully");
      await loadValues(selectedCategoryId);
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to add value");
    } finally {
      setSaving(false);
    }
  };

  const handleEditValue = async (item) => {
    const updated = window.prompt("Edit value", item.value_name);
    if (updated === null) return;
    const valueName = updated.trim();
    if (!valueName) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (item?.isDefault) {
        setMessage("Built-in values cannot be renamed directly");
        return;
      }
      await axios.put(`${BACKEND_URL}/master-data-api/values/${item._id}`, {
        value_name: valueName
      });
      setMessage("Value updated successfully");
      await loadValues(selectedCategoryId);
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update value");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleValue = async (item) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (item?.isDefault) {
        setMessage("Built-in values cannot be deactivated directly");
        return;
      }
      await axios.put(`${BACKEND_URL}/master-data-api/values/${item._id}`, {
        status: item.status === "Active" ? "Inactive" : "Active"
      });
      setMessage("Value status updated");
      await loadValues(selectedCategoryId);
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to toggle status");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteValue = async (item) => {
    const ok = window.confirm(`Delete '${item.value_name}'?`);
    if (!ok) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (item?.isDefault) {
        setMessage("Built-in values cannot be deleted directly");
        return;
      }
      await axios.delete(`${BACKEND_URL}/master-data-api/values/${item._id}`);
      setMessage("Value deleted successfully");
      await loadValues(selectedCategoryId);
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to delete value");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTestCategory = async () => {
    if (!newTestCategoryName.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      // Use the primary endpoint which handles Tests category internally
      const response = await axios.post(`${BACKEND_URL}/master-data-api/tests/category`, {
        name: newTestCategoryName.trim()
      });
      setNewTestCategoryName("");
      setMessage("Test category added successfully");
      await loadTestsStructure();
      invalidateMasterDataCache();
    } catch (err) {
      console.error("Error adding test category:", err);
      setError(err.response?.data?.message || "Failed to add test category");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTest = async () => {
    if (!selectedTestCategory || !newTestName.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      try {
        await axios.post(`${BACKEND_URL}/master-data-api/tests`, {
          category: selectedTestCategory,
          testName: newTestName.trim(),
          referenceRange: newTestReference.trim(),
          unit: newTestUnit.trim()
        });
      } catch (err) {
        if (err?.response?.status !== 404) throw err;

        await axios.post(`${BACKEND_URL}/diagnosis-api/tests/add`, {
          Test_Name: newTestName.trim(),
          Group: selectedTestCategory,
          Reference_Range: newTestReference.trim(),
          Units: newTestUnit.trim()
        });

        await axios
          .post(`${BACKEND_URL}/master-data-api/values`, {
            category_id: selectedCategoryId,
            value_name: selectedTestCategory,
            meta: { kind: "category" }
          })
          .catch((postErr) => {
            if (postErr?.response?.status !== 409) throw postErr;
          });

        await axios
          .post(`${BACKEND_URL}/master-data-api/values`, {
            category_id: selectedCategoryId,
            value_name: newTestName.trim(),
            meta: {
              kind: "test",
              category: selectedTestCategory,
              reference: newTestReference.trim(),
              unit: newTestUnit.trim()
            }
          })
          .catch((postErr) => {
            if (postErr?.response?.status !== 409) throw postErr;
          });
      }
      setNewTestName("");
      setNewTestReference("");
      setNewTestUnit("");
      setMessage("Test added successfully");
      await loadTestsStructure();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to add test");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDisease = async () => {
    if (!newDiseaseName.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      try {
        await axios.post(`${BACKEND_URL}/master-data-api/diseases`, {
          group: selectedDiseaseGroup,
          diseaseName: newDiseaseName.trim()
        });
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
        await axios.post(`${BACKEND_URL}/master-data-api/values`, {
          category_id: selectedCategoryId,
          value_name: newDiseaseName.trim(),
          meta: { kind: "disease", group: selectedDiseaseGroup }
        });
      }
      setNewDiseaseName("");
      setMessage("Disease added successfully");
      await loadDiseasesStructure();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to add disease");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedicine = async () => {
    if (!newMedicineName.trim() || !selectedMedicineType.trim() || !newMedicineDosageForm.trim() || !newMedicineStrength.trim()) {
      setError("Please fill in all medicine fields (name, type, dosage form, strength)");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      try {
        await axios.post(`${BACKEND_URL}/master-data-api/medicines`, {
          medicineName: newMedicineName.trim(),
          medicineType: selectedMedicineType.trim(),
          dosageForm: newMedicineDosageForm.trim(),
          strength: newMedicineStrength.trim()
        });
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
        await axios.post(`${BACKEND_URL}/master-data-api/values`, {
          category_id: selectedCategoryId,
          value_name: newMedicineName.trim(),
          meta: {
            kind: "medicine",
            medicineType: selectedMedicineType.trim(),
            dosageForm: newMedicineDosageForm.trim(),
            type: newMedicineDosageForm.trim(),
            strength: newMedicineStrength.trim(),
            typeNormalized: selectedMedicineType.trim().toLowerCase()
          }
        });
      }
      setNewMedicineName("");
      setNewMedicineDosageForm("");
      setNewMedicineStrength("");
      setMessage("Medicine added successfully");
      await loadMedicinesStructure();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to add medicine");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedicineType = async () => {
    if (!newMedicineType.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.post(`${BACKEND_URL}/master-data-api/medicines/type`, {
        name: newMedicineType.trim()
      });
      setNewMedicineType("");
      setMessage("Medicine type added successfully");
      await loadMedicinesStructure();
      invalidateMasterDataCache();
    } catch (err) {
      console.error("Error adding medicine type:", err);
      setError(err.response?.data?.message || "Failed to add medicine type");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMedicineType = async (medicineType) => {
    const medicineTypeKey = String(medicineType || "").trim().toLowerCase();
    const medicineTypeRecord = customMedicineTypeMap[medicineTypeKey];

    if (!medicineTypeRecord || !medicineTypeRecord._id) {
      setError("This is a built-in medicine type and cannot be deleted");
      return;
    }

    const ok = window.confirm(`Delete medicine type '${medicineType}'?`);
    if (!ok) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.delete(`${BACKEND_URL}/master-data-api/values/${medicineTypeRecord._id}`);
      setMessage("Medicine type deleted successfully");
      if (selectedMedicineType === medicineType) {
        setSelectedMedicineType("");
      }
      await loadMedicinesStructure();
      invalidateMasterDataCache();
    } catch (err) {
      console.error("Delete medicine type error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to delete medicine type";
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddXray = async () => {
    const bodyPart = String(newXrayBodyPart || selectedXrayBodyPart || "").trim();
    const xrayType = String(newXrayName || "").trim();
    if (!bodyPart || !xrayType) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.post(`${BACKEND_URL}/xray-api/xrays/add`, {
        Body_Part: bodyPart,
        Xray_Type: xrayType,
        Side: newXraySide || "NA",
        View: "",
        Film_Size: newXrayFilmSize.trim()
      });
      setNewXrayBodyPart("");
      setNewXrayName("");
      setNewXraySide("NA");
      setNewXrayFilmSize("");
      setMessage("X-ray added successfully");
      await loadXrayTypes();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to add x-ray");
    } finally {
      setSaving(false);
    }
  };

  const handleAddXrayBodyPart = async () => {
    const bodyPart = String(newXrayBodyPart || "").trim();
    if (!bodyPart) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.post(`${BACKEND_URL}/xray-api/body-parts`, {
        Body_Part: bodyPart
      });
      setNewXrayBodyPart("");
      setSelectedXrayBodyPart(bodyPart);
      setMessage("Body part added successfully");
      await loadXrayTypes();
      invalidateMasterDataCache();
    } catch (err) {
      console.error("Error adding body part:", err);
      setError(err.response?.data?.message || "Failed to add body part");
    } finally {
      setSaving(false);
    }
  };

  const handleEditXray = async (item) => {
    const newType = window.prompt("Edit X-ray type", item.Xray_Type || "");
    if (newType === null) return;
    const newBodyPart = window.prompt("Edit body part", item.Body_Part || "");
    if (newBodyPart === null) return;

    const xrayType = newType.trim();
    const bodyPart = newBodyPart.trim();
    if (!xrayType || !bodyPart) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.put(`${BACKEND_URL}/xray-api/xrays/${item._id}`, {
        Xray_Type: xrayType,
        Body_Part: bodyPart,
        Side: item.Side || "NA",
        View: item.View || "",
        Film_Size: item.Film_Size || ""
      });
      setMessage("X-ray updated successfully");
      await loadXrayTypes();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update x-ray");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteXray = async (item) => {
    const ok = window.confirm(`Delete '${item.Xray_Type}'?`);
    if (!ok) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.delete(`${BACKEND_URL}/xray-api/xrays/${item._id}`);
      setMessage("X-ray deleted successfully");
      await loadXrayTypes();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to delete x-ray");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleXrayStatus = async (item) => {
    if (!item?._id) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.put(`${BACKEND_URL}/xray-api/xrays/${item._id}`, {
        Xray_Type: item.Xray_Type,
        Body_Part: item.Body_Part,
        Side: item.Side || "NA",
        View: item.View || "",
        Film_Size: item.Film_Size || "",
        status: item.status === "Active" ? "Inactive" : "Active"
      });
      setMessage("X-ray status updated successfully");
      await loadXrayTypes();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update x-ray status");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteXrayBodyPart = async (bodyPartName) => {
    if (!bodyPartName) return;

    const bodyPartKey = String(bodyPartName || "").trim().toLowerCase();
    const bodyPartRecord = customBodyPartMap[bodyPartKey];
    
    if (!bodyPartRecord || !bodyPartRecord._id) {
      setError("This is a built-in body part and cannot be deleted");
      return;
    }

    const ok = window.confirm(`Delete body part '${bodyPartName}' and all its X-ray types?`);
    if (!ok) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.delete(`${BACKEND_URL}/xray-api/body-parts/${bodyPartRecord._id}`);
      setMessage("Body part deleted successfully");
      if (selectedXrayBodyPart === bodyPartName) {
        setSelectedXrayBodyPart("");
      }
      await loadXrayTypes();
      invalidateMasterDataCache();
    } catch (err) {
      console.error("Delete body part error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to delete body part";
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleEditXrayBodyPart = async (bodyPartRecord, bodyPartName) => {
    if (!bodyPartRecord || !bodyPartRecord._id) {
      setMessage("Built-in body parts cannot be edited");
      return;
    }

    const updated = window.prompt("Edit body part name", bodyPartName);
    if (updated === null) return;
    const newName = updated.trim();
    if (!newName) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.put(`${BACKEND_URL}/xray-api/body-parts/${bodyPartRecord._id}`, {
        Body_Part: newName
      });
      setMessage("Body part updated successfully");
      await loadXrayTypes();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update body part");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleXrayBodyPartStatus = async (bodyPartRecord, bodyPartName) => {
    if (!bodyPartRecord || !bodyPartRecord._id) {
      setMessage("Built-in body parts cannot be deactivated");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.put(`${BACKEND_URL}/xray-api/body-parts/${bodyPartRecord._id}`, {
        Body_Part: bodyPartName,
        status: bodyPartRecord.status === "Active" ? "Inactive" : "Active"
      });
      setMessage("Body part status updated successfully");
      await loadXrayTypes();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update body part status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h3 className="fw-bold mb-1">Master Data Management</h3>
          <div className="text-muted">Manage all existing dropdown lists centrally from one page</div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {!isInstituteAdmin && (
        <div className="alert alert-warning">
          You are in read-only mode. Only institute admin can add/edit/delete master data.
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-dark text-white">Master Dropdowns</div>
            <div className="card-body">
              <div className="list-group" style={{ maxHeight: 420, overflowY: "auto" }}>
                {categories.map((category) => (
                  <button
                    key={category._id}
                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                      selectedCategoryId === category._id ? "active" : ""
                    }`}
                    onClick={() => setSelectedCategoryId(category._id)}
                  >
                    <span>{category.category_name}</span>
                    <span className={`badge ${category.status === "Active" ? "bg-success" : "bg-secondary"}`}>
                      {category.status}
                    </span>
                  </button>
                ))}
                {!loading && categories.length === 0 && (
                  <div className="text-muted small p-3">No dropdown lists found</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <span>{selectedCategory ? `${selectedCategory.category_name} Values` : "Values"}</span>
              <span className="small">
                {selectedCategory?.category_name === "Tests"
                  ? `${filteredTests.length} items`
                  : selectedCategory?.category_name === "Diseases"
                  ? `${filteredDiseases.length} items`
                  : selectedCategory?.category_name === "Medicines"
                  ? `${filteredMedicines.length} items`
                  : selectedCategory?.category_name === "Xray Types"
                  ? `${filteredXrays.length} items`
                  : `${filteredValues.length} items`}
              </span>
            </div>
            <div className="card-body">
              <div className="row g-2 mb-3">
                <div className="col-md-5">
                  <input
                    className="form-control"
                    placeholder="Search values"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
              </div>

              {selectedCategory?.category_name === "Tests" && (
                <>
                  <div className="table-responsive mb-3">
                    <table className="table table-bordered table-striped align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 80 }}>ID</th>
                          <th>Test Category</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 240 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testsStructure.categories.map((item, idx) => {
                          const masterValue = customTestCategoryMap[normalizeText(item)] || null;
                          const isCustom = Boolean(masterValue?._id);
                          const status = masterValue?.status || "Active";

                          return (
                            <tr key={item}>
                              <td>{idx + 1}</td>
                              <td>{item}</td>
                              <td>
                                <span className={`badge ${status === "Active" ? "bg-success" : "bg-secondary"}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="d-flex flex-wrap gap-2">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEditSpecialValue({ masterValue, name: item, value_name: item, id: masterValue?._id }, loadTestsStructure)}
                                  disabled={!isInstituteAdmin || saving}
                                  title={isCustom ? "Edit this category" : "Cannot edit built-in categories"}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => handleToggleSpecialValue({ masterValue, name: item, value_name: item, status, id: masterValue?._id }, loadTestsStructure)}
                                  disabled={!isInstituteAdmin || saving}
                                  title={isCustom ? "Toggle status" : "Cannot deactivate built-in categories"}
                                >
                                  {status === "Active" ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteTestCategory(item)}
                                  disabled={!isInstituteAdmin || saving}
                                  title={isCustom ? "Delete this category" : "Cannot delete built-in categories"}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-8">
                      <input
                        className="form-control"
                        placeholder="Add new test category"
                        value={newTestCategoryName}
                        onChange={(e) => setNewTestCategoryName(e.target.value)}
                        disabled={!isInstituteAdmin || saving}
                      />
                    </div>
                    <div className="col-md-4">
                      <button
                        className="btn btn-success w-100"
                        onClick={handleAddTestCategory}
                        disabled={!isInstituteAdmin || saving || !newTestCategoryName.trim()}
                      >
                        Add Category
                      </button>
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        value={selectedTestCategory}
                        onChange={(e) => setSelectedTestCategory(e.target.value)}
                      >
                        <option value="">Select category</option>
                        {testsStructure.categories.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <input
                        className="form-control"
                        placeholder="Test name"
                        value={newTestName}
                        onChange={(e) => setNewTestName(e.target.value)}
                        disabled={!isInstituteAdmin || saving || !selectedTestCategory}
                      />
                    </div>
                    <div className="col-md-2">
                      <input
                        className="form-control"
                        placeholder="Reference"
                        value={newTestReference}
                        onChange={(e) => setNewTestReference(e.target.value)}
                        disabled={!isInstituteAdmin || saving || !selectedTestCategory}
                      />
                    </div>
                    <div className="col-md-2">
                      <input
                        className="form-control"
                        placeholder="Unit"
                        value={newTestUnit}
                        onChange={(e) => setNewTestUnit(e.target.value)}
                        disabled={!isInstituteAdmin || saving || !selectedTestCategory}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <button
                      className="btn btn-primary"
                      onClick={handleAddTest}
                      disabled={!isInstituteAdmin || saving || !selectedTestCategory || !newTestName.trim()}
                    >
                      Add Test
                    </button>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered table-striped align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 80 }}>ID</th>
                          <th>Test Name</th>
                          <th style={{ width: 200 }}>Reference</th>
                          <th style={{ width: 120 }}>Unit</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 240 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!loading && filteredTests.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-muted">No tests found</td>
                          </tr>
                        )}
                        {filteredTests.map((item, idx) => (
                          <tr key={`${item.id || item.name}-${idx}`}>
                            <td>{idx + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.reference || "-"}</td>
                            <td>{item.unit || "-"}</td>
                            <td>
                              <span className={`badge ${item.status === "Active" ? "bg-success" : "bg-secondary"}`}>
                                {item.status || "Active"}
                              </span>
                            </td>
                            <td className="d-flex flex-wrap gap-2">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditSpecialValue(item, loadTestsStructure)}
                                disabled={!isInstituteAdmin || saving}
                                title={item.masterValue?._id ? "Edit this test" : "Cannot edit built-in tests"}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => handleToggleSpecialValue(item, loadTestsStructure)}
                                disabled={!isInstituteAdmin || saving}
                                title={item.masterValue?._id ? "Toggle status" : "Cannot deactivate built-in tests"}
                              >
                                {item.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteSpecialValue(item, loadTestsStructure)}
                                disabled={!isInstituteAdmin || saving}
                                title={item.masterValue?._id ? "Delete this test" : "Cannot delete built-in tests"}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {selectedCategory?.category_name === "Diseases" && (
                <>
                  <div className="row g-2 mb-3">
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        value={selectedDiseaseGroup}
                        onChange={(e) => setSelectedDiseaseGroup(e.target.value)}
                      >
                        <option value="Communicable">Communicable</option>
                        <option value="Non-Communicable">Non-Communicable</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <input
                        className="form-control"
                        placeholder="Add disease name"
                        value={newDiseaseName}
                        onChange={(e) => setNewDiseaseName(e.target.value)}
                        disabled={!isInstituteAdmin || saving}
                      />
                    </div>
                    <div className="col-md-2">
                      <button
                        className="btn btn-success w-100"
                        onClick={handleAddDisease}
                        disabled={!isInstituteAdmin || saving || !newDiseaseName.trim()}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered table-striped align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 80 }}>ID</th>
                          <th>Disease Name</th>
                          <th style={{ width: 220 }}>Group</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 240 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!loading && filteredDiseases.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-muted">No diseases found</td>
                          </tr>
                        )}
                        {filteredDiseases.map((item, idx) => (
                          <tr key={`${item.name}-${idx}`}>
                            <td>{idx + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.group || selectedDiseaseGroup}</td>
                            <td>
                              <span className={`badge ${item.status === "Active" ? "bg-success" : "bg-secondary"}`}>
                                {item.status || "Active"}
                              </span>
                            </td>
                            <td className="d-flex flex-wrap gap-2">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditSpecialValue(item, loadDiseasesStructure)}
                                disabled={!isInstituteAdmin || saving}
                                title={item.masterValue?._id ? "Edit this disease" : "Cannot edit built-in diseases"}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => handleToggleSpecialValue(item, loadDiseasesStructure)}
                                disabled={!isInstituteAdmin || saving}
                                title={item.masterValue?._id ? "Toggle status" : "Cannot deactivate built-in diseases"}
                              >
                                {item.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteSpecialValue(item, loadDiseasesStructure)}
                                disabled={!isInstituteAdmin || saving}
                                title={item.masterValue?._id ? "Delete this disease" : "Cannot delete built-in diseases"}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {selectedCategory?.category_name === "Medicines" && (
                <>
                  <div className="table-responsive mb-3">
                    <table className="table table-bordered table-striped align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 80 }}>ID</th>
                          <th>Medicine Type</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 240 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicinesStructure.medicineTypes.map((item, idx) => {
                          const masterValue = customMedicineTypeMap[normalizeText(item)] || null;
                          const isCustom = Boolean(masterValue?._id);
                          const status = masterValue?.status || "Active";

                          return (
                            <tr key={item}>
                              <td>{idx + 1}</td>
                              <td>{item}</td>
                              <td>
                                <span className={`badge ${status === "Active" ? "bg-success" : "bg-secondary"}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="d-flex flex-wrap gap-2">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEditSpecialValue({ masterValue, name: item, value_name: item, id: masterValue?._id }, loadMedicinesStructure)}
                                  disabled={!isInstituteAdmin || saving}
                                  title={isCustom ? "Edit this type" : "Cannot edit built-in types"}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => handleToggleSpecialValue({ masterValue, name: item, value_name: item, status, id: masterValue?._id }, loadMedicinesStructure)}
                                  disabled={!isInstituteAdmin || saving}
                                  title={isCustom ? "Toggle status" : "Cannot deactivate built-in types"}
                                >
                                  {status === "Active" ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteMedicineType(item)}
                                  disabled={!isInstituteAdmin || saving}
                                  title={isCustom ? "Delete this type" : "Cannot delete built-in types"}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-8">
                      <input
                        className="form-control"
                        placeholder="Add new medicine type"
                        value={newMedicineType}
                        onChange={(e) => setNewMedicineType(e.target.value)}
                        disabled={!isInstituteAdmin || saving}
                      />
                    </div>
                    <div className="col-md-4">
                      <button
                        className="btn btn-success w-100"
                        onClick={handleAddMedicineType}
                        disabled={!isInstituteAdmin || saving || !newMedicineType.trim()}
                      >
                        Add Type
                      </button>
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        value={selectedMedicineType}
                        onChange={(e) => setSelectedMedicineType(e.target.value)}
                      >
                        <option value="">Select medicine type</option>
                        {medicinesStructure.medicineTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        value={selectedMedicineDosageForm}
                        onChange={(e) => setSelectedMedicineDosageForm(e.target.value)}
                      >
                        <option value="">All dosage forms</option>
                        {(medicinesStructure.dosageForms || []).map((form) => (
                          <option key={form} value={form}>{form}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <input
                        className="form-control"
                        placeholder="Medicine name"
                        value={newMedicineName}
                        onChange={(e) => setNewMedicineName(e.target.value)}
                        disabled={!isInstituteAdmin || saving || !selectedMedicineType}
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <select
                        className="form-select"
                        value={newMedicineDosageForm}
                        onChange={(e) => setNewMedicineDosageForm(e.target.value)}
                        disabled={!isInstituteAdmin || saving || !selectedMedicineType}
                      >
                        <option value="">Select dosage form for new medicine</option>
                        {(medicinesStructure.dosageForms || []).map((form) => (
                          <option key={form} value={form}>{form}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <input
                        className="form-control"
                        placeholder="Strength (e.g., 500mg)"
                        value={newMedicineStrength}
                        onChange={(e) => setNewMedicineStrength(e.target.value)}
                        disabled={!isInstituteAdmin || saving || !selectedMedicineType}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <button
                      className="btn btn-primary"
                      onClick={handleAddMedicine}
                      disabled={!isInstituteAdmin || saving || !selectedMedicineType || !newMedicineDosageForm || !newMedicineName.trim() || !newMedicineStrength.trim()}
                    >
                      Add Medicine
                    </button>
                    <button
                      className="btn btn-secondary ms-2"
                      onClick={() => {
                        setShowImportArea((s) => !s);
                        setImportError("");
                      }}
                    >
                      {showImportArea ? "Hide Import" : "Import Medicines JSON"}
                    </button>
                  </div>

                  {showImportArea && (
                    <div className="mb-3">
                      <div className="mb-2 small text-muted">Paste medicines JSON (array or multiple arrays). Fields: value_name, medicineType, dosageForm, strength.</div>
                      <textarea className="form-control mb-2" rows={8} value={importText} onChange={(e) => setImportText(e.target.value)} />
                      {importError && <div className="text-danger small mb-2">{importError}</div>}
                      <div>
                        <button
                          className="btn btn-success"
                          onClick={async () => {
                            setImportError("");
                            try {
                              // Try parse as JSON first
                              let parsed = null;
                              try {
                                parsed = JSON.parse(importText);
                              } catch (e) {
                                // Fallback: extract object literals
                                const matches = importText.match(/\{[\s\S]*?\}/g) || [];
                                parsed = matches.map((s) => JSON.parse(s));
                              }

                              // Normalize to array of objects
                              let items = [];
                              if (Array.isArray(parsed)) {
                                // flatten nested arrays
                                const flatten = (arr) => arr.reduce((acc, v) => acc.concat(Array.isArray(v) ? flatten(v) : v), []);
                                items = flatten(parsed);
                              } else if (parsed && typeof parsed === "object") {
                                items = [parsed];
                              }

                              if (!items.length) throw new Error("No medicine objects found in pasted data");

                              // Build merge key and add to current medicines
                              const current = medicinesStructure.medicines || [];
                              const merged = new Map();
                              const makeKey = (it) => `${String(it.medicineType||"").trim().toLowerCase()}::${String(it.dosageForm||"").trim().toLowerCase()}::${String(it.value_name||"").trim().toLowerCase()}::${String(it.strength||"").trim().toLowerCase()}`;

                              current.forEach((m) => merged.set(makeKey(m), m));

                              items.forEach((raw, idx) => {
                                const item = {
                                  value_name: String(raw.value_name || raw.Value || raw.name || "").trim(),
                                  medicineType: String(raw.medicineType || raw.type || "").trim(),
                                  dosageForm: String(raw.dosageForm || raw.form || "").trim(),
                                  strength: String(raw.strength || "").trim(),
                                  status: raw.status || "Active",
                                  _id: raw._id || `import-${Date.now()}-${idx}`
                                };
                                const key = makeKey(item);
                                if (item.value_name && !merged.has(key)) merged.set(key, item);
                              });

                              const newMedicines = Array.from(merged.values());

                              // Update types and forms
                              const newTypes = Array.from(new Set([...(medicinesStructure.medicineTypes || []), ...newMedicines.map((m) => m.medicineType).filter(Boolean)]));
                              const newForms = Array.from(new Set([...(medicinesStructure.dosageForms || []), ...newMedicines.map((m) => m.dosageForm).filter(Boolean)]));

                              // Rebuild medicinesByType
                              const newMedicinesByType = {};
                              newTypes.forEach((type) => {
                                newMedicinesByType[type] = newMedicines.filter((m) => String(m.medicineType || "").trim().toLowerCase() === String(type || "").trim().toLowerCase()).sort((a,b)=>a.value_name.localeCompare(b.value_name));
                              });

                              setCustomMedicineMap((prev) => {
                                const map = { ...(prev || {}) };
                                newMedicines.forEach((m) => {
                                  const key = makeTripleKey(m.medicineType, m.dosageForm, m.value_name);
                                  map[key] = { _id: m._id, value_name: m.value_name, status: m.status || "Active", meta: { kind: "medicine", medicineType: m.medicineType, dosageForm: m.dosageForm, strength: m.strength } };
                                });
                                return map;
                              });

                              setMedicinesStructure({ medicineTypes: newTypes, medicines: newMedicines, medicinesByType: newMedicinesByType, dosageForms: newForms });

                              // Ask to persist to server if user is institute admin/token present
                              try {
                                const token = localStorage.getItem("instituteToken");
                                if (token && window.confirm("Persist imported medicines to server? This will attempt to create medicine types and medicines (you must be an institute admin). Continue?")) {
                                  setSaving(true);
                                  // Create missing types
                                  const existingTypes = medicinesStructure.medicineTypes || [];
                                  const typesToCreate = newTypes.filter((t) => t && !existingTypes.includes(t));
                                  for (const t of typesToCreate) {
                                    try {
                                      await axios.post(`${BACKEND_URL}/master-data-api/medicines/type`, { name: t });
                                    } catch (err) {
                                      // ignore duplicates or failures
                                      if (err?.response?.status && err.response.status !== 409) {
                                        console.warn(`Failed to create medicine type ${t}`, err?.response?.data || err?.message);
                                      }
                                    }
                                  }

                                  // Create medicines
                                  for (const m of newMedicines) {
                                    try {
                                      await axios.post(`${BACKEND_URL}/master-data-api/medicines`, {
                                        medicineName: m.value_name,
                                        medicineType: m.medicineType || "Others",
                                        dosageForm: m.dosageForm || "Other",
                                        strength: m.strength || ""
                                      });
                                    } catch (err) {
                                      if (err?.response?.status === 409) {
                                        // already exists - ignore
                                        continue;
                                      }
                                      console.warn(`Failed to create medicine ${m.value_name}`, err?.response?.data || err?.message);
                                    }
                                  }

                                  // Reload from server to reflect persisted data
                                  await loadMedicinesStructure();
                                  invalidateMasterDataCache();
                                }
                              } finally {
                                setSaving(false);
                                setImportError("");
                                setShowImportArea(false);
                                setImportText("");
                              }
                            } catch (err) {
                              setImportError(err.message || String(err));
                            }
                          }}
                        >
                          Apply Import
                        </button>
                        <button className="btn btn-link ms-2" onClick={() => { setImportText(""); setImportError(""); }}>Clear</button>
                      </div>
                    </div>
                  )}

                  <div className="table-responsive">
                    <table className="table table-bordered table-striped align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 80 }}>ID</th>
                          <th>Medicine Name</th>
                          <th style={{ width: 160 }}>Medicine Type</th>
                          <th style={{ width: 160 }}>Dosage Form</th>
                          <th style={{ width: 200 }}>Strength</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 240 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!loading && filteredMedicines.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-4 text-muted">No medicines found</td>
                          </tr>
                        )}
                        {filteredMedicines.map((item, idx) => (
                          <tr key={`${item.value_name}-${idx}`}>
                            <td>{idx + 1}</td>
                            <td>{item.value_name}</td>
                            <td>{item.medicineType || "-"}</td>
                            <td>{item.dosageForm || "-"}</td>
                            <td>{item.strength || "-"}</td>
                            <td>
                              <span className={`badge ${item.status === "Active" ? "bg-success" : "bg-secondary"}`}>
                                {item.status || "Active"}
                              </span>
                            </td>
                            <td className="d-flex flex-wrap gap-2">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditSpecialValue(item, loadMedicinesStructure)}
                                disabled={!isInstituteAdmin || saving}
                                title={item.masterValue?._id ? "Edit this medicine" : "Cannot edit built-in medicines"}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => handleToggleSpecialValue(item, loadMedicinesStructure)}
                                disabled={!isInstituteAdmin || saving}
                                title={item.masterValue?._id ? "Toggle status" : "Cannot deactivate built-in medicines"}
                              >
                                {item.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteSpecialValue(item, loadMedicinesStructure)}
                                disabled={!isInstituteAdmin || saving}
                                title={item.masterValue?._id ? "Delete this medicine" : "Cannot delete built-in medicines"}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {selectedCategory?.category_name === "Xray Types" && (
                <>
                  <div className="alert alert-light border py-2 px-3 small mb-3">
                    Manage the X-ray master list here. Add a new body part by typing a new body part name, then add X-ray tests under it.
                  </div>

                  <div className="table-responsive mb-4">
                    <table className="table table-bordered table-striped align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 80 }}>ID</th>
                          <th>Body Part</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 300 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {xrayBodyParts.map((part, idx) => {
                          const partKey = String(part || "").trim().toLowerCase();
                          const bodyPartRecord = customBodyPartMap[partKey];
                          const isCustom = Boolean(bodyPartRecord?._id);
                          const status = bodyPartRecord?.status || "Active";
                          return (
                            <tr key={part}>
                              <td>{idx + 1}</td>
                              <td>{part}</td>
                              <td>
                                <span className={`badge ${status === "Active" ? "bg-success" : "bg-secondary"}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="d-flex flex-wrap gap-2">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEditXrayBodyPart(bodyPartRecord, part)}
                                  disabled={!isInstituteAdmin || saving}
                                  title={isCustom ? "Edit this body part" : "Cannot edit built-in body parts"}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => handleToggleXrayBodyPartStatus(bodyPartRecord, part)}
                                  disabled={!isInstituteAdmin || saving}
                                  title={isCustom ? "Toggle status" : "Cannot deactivate built-in body parts"}
                                >
                                  {status === "Active" ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteXrayBodyPart(part)}
                                  disabled={!isInstituteAdmin || saving}
                                  title={isCustom ? "Delete this body part" : "Cannot delete built-in body parts"}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-8">
                      <input
                        className="form-control"
                        placeholder="Add new body part"
                        value={newXrayBodyPart}
                        onChange={(e) => setNewXrayBodyPart(e.target.value)}
                        disabled={!isInstituteAdmin || saving}
                      />
                    </div>
                    <div className="col-md-4">
                      <button
                        className="btn btn-success w-100"
                        onClick={handleAddXrayBodyPart}
                        disabled={!isInstituteAdmin || saving || !newXrayBodyPart.trim()}
                      >
                        Add Body Part
                      </button>
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-3">
                      <select
                        className="form-select"
                        value={selectedXrayBodyPart}
                        onChange={(e) => setSelectedXrayBodyPart(e.target.value)}
                      >
                        <option value="">Select body part</option>
                        {xrayBodyParts.map((part) => (
                          <option key={part} value={part}>{part}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <input
                        className="form-control"
                        placeholder="Add X-ray type name"
                        value={newXrayName}
                        onChange={(e) => setNewXrayName(e.target.value)}
                        disabled={!isInstituteAdmin || saving || !selectedXrayBodyPart}
                      />
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select"
                        value={newXraySide}
                        onChange={(e) => setNewXraySide(e.target.value)}
                        disabled={!isInstituteAdmin || saving || !selectedXrayBodyPart}
                      >
                        <option value="NA">NA</option>
                        <option value="Left">Left</option>
                        <option value="Right">Right</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <input
                        className="form-control"
                        placeholder="Film size (optional)"
                        value={newXrayFilmSize}
                        onChange={(e) => setNewXrayFilmSize(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                        disabled={!isInstituteAdmin || saving || !selectedXrayBodyPart}
                      />
                    </div>
                    <div className="col-md-2">
                      <button
                        className="btn btn-success w-100"
                        onClick={handleAddXray}
                        disabled={!isInstituteAdmin || saving || !selectedXrayBodyPart || !newXrayName.trim()}
                      >
                        Add X-ray
                      </button>
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-5">
                      <input
                        className="form-control"
                        placeholder="Search X-ray type"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered table-striped align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 80 }}>ID</th>
                          <th>Body Part</th>
                          <th>X-ray Test</th>
                          <th style={{ width: 130 }}>Side</th>
                          <th style={{ width: 130 }}>Film Size</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 300 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!loading && filteredXrays.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-4 text-muted">No x-ray types found</td>
                          </tr>
                        )}
                        {filteredXrays.map((item, idx) => (
                            <tr key={item._id || `${item.Body_Part}-${item.Xray_Type}-${idx}`}>
                              <td>{idx + 1}</td>
                              <td>{item.Body_Part || "-"}</td>
                              <td>{item.Xray_Type || "-"}</td>
                              <td>{item.Side || "NA"}</td>
                              <td>{item.Film_Size || "-"}</td>
                              <td>
                                <span className={`badge ${item.status === "Active" ? "bg-success" : "bg-secondary"}`}>
                                  {item.status || "Active"}
                                </span>
                              </td>
                              <td className="d-flex flex-wrap gap-2">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEditXray(item)}
                                  disabled={!isInstituteAdmin || saving}
                                  title="Edit this X-ray type"
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => handleToggleXrayStatus(item)}
                                  disabled={!isInstituteAdmin || saving}
                                  title="Toggle status"
                                >
                                  {item.status === "Active" ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteXray(item)}
                                  disabled={!isInstituteAdmin || saving}
                                  title="Delete this X-ray type"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {selectedCategory && !["Tests", "Diseases", "Medicines", "Xray Types"].includes(selectedCategory.category_name) && (
                <>
                  <div className="row g-2 mb-3">
                    <div className="col-md-7">
                      <div className="input-group">
                        <input
                          className="form-control"
                          placeholder="Add new value"
                          value={newValueName}
                          onChange={(e) => setNewValueName(e.target.value)}
                          disabled={!isInstituteAdmin || saving || !selectedCategoryId}
                        />
                        <button
                          className="btn btn-success"
                          onClick={handleAddValue}
                          disabled={!isInstituteAdmin || saving || !newValueName.trim() || !selectedCategoryId}
                        >
                          Add New
                        </button>
                      </div>
                    </div>
                  </div>

                  {DEFAULT_MASTER_OPTIONS[selectedCategory?.category_name] && (
                    <div className="alert alert-light border py-2 px-3 small mb-3">
                      This dropdown includes built-in values plus any values you add in Master Data.
                    </div>
                  )}

                  <div className="table-responsive">
                    <table className="table table-bordered table-striped align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 80 }}>ID</th>
                          <th>Value Name</th>
                          <th style={{ width: 130 }}>Status</th>
                          <th style={{ width: 250 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading && (
                          <tr>
                            <td colSpan={4} className="text-center py-4">Loading...</td>
                          </tr>
                        )}
                        {!loading && filteredValues.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-4 text-muted">No values found</td>
                          </tr>
                        )}
                        {filteredValues.map((item, idx) => (
                          <tr key={item._id}>
                            <td>{idx + 1}</td>
                            <td>{item.value_name}</td>
                            <td>
                              <span className={`badge ${item.status === "Active" ? "bg-success" : "bg-secondary"}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="d-flex flex-wrap gap-2">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditValue(item)}
                                disabled={!isInstituteAdmin || saving}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => handleToggleValue(item)}
                                disabled={!isInstituteAdmin || saving}
                              >
                                {item.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteValue(item)}
                                disabled={!isInstituteAdmin || saving}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterData;
