import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { invalidateMasterDataCache } from "../../utils/masterData";
import { DEFAULT_MASTER_OPTIONS, getMergedMasterValueObjects } from "../../utils/masterData";
import diagnosticTestsByCategory from "../../data/diagnosticTests";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const FIXED_CATEGORIES = Object.keys(DEFAULT_MASTER_OPTIONS).filter(
  (categoryName) => categoryName !== "Disease Categories"
);

const sortUnique = (items) =>
  [...new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean))].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const makePairKey = (left, right) => `${normalizeText(left)}::${normalizeText(right)}`;

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
  const [selectedTestCategory, setSelectedTestCategory] = useState("");
  const [newTestCategoryName, setNewTestCategoryName] = useState("");
  const [newTestName, setNewTestName] = useState("");
  const [newTestReference, setNewTestReference] = useState("");
  const [newTestUnit, setNewTestUnit] = useState("");
  const [diseasesStructure, setDiseasesStructure] = useState({ communicable: [], nonCommunicable: [] });
  const [customDiseaseMap, setCustomDiseaseMap] = useState({});
  const [selectedDiseaseGroup, setSelectedDiseaseGroup] = useState("Communicable");
  const [newDiseaseName, setNewDiseaseName] = useState("");
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
      masterValues
        .filter((item) => item?.meta?.kind === "test")
        .forEach((item) => {
          const key = makePairKey(item?.meta?.category, item?.value_name);
          if (key !== "::") testMap[key] = item;
        });
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
      masterValues
        .filter((item) => item?.meta?.kind === "test")
        .forEach((item) => {
          const key = makePairKey(item?.meta?.category, item?.value_name);
          if (key !== "::") testMap[key] = item;
        });
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

  const handleEditSpecialValue = async (item, reloadFn) => {
    if (!item?.masterValue?._id) return;
    const updated = window.prompt("Edit value", item.name || item.value_name);
    if (updated === null) return;
    const valueName = updated.trim();
    if (!valueName) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.put(`${BACKEND_URL}/master-data-api/values/${item.masterValue._id}`, {
        value_name: valueName,
        meta: item.masterValue.meta || {}
      });
      setMessage("Value updated successfully");
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
    if (!item?.masterValue?._id) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.put(`${BACKEND_URL}/master-data-api/values/${item.masterValue._id}`, {
        status: item.status === "Active" ? "Inactive" : "Active"
      });
      setMessage("Value status updated");
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
    if (!item?.masterValue?._id) return;
    const ok = window.confirm(`Delete '${item.name || item.value_name}'?`);
    if (!ok) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await axios.delete(`${BACKEND_URL}/master-data-api/values/${item.masterValue._id}`);
      setMessage("Value deleted successfully");
      await reloadFn();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to delete value");
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
      try {
        await axios.post(`${BACKEND_URL}/master-data-api/tests/category`, {
          name: newTestCategoryName.trim()
        });
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
        await axios.post(`${BACKEND_URL}/master-data-api/values`, {
          category_id: selectedCategoryId,
          value_name: newTestCategoryName.trim(),
          meta: { kind: "category" }
        });
      }
      setNewTestCategoryName("");
      setMessage("Test category added successfully");
      await loadTestsStructure();
      invalidateMasterDataCache();
    } catch (err) {
      console.error(err);
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
                                disabled={!isInstituteAdmin || saving || !item.masterValue?._id}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => handleToggleSpecialValue(item, loadTestsStructure)}
                                disabled={!isInstituteAdmin || saving || !item.masterValue?._id}
                              >
                                {item.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteSpecialValue(item, loadTestsStructure)}
                                disabled={!isInstituteAdmin || saving || !item.masterValue?._id}
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
                                disabled={!isInstituteAdmin || saving || !item.masterValue?._id}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => handleToggleSpecialValue(item, loadDiseasesStructure)}
                                disabled={!isInstituteAdmin || saving || !item.masterValue?._id}
                              >
                                {item.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteSpecialValue(item, loadDiseasesStructure)}
                                disabled={!isInstituteAdmin || saving || !item.masterValue?._id}
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

              {selectedCategory && !["Tests", "Diseases"].includes(selectedCategory.category_name) && (
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
                                disabled={!isInstituteAdmin || saving || item.isDefault}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => handleToggleValue(item)}
                                disabled={!isInstituteAdmin || saving || item.isDefault}
                              >
                                {item.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteValue(item)}
                                disabled={!isInstituteAdmin || saving || item.isDefault}
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
