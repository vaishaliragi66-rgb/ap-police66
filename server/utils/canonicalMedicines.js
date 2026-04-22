const fs = require("fs");
const path = require("path");

const CANONICAL_MEDICINES_FILE = path.join(__dirname, "..", "imports", "medicines_corrected.txt");

const MEDICINE_TYPE_LABELS = {
  analgesicsantipyretics: "Analgesics & Anti Pyretics",
  antacids: "Antacids",
  antianemics: "AntiAnemics",
  antibiotics: "Antibiotics",
  antidiabetics: "Antidiabetics",
  antiepileptics: "AntiEpileptics",
  antifungals: "Antifungals",
  antihelmenthics: "Antihelminthics",
  antihelminthics: "Antihelminthics",
  antihelmintics: "Antihelminthics",
  antihypertensives: "Antihypertensives",
  antihypertensivess: "Antihypertensives",
  antimalarials: "Antimalarials",
  antiplatelets: "AntiPlatelets",
  antipsychotics: "AntiPsychotics",
  antivirals: "Antivirals",
  diuretics: "Diuretics",
  gastrointestinal: "Gastro Intestinal",
  laxatives: "Laxatives",
  lipidloweringagents: "Lipid Lowering Agents",
  minerals: "Minerals",
  respiratory: "Respiratory",
  vitamins: "Vitamins"
};

const DOSAGE_FORM_LABELS = {
  capsule: "Capsule",
  cream: "Cream",
  inhaler: "Inhaler",
  injection: "Injection",
  powder: "Powder",
  suppository: "Suppository",
  suspension: "Suspension",
  syrup: "Syrup",
  tablett: "Tablet",
  tablet: "Tablet"
};

const normalizeLoose = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const startCase = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const canonicalizeMedicineType = (value) => {
  const key = normalizeLoose(value);
  if (!key) return "";
  return MEDICINE_TYPE_LABELS[key] || startCase(value);
};

const canonicalizeDosageForm = (value) => {
  const key = normalizeLoose(value);
  if (!key) return "";
  return DOSAGE_FORM_LABELS[key] || startCase(value);
};

const extractNameAndStrength = (medicineRaw) => {
  const source = String(medicineRaw || "").replace(/\s+/g, " ").trim();
  if (!source) {
    return { value_name: "", strength: "" };
  }

  const strengthMatch = source.match(
    /(\d+(?:\.\d+)?\s*(?:mcg|mg|g|iu|u|mu|%)(?:\/ml)?(?:\s*\+\s*\d+(?:\.\d+)?\s*(?:mcg|mg|g|iu|u|mu|%)(?:\/ml)?)*)$/i
  );

  if (!strengthMatch) {
    return { value_name: source, strength: "" };
  }

  const strength = String(strengthMatch[1] || "").replace(/\s+/g, " ").trim();
  const value_name = source.slice(0, source.length - strengthMatch[1].length).trim();
  return { value_name, strength };
};

let cachedCanonicalMedicines = null;

const getCanonicalMedicines = () => {
  if (cachedCanonicalMedicines) {
    return cachedCanonicalMedicines;
  }

  const raw = fs.readFileSync(CANONICAL_MEDICINES_FILE, "utf8");
  const lines = raw.split(/\r?\n/);
  const medicines = [];
  let currentType = "";

  for (const sourceLine of lines) {
    const line = String(sourceLine || "").replace(/\u00A0/g, " ").trim();
    if (!line || /^Dosage Form/i.test(line)) {
      continue;
    }

    if (!line.includes("\t")) {
      if (line === line.toUpperCase()) {
        currentType = canonicalizeMedicineType(line);
      }
      continue;
    }

    const [formRaw, medicineRaw] = line.split("\t");
    const dosageForm = canonicalizeDosageForm(formRaw);
    const medicineType = canonicalizeMedicineType(currentType);
    const { value_name, strength } = extractNameAndStrength(medicineRaw);

    if (!value_name || !medicineType || !dosageForm) {
      continue;
    }

    medicines.push({
      value_name,
      medicineType,
      dosageForm,
      strength
    });
  }

  cachedCanonicalMedicines = medicines;
  return medicines;
};

const getCanonicalMedicineTypes = () =>
  Array.from(new Set(getCanonicalMedicines().map((item) => item.medicineType))).sort((a, b) => a.localeCompare(b));

const getCanonicalDosageForms = () =>
  Array.from(new Set(getCanonicalMedicines().map((item) => item.dosageForm))).sort((a, b) => a.localeCompare(b));

module.exports = {
  CANONICAL_MEDICINES_FILE,
  canonicalizeDosageForm,
  canonicalizeMedicineType,
  extractNameAndStrength,
  getCanonicalDosageForms,
  getCanonicalMedicines,
  getCanonicalMedicineTypes,
  normalizeLoose
};
