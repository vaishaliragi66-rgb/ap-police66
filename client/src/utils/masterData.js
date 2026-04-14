import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
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
const normalizeLoose = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const startCase = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const getCanonicalMedicineTypeKey = (value) => normalizeLoose(value);
export const canonicalizeMedicineTypeLabel = (value) => {
  const raw = String(value || "").trim();
  const key = getCanonicalMedicineTypeKey(raw);
  if (!key) return "";
  if (MEDICINE_TYPE_LABELS[key]) return MEDICINE_TYPE_LABELS[key];
  if (key.startsWith("anti") && key.length > 4) {
    return `Anti${key.charAt(4).toUpperCase()}${key.slice(5)}`;
  }
  return startCase(raw);
};

export const DEFAULT_MASTER_OPTIONS = {
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
  "Xray Categories": [
    "Head & Neck",
    "Chest & Thorax",
    "Upper Limb",
    "Lower Limb",
    "Spine",
    "Abdomen"
  ],
  "Xray Body Parts": [
    "Skull",
    "Sinus",
    "Cervical spine",
    "Chest",
    "Shoulder",
    "Humerus",
    "Elbow",
    "Forearm",
    "Wrist",
    "Hand",
    "Finger",
    "Pelvis",
    "Hip",
    "Femur",
    "Knee",
    "Tibia/Fibula",
    "Ankle",
    "Foot",
    "Toe",
    "Thoracic Spine",
    "Lumbar Spine",
    "Sacrum & Coccyx",
    "Abdomen"
  ],
  "Xray Views": ["AP", "PA", "Lateral", "Oblique", "Towne", "Waters", "Caldwell", "Decubitus", "Lordotic", "Expiratory", "Axillary", "Skyline", "Mortise", "Supine", "Erect"],
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

let cache = null;
let cacheTime = 0;
const TTL_MS = 5 * 60 * 1000;

// Client-side local overrides for master medicines (in-memory only)
let localMedicineOverrides = [];

// local overrides for medicine types (frontend-only)
let localMedicineTypeOverrides = [];

export const addLocalMedicineType = (name) => {
  const entry = {
    _clientId: makeClientId(),
    _id: null,
    value_name: String(name || "").trim(),
    status: "Active"
  };
  localMedicineTypeOverrides = [entry, ...localMedicineTypeOverrides];
  invalidateMasterDataCache();
  return entry;
};

export const updateLocalMedicineType = (identifier, nextName) => {
  let found = false;
  localMedicineTypeOverrides = localMedicineTypeOverrides.map((t) => {
    if ((identifier && t._id && t._id === identifier) || (identifier && t._clientId === identifier) || String(t.value_name).trim().toLowerCase() === String(identifier || "").trim().toLowerCase()) {
      found = true;
      return { ...t, value_name: String(nextName || t.value_name).trim() };
    }
    return t;
  });
  if (!found) {
    const entry = { _clientId: makeClientId(), _id: null, value_name: String(nextName || identifier || "").trim(), status: "Active" };
    localMedicineTypeOverrides = [entry, ...localMedicineTypeOverrides];
  }
  invalidateMasterDataCache();
};

export const deleteLocalMedicineType = (identifier) => {
  // mark as inactive via override
  const name = typeof identifier === "string" ? identifier : identifier?.value_name;
  if (!name) return;
  const entry = { _clientId: makeClientId(), _id: null, value_name: String(name).trim(), status: "Inactive" };
  localMedicineTypeOverrides = [entry, ...localMedicineTypeOverrides];
  invalidateMasterDataCache();
};

export const toggleLocalMedicineTypeStatus = (identifier) => {
  let found = false;
  localMedicineTypeOverrides = localMedicineTypeOverrides.map((t) => {
    if ((identifier && t._id && t._id === identifier) || (identifier && t._clientId === identifier) || String(t.value_name).trim().toLowerCase() === String(identifier || "").trim().toLowerCase()) {
      found = true;
      return { ...t, status: t.status === "Active" ? "Inactive" : "Active" };
    }
    return t;
  });
  if (!found && identifier) {
    const entry = { _clientId: makeClientId(), _id: null, value_name: String(identifier).trim(), status: "Inactive" };
    localMedicineTypeOverrides = [entry, ...localMedicineTypeOverrides];
  }
  invalidateMasterDataCache();
};

export const getLocalMedicineOverrides = () => localMedicineOverrides;
export const getLocalMedicineTypeOverrides = () => localMedicineTypeOverrides;

const makeClientId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

export const addLocalMedicine = (item) => {
  const entry = {
    _clientId: makeClientId(),
    _id: item._id || null,
    value_name: String(item.value_name || item.medicineName || "").trim(),
    meta: item.meta || item.meta || {
      kind: "medicine",
      medicineType: item.medicineType || "",
      dosageForm: item.dosageForm || "",
      strength: item.strength || ""
    },
    status: item.status || "Active"
  };
  localMedicineOverrides = [entry, ...localMedicineOverrides];
  invalidateMasterDataCache();
  return entry;
};

export const updateLocalMedicine = (identifier, patch) => {
  let found = false;
  localMedicineOverrides = localMedicineOverrides.map((m) => {
    if ((identifier && m._id && m._id === identifier) || (identifier && m._clientId === identifier)) {
      found = true;
      return {
        ...m,
        value_name: patch.value_name || m.value_name,
        meta: { ...m.meta, ...(patch.meta || patch) },
        status: patch.status || m.status
      };
    }
    return m;
  });

  if (!found) {
    // create a new local override entry (preserve identifier if it's an _id)
    const entry = {
      _clientId: makeClientId(),
      _id: typeof identifier === "string" ? identifier : null,
      value_name: patch.value_name || (patch.medicineName || "") ,
      meta: patch.meta || {
        kind: "medicine",
        medicineType: patch.medicineType || patch.medicine_type || "",
        dosageForm: patch.dosageForm || patch.dosage_form || patch.form || "",
        strength: patch.strength || ""
      },
      status: patch.status || "Active"
    };
    localMedicineOverrides = [entry, ...localMedicineOverrides];
  }

  invalidateMasterDataCache();
};

export const deleteLocalMedicine = (identifier) => {
  // If identifier is an object with key fields, add an inactive override to hide built-in
  if (identifier && typeof identifier === "object") {
    const entry = {
      _clientId: makeClientId(),
      _id: identifier._id || null,
      value_name: String(identifier.value_name || identifier.medicineName || "").trim(),
      meta: identifier.meta || {
        kind: "medicine",
        medicineType: identifier.medicineType || "",
        dosageForm: identifier.dosageForm || "",
        strength: identifier.strength || ""
      },
      status: "Inactive"
    };
    localMedicineOverrides = [entry, ...localMedicineOverrides];
    invalidateMasterDataCache();
    return;
  }

  localMedicineOverrides = localMedicineOverrides.filter((m) => !((m._id && m._id === identifier) || m._clientId === identifier));
  invalidateMasterDataCache();
};

export const toggleLocalMedicineStatus = (identifier) => {
  localMedicineOverrides = localMedicineOverrides.map((m) => {
    if ((m._id && m._id === identifier) || m._clientId === identifier) {
      return { ...m, status: m.status === "Active" ? "Inactive" : "Active" };
    }
    return m;
  });
  invalidateMasterDataCache();
};

export const invalidateMasterDataCache = () => {
  cache = null;
  cacheTime = 0;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("master-data-updated"));
  }
};

