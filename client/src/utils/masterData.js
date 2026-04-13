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

<<<<<<< HEAD
=======
const REMOVED_MASTER_KEYS_STORAGE = "removed_master_keys";
export const getRemovedMasterKeys = () => {
  try {
    const raw = (typeof window !== "undefined" && localStorage.getItem(REMOVED_MASTER_KEYS_STORAGE)) || "[]";
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
};
export const addRemovedMasterKey = (key) => {
  try {
    if (typeof window === "undefined") return;
    const keys = getRemovedMasterKeys();
    if (!keys.includes(key)) {
      keys.push(key);
      localStorage.setItem(REMOVED_MASTER_KEYS_STORAGE, JSON.stringify(keys));
    }
  } catch (e) {
    // ignore
  }
};

export const removeRemovedMasterKey = (key) => {
  try {
    if (typeof window === "undefined") return;
    const keys = getRemovedMasterKeys().filter((k) => k !== key);
    localStorage.setItem(REMOVED_MASTER_KEYS_STORAGE, JSON.stringify(keys));
  } catch (e) {
    // ignore
  }
};
const normalizeText = (value) => String(value || "").trim().toLowerCase();
const makeMedicineKey = (medicineType, dosageForm, valueName, strength) =>
  `${normalizeText(medicineType)}::${normalizeText(dosageForm)}::${normalizeText(valueName)}::${normalizeText(strength)}`;

>>>>>>> 808f4de89d9dec3056674d7f8be3c42218d2c5ba
export const invalidateMasterDataCache = () => {
  cache = null;
  cacheTime = 0;
  if (typeof window !== "undefined") {
<<<<<<< HEAD
    window.dispatchEvent(new Event("master-data-updated"));
=======
    const ev = new Event("master-data-updated");
    try {
      console.debug("invalidateMasterDataCache: dispatching master-data-updated", { time: Date.now() });
    } catch (e) {
      // ignore console issues in non-browser env
    }
    window.dispatchEvent(ev);
>>>>>>> 808f4de89d9dec3056674d7f8be3c42218d2c5ba
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
  cacheTime = now;
<<<<<<< HEAD
=======
  try {
    const categories = Object.keys(cache || {}).length;
    const medCount = Array.isArray(cache?.Medicines) ? cache.Medicines.length : 0;
    console.debug("fetchMasterDataMap: cached master map", { categories, medCount, time: now });
  } catch (e) {
    // ignore
  }
>>>>>>> 808f4de89d9dec3056674d7f8be3c42218d2c5ba
  return cache;
};

export const getMasterOptions = (masterMap, categoryName) => {
  const fallback = DEFAULT_MASTER_OPTIONS[categoryName] || [];
<<<<<<< HEAD
  const dbValues = (masterMap?.[categoryName] || []).map((item) => item.value_name);
=======
  const dbValues = (masterMap?.[categoryName] || [])
    .filter((item) => (item?.status || "Active") !== "Inactive")
    .map((item) => item.value_name);
>>>>>>> 808f4de89d9dec3056674d7f8be3c42218d2c5ba
  if (categoryName === "Medicine Types") {
    const merged = new Map();
    [...fallback, ...dbValues]
      .map((item) => canonicalizeMedicineTypeLabel(item))
      .filter(Boolean)
      .forEach((item) => {
        const key = getCanonicalMedicineTypeKey(item);
        if (!merged.has(key)) merged.set(key, item);
      });
<<<<<<< HEAD
    return [...merged.values()];
=======
    // filter out locally-removed types
    const removed = new Set(getRemovedMasterKeys().filter((k) => String(k || "").startsWith("T::")).map((k) => k.replace(/^T::/, "")));
    return [...merged.entries()]
      .filter(([key]) => !removed.has(key))
      .map(([, val]) => val);
>>>>>>> 808f4de89d9dec3056674d7f8be3c42218d2c5ba
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

<<<<<<< HEAD
  const combined = [...fallback, ...(masterMap?.Medicines || [])];
  const seen = new Set();

=======
  const combined = [...fallback, ...((masterMap?.Medicines || []).filter((m) => (m?.status || "Active") !== "Inactive"))];
  const seen = new Set();

  // filter out locally-removed medicines and medicines whose type was removed
  const removed = new Set(getRemovedMasterKeys());

  // compute some lightweight diagnostics for debugging
  try {
    const totalCombined = combined.length;
    const totalRemovedMed = combined.filter((item) => {
      const medKey = `M::${makeMedicineKey(
        String(item?.meta?.medicineType || item?.meta?.medicine_type || item?.meta?.typeCategory || ""),
        String(item?.meta?.dosageForm || item?.meta?.dosage_form || item?.meta?.form || "").trim(),
        String(item?.value_name || "").trim(),
        String(item?.meta?.strength || "").trim()
      )}`;
      return removed.has(medKey);
    }).length;
    const totalRemovedType = combined.filter((item) => {
      const typeKey = `T::${getCanonicalMedicineTypeKey(
        canonicalizeMedicineTypeLabel(item?.meta?.medicineType || item?.meta?.medicine_type || item?.meta?.typeCategory || "")
      )}`;
      return removed.has(typeKey);
    }).length;

    console.debug("getMasterMedicineEntries: diagnostics", {
      totalCombined,
      totalRemovedMed,
      totalRemovedType
    });
  } catch (e) {
    // ignore diagnostics failures
  }

>>>>>>> 808f4de89d9dec3056674d7f8be3c42218d2c5ba
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
<<<<<<< HEAD
=======
      const medKey = `M::${makeMedicineKey(item.medicineType, item.dosageForm, item.value_name, item.strength)}`;
      if (removed.has(medKey)) return false;
      // also filter if the medicine's type is blacklisted
      const typeKey = `T::${getCanonicalMedicineTypeKey(item.medicineType)}`;
      if (removed.has(typeKey)) return false;
      return true;
    })
    .filter((item) => {
>>>>>>> 808f4de89d9dec3056674d7f8be3c42218d2c5ba
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
  const fallback = (DEFAULT_MASTER_OPTIONS[categoryName] || []).map((value_name, index) => ({
    _id: `default-${categoryName}-${index}`,
    value_name,
    status: "Active",
    isDefault: true
  }));
  const dbValues = masterMap?.[categoryName] || [];
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

<<<<<<< HEAD
=======
  // If category is Medicine Types, filter out locally-removed types
  if (categoryName === "Medicine Types") {
    const removed = new Set(getRemovedMasterKeys().filter((k) => String(k || "").startsWith("T::")).map((k) => k.replace(/^T::/, "")));
    try {
      console.debug("getMergedMasterValueObjects: Medicine Types merged count", { mergedCount: merged.size, removedCount: removed.size });
    } catch (e) {
      // ignore
    }
    return [...merged.entries()].filter(([key]) => !removed.has(key)).map(([, val]) => val);
  }

>>>>>>> 808f4de89d9dec3056674d7f8be3c42218d2c5ba
  return [...merged.values()];
};