export const fetchMasterDataMap = async ({ force = false } = {}) => {
  const now = Date.now();
  if (!force && cache && now - cacheTime < TTL_MS) {
    return cache;
  }

  const token = localStorage.getItem("instituteToken");
  let res;

  if (token) {
    res = await axios.get(`${BACKEND_URL}/master-data-api/active-map`);
  } else {
    let instituteId = localStorage.getItem("instituteId") || "";

    if (!instituteId) {
      const employeeId = localStorage.getItem("employeeId");
      if (employeeId) {
        try {
          const profileRes = await axios.get(`${BACKEND_URL}/employee-api/profile/${employeeId}`);
          instituteId = String(profileRes.data?.Institute_ID || "");
        } catch {
          instituteId = "";
        }
      }
    }

    if (!instituteId) {
      cache = {};
      cacheTime = now;
      return cache;
    }

    res = await axios.get(`${BACKEND_URL}/master-data-api/public-map`, {
      params: { instituteId }
    });
  }

  cache = res.data || {};
  // Merge client-side local medicine overrides into cache.Medicines for instant UI updates
  try {
    const dbMedicines = Array.isArray(cache.Medicines) ? cache.Medicines : [];
    const merged = [];

    // Map by normalized key (type::form::name::strength) to prefer db entries
    const seen = new Set();
    const keyOf = (it) =>
      `${normalizeLoose(it?.meta?.medicineType || it?.medicineType || it?.meta?.medicine_type || "")}` +
      `::${normalizeLoose(it?.meta?.dosageForm || it?.dosageForm || it?.meta?.dosage_form || it?.meta?.form || "")}` +
      `::${normalizeLoose(it?.value_name || it?.Medicine_Name || "")}` +
      `::${normalizeLoose(it?.strength || it?.meta?.strength || "")}`;

    dbMedicines.forEach((it) => {
      const k = keyOf(it);
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(it);
      }
    });

    // Apply local overrides: if local has same key and has _id => replace db; if local unique => prepend
    (localMedicineOverrides || []).forEach((lm) => {
      const k = keyOf(lm);
      // find index
      const idx = merged.findIndex((m) => keyOf(m) === k);
      if (idx !== -1) {
        // prefer persisted db record if lm has no _id, else replace
        if (lm._id) merged[idx] = { ...merged[idx], ...lm };
        else merged.splice(idx + 1, 0, lm);
      } else {
        merged.unshift(lm);
      }
    });

    cache.Medicines = merged;
  } catch (e) {
    // ignore merge errors
  }
  // Merge local medicine type overrides into cache['Medicine Types'] so frontend edits take precedence
  try {
    const dbTypes = Array.isArray(cache["Medicine Types"]) ? cache["Medicine Types"] : [];
    const mergedTypesMap = new Map();
    // first add DB types
    dbTypes.forEach((t) => {
      const key = String(t.value_name || t || "").trim().toLowerCase();
      if (key) mergedTypesMap.set(key, t);
    });
    // then apply local overrides (overwrite)
    (localMedicineTypeOverrides || []).forEach((lt) => {
      const key = String(lt.value_name || "").trim().toLowerCase();
      if (!key) return;
      mergedTypesMap.set(key, lt);
    });

    cache["Medicine Types"] = Array.from(mergedTypesMap.values());
  } catch (e) {
    // ignore
  }
  cacheTime = now;
  return cache;
};

export const getMasterOptions = (masterMap, categoryName) => {
  const hasCategory = Boolean(masterMap) && Object.prototype.hasOwnProperty.call(masterMap, categoryName);
  const fallback = hasCategory ? [] : (DEFAULT_MASTER_OPTIONS[categoryName] || []);
  const dbValues = ((hasCategory ? masterMap?.[categoryName] : []) || [])
    .filter((item) => String(item?.status || "Active").toLowerCase() === "active")
    .map((item) => item.value_name);
  if (categoryName === "Medicine Types") {
    const merged = new Map();
    [...fallback, ...dbValues]
      .map((item) => canonicalizeMedicineTypeLabel(item))
      .filter(Boolean)
      .forEach((item) => {
        const key = getCanonicalMedicineTypeKey(item);
        if (!merged.has(key)) merged.set(key, item);
      });
    return [...merged.values()];
  }
  return [...new Set([...fallback, ...dbValues].filter(Boolean))];
};

export const getMasterMedicineEntries = (masterMap) => {
  const fallback = [
    { value_name: "Paracetamol", meta: { kind: "medicine", medicineType: "Antipyretics", dosageForm: "Tablet", strength: "500mg" } },
    { value_name: "Amoxicillin", meta: { kind: "medicine", medicineType: "Antibiotics", dosageForm: "Capsule", strength: "500mg" } },
    { value_name: "Ibuprofen", meta: { kind: "medicine", medicineType: "Analgesics", dosageForm: "Tablet", strength: "400mg" } },
    { value_name: "Vitamin D", meta: { kind: "medicine", medicineType: "Vitamins", dosageForm: "Tablet", strength: "60000 IU" } }
  ];

  const hasMedicines = Boolean(masterMap) && Object.prototype.hasOwnProperty.call(masterMap, "Medicines");
  const combined = hasMedicines ? [...(masterMap?.Medicines || [])] : [...fallback];
  const seen = new Set();

  return combined
    .map((item) => ({
      value_name: String(item?.value_name || "").trim(),
      medicineType: canonicalizeMedicineTypeLabel(
        item?.meta?.medicineType || item?.meta?.medicine_type || item?.meta?.typeCategory || ""
      ),
      dosageForm: String(item?.meta?.dosageForm || item?.meta?.dosage_form || item?.meta?.form || "").trim(),
      strength: String(item?.meta?.strength || "").trim(),
      status: item?.status || "Active"
    }))
    .filter((item) => item.value_name)
    .filter((item) => {
      // only include active medicines in dropdown helpers
      if (String(item.status || "Active").toLowerCase() !== "active") return false;
      const key = `${item.value_name.toLowerCase()}::${item.medicineType.toLowerCase()}::${item.dosageForm.toLowerCase()}::${item.strength.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const getMasterMedicinesByType = (masterMap, medicineType) => {
  const type = getCanonicalMedicineTypeKey(medicineType);
  if (!type) return [];

  return getMasterMedicineEntries(masterMap)
    .filter((item) => getCanonicalMedicineTypeKey(item.medicineType) === type)
    .map((item) => item.value_name)
    .sort((a, b) => a.localeCompare(b));
};

export const getMasterMedicinesByTypeAndForm = (masterMap, medicineType, dosageForm = "") => {
  const type = getCanonicalMedicineTypeKey(medicineType);
  const form = String(dosageForm || "").trim().toLowerCase();
  if (!type) return [];

  return getMasterMedicineEntries(masterMap)
    .filter((item) => getCanonicalMedicineTypeKey(item.medicineType) === type)
    .filter((item) => !form || String(item.dosageForm || "").trim().toLowerCase() === form)
    .sort((a, b) => String(a.value_name || "").localeCompare(String(b.value_name || "")));
};

export const getMergedMasterValueObjects = (masterMap, categoryName) => {
  const hasCategory = Boolean(masterMap) && Object.prototype.hasOwnProperty.call(masterMap, categoryName);
  const fallback = (!hasCategory ? (DEFAULT_MASTER_OPTIONS[categoryName] || []) : []).map((value_name, index) => ({
    _id: `default-${categoryName}-${index}`,
    value_name,
    status: "Active",
    isDefault: true
  }));
  const dbValues = (hasCategory ? masterMap?.[categoryName] : []) || [];
  const merged = new Map();

  [...fallback, ...dbValues].forEach((item) => {
    const key = String(item.value_name || "").trim().toLowerCase();
    if (!key) return;
    if (!merged.has(key)) {
      merged.set(key, item);
    } else if (String(merged.get(key)?._id || "").startsWith("default-") && item._id) {
      merged.set(key, item);
    }
  });

  return [...merged.values()];
};
