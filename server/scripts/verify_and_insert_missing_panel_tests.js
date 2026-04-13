const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/../.env' });
const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
const imd = require('../utils/instituteMasterData');
const MasterValue = require('../models/master_value');

const dns = require('dns');
const getResolver = () => { const r = new dns.promises.Resolver(); r.setServers(['8.8.8.8','1.1.1.1']); return r; };
const buildFallbackMongoUri = async (mongoSrvUri) => {
  const uri = new URL(mongoSrvUri);
  const host = uri.hostname; const dbName = uri.pathname && uri.pathname !== '/' ? uri.pathname.slice(1) : 'test';
  const username = decodeURIComponent(uri.username||''); const password = decodeURIComponent(uri.password||'');
  const resolver = getResolver();
  const srv = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  const hosts = srv.map(s=>`${s.name.replace(/\.$/,'')}:${s.port}`).join(',');
  let txt = '';
  try { txt = (await resolver.resolveTxt(host)).flat().join(''); } catch(e) {}
  const params = new URLSearchParams(uri.search||'');
  if (txt) { const t = new URLSearchParams(txt); for(const [k,v] of t.entries()) if(!params.has(k)) params.set(k,v); }
  if(!params.has('tls')) params.set('tls','true'); if(!params.has('retryWrites')) params.set('retryWrites','true'); if(!params.has('w')) params.set('w','majority');
  const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  return `mongodb://${auth}${hosts}/${dbName}?${params.toString()}`;
};

const connect = async () => {
  try { await mongoose.connect(MONGO); } catch(err) {
    if (MONGO.startsWith('mongodb+srv://')) {
      const fb = await buildFallbackMongoUri(MONGO);
      await mongoose.connect(fb);
    } else throw err;
  }
};

const panel = (function(){
  // same panel as insert_custom_panel
  return [
  { category: 'HEMATOLOGY', tests: [
    { name: 'Hemoglobin', reference: 'M: 13.0–17.0 | F: 12.0–15.0', unit: 'g/dL' },
    { name: 'RBC Count', reference: 'M: 4.7–6.1 | F: 4.2–5.4', unit: 'million/µL' },
    { name: 'WBC Count (TLC)', reference: '4,000–11,000', unit: '/µL' },
    { name: 'Platelet Count', reference: '1,50,000–4,50,000', unit: '/µL' },
    { name: 'Hematocrit (PCV)', reference: 'M: 40–54 | F: 36–48', unit: '%' },
    { name: 'MCV', reference: '80–96', unit: 'fL' },
    { name: 'MCH', reference: '27–33', unit: 'pg' },
    { name: 'MCHC', reference: '32–36', unit: 'g/dL' },
    { name: 'ESR', reference: 'M: 0–15 | F: 0–20', unit: 'mm/hr' },
    { name: 'Neutrophils (DLC)', reference: '50–70', unit: '%' },
    { name: 'Lymphocytes (DLC)', reference: '20–40', unit: '%' },
    { name: 'Eosinophils (DLC)', reference: '1–6', unit: '%' },
    { name: 'Monocytes (DLC)', reference: '2–8', unit: '%' },
    { name: 'Basophils (DLC)', reference: '0–1', unit: '%' },
    { name: 'RDW (Red Cell Distrib. Width)', reference: '11.5–14.5', unit: '%' }
  ]},
  { category: 'DIABETES & GLUCOSE', tests: [
    { name: 'Fasting Blood Sugar (FBS)', reference: '70–100', unit: 'mg/dL' },
    { name: 'Postprandial Blood Sugar (PPBS)', reference: '<140', unit: 'mg/dL' },
    { name: 'HbA1c', reference: '<5.7% Normal | 5.7–6.4% Pre | ≥6.5% DM', unit: '%' },
    { name: 'Random Blood Sugar (RBS)', reference: '<200', unit: 'mg/dL' },
    { name: 'Insulin (Fasting)', reference: '2.6–24.9', unit: 'µIU/mL' },
    { name: 'C-Peptide (Fasting)', reference: '1.1–4.4', unit: 'ng/mL' }
  ]},
  { category: 'LIPID PROFILE', tests: [
    { name: 'Total Cholesterol', reference: '<200', unit: 'mg/dL' },
    { name: 'LDL Cholesterol', reference: '<100 (Optimal)', unit: 'mg/dL' },
    { name: 'HDL Cholesterol', reference: 'M: >40 | F: >50', unit: 'mg/dL' },
    { name: 'Triglycerides', reference: '<150', unit: 'mg/dL' },
    { name: 'VLDL Cholesterol', reference: '5–40', unit: 'mg/dL' },
    { name: 'Non-HDL Cholesterol', reference: '<130', unit: 'mg/dL' },
    { name: 'LDL/HDL Ratio', reference: '<3.0', unit: 'Ratio' }
  ]},
  { category: 'LIVER FUNCTION TESTS (LFT)', tests: [
    { name: 'Bilirubin – Total', reference: '0.3–1.2', unit: 'mg/dL' },
    { name: 'Bilirubin – Direct', reference: '0.0–0.3', unit: 'mg/dL' },
    { name: 'Bilirubin – Indirect', reference: '0.1–1.0', unit: 'mg/dL' },
    { name: 'ALT (SGPT)', reference: '7–56', unit: 'U/L' },
    { name: 'AST (SGOT)', reference: '10–40', unit: 'U/L' },
    { name: 'Alkaline Phosphatase (ALP)', reference: '44–147', unit: 'U/L' },
    { name: 'GGT (Gamma GT)', reference: 'M: 8–61 | F: 5–36', unit: 'U/L' },
    { name: 'Total Protein', reference: '6.0–8.3', unit: 'g/dL' },
    { name: 'Albumin', reference: '3.5–5.0', unit: 'g/dL' },
    { name: 'Globulin', reference: '2.0–3.5', unit: 'g/dL' },
    { name: 'A/G Ratio', reference: '1.0–2.2', unit: 'Ratio' }
  ]},
  { category: 'KIDNEY FUNCTION TESTS (KFT)', tests: [
    { name: 'Serum Creatinine', reference: 'M: 0.6–1.2 | F: 0.5–1.1', unit: 'mg/dL' },
    { name: 'Blood Urea Nitrogen (BUN)', reference: '10–20', unit: 'mg/dL' },
    { name: 'Urea', reference: '15–40', unit: 'mg/dL' },
    { name: 'Uric Acid', reference: 'M: 3.5–7.2 | F: 2.6–6.0', unit: 'mg/dL' },
    { name: 'eGFR', reference: '>90 (Normal)', unit: 'mL/min/1.73m²' },
    { name: 'BUN/Creatinine Ratio', reference: '10:1–20:1', unit: 'Ratio' },
    { name: 'Cystatin C', reference: '0.52–0.98', unit: 'mg/L' }
  ]},
  { category: 'THYROID PROFILE', tests: [
    { name: 'TSH', reference: '0.4–4.0', unit: 'mIU/L' },
    { name: 'Free T4 (fT4)', reference: '0.8–2.0', unit: 'ng/dL' },
    { name: 'Free T3 (fT3)', reference: '2.3–4.2', unit: 'pg/mL' },
    { name: 'Total T4', reference: '4.5–12.5', unit: 'µg/dL' },
    { name: 'Total T3', reference: '80–200', unit: 'ng/dL' },
    { name: 'Anti-TPO Antibody', reference: '<35', unit: 'IU/mL' }
  ]},
  { category: 'ELECTROLYTES', tests: [
    { name: 'Sodium (Na+)', reference: '135–145', unit: 'mEq/L' },
    { name: 'Potassium (K+)', reference: '3.5–5.0', unit: 'mEq/L' },
    { name: 'Chloride (Cl-)', reference: '98–106', unit: 'mEq/L' },
    { name: 'Calcium (Total)', reference: '8.5–10.5', unit: 'mg/dL' },
    { name: 'Magnesium', reference: '1.7–2.2', unit: 'mg/dL' },
    { name: 'Phosphate (Inorganic)', reference: '2.5–4.5', unit: 'mg/dL' },
    { name: 'Bicarbonate (HCO3-)', reference: '22–29', unit: 'mEq/L' }
  ]},
  { category: 'URINALYSIS', tests: [
    { name: 'Urine pH', reference: '4.5–8.0', unit: 'pH' },
    { name: 'Urine Specific Gravity', reference: '1.005–1.030', unit: '' },
    { name: 'Urine Protein', reference: 'Negative', unit: '' },
    { name: 'Urine Glucose', reference: 'Negative', unit: '' },
    { name: 'Urine Ketones', reference: 'Negative', unit: '' },
    { name: 'Urine RBC', reference: '0–2', unit: '/HPF' },
    { name: 'Urine WBC', reference: '0–5', unit: '/HPF' },
    { name: 'Urine Nitrite', reference: 'Negative', unit: '' },
    { name: 'Urine Bilirubin', reference: 'Negative', unit: '' },
    { name: 'Microalbuminuria (Spot)', reference: '<30', unit: 'mg/g creatinine' }
  ]},
  { category: 'CARDIAC MARKERS', tests: [
    { name: 'Troponin I (High Sensitivity)', reference: '<0.04', unit: 'ng/mL' },
    { name: 'CK-MB', reference: '<5', unit: 'ng/mL' },
    { name: 'BNP (B-type Natriuretic Peptide)', reference: '<100', unit: 'pg/mL' },
    { name: 'hs-CRP', reference: '<3.0', unit: 'mg/L' },
    { name: 'Homocysteine', reference: '5–15', unit: 'µmol/L' },
    { name: 'Lipoprotein(a) [Lp(a)]', reference: '<30', unit: 'mg/dL' }
  ]},
  { category: 'VITAMINS & MINERALS', tests: [
    { name: 'Vitamin D (25-OH)', reference: '20–50 (Sufficient)', unit: 'ng/mL' },
    { name: 'Vitamin B12', reference: '200–900', unit: 'pg/mL' },
    { name: 'Folate (Folic Acid)', reference: '2.0–20.0', unit: 'ng/mL' },
    { name: 'Serum Iron', reference: 'M: 60–170 | F: 50–170', unit: 'µg/dL' },
    { name: 'Ferritin', reference: 'M: 12–300 | F: 12–150', unit: 'ng/mL' },
    { name: 'TIBC (Total Iron Binding Capacity)', reference: '250–370', unit: 'µg/dL' },
    { name: 'Zinc', reference: '70–120', unit: 'µg/dL' },
    { name: 'Vitamin B1 (Thiamine)', reference: '2.5–7.5', unit: 'µg/dL' }
  ]},
  { category: 'COAGULATION STUDIES', tests: [
    { name: 'Prothrombin Time (PT)', reference: '11.0–13.5', unit: 'sec' },
    { name: 'INR', reference: '0.8–1.2', unit: 'Ratio' },
    { name: 'aPTT', reference: '30–40', unit: 'sec' },
    { name: 'Fibrinogen', reference: '200–400', unit: 'mg/dL' },
    { name: 'D-Dimer', reference: '<0.5', unit: 'µg/mL FEU' },
    { name: 'Bleeding Time (BT)', reference: '2–7', unit: 'min' }
  ]},
  { category: 'INFECTIOUS DISEASE PANEL', tests: [
    { name: 'HBsAg', reference: 'Negative (Non-Reactive)', unit: '' },
    { name: 'Anti-HCV', reference: 'Negative (Non-Reactive)', unit: '' },
    { name: 'HIV 1 & 2 ELISA', reference: 'Non-Reactive', unit: '' },
    { name: 'VDRL / RPR (Syphilis)', reference: 'Non-Reactive', unit: '' },
    { name: 'Dengue NS1 Antigen', reference: 'Negative', unit: '' },
    { name: 'Malaria Parasite (MP)', reference: 'Negative', unit: '' },
    { name: 'Widal Test', reference: 'O <1:80 | H <1:80', unit: 'Titer' }
  ]},
  { category: 'TUMOR MARKERS', tests: [
    { name: 'PSA (Prostate Specific Antigen)', reference: '<4.0', unit: 'ng/mL' },
    { name: 'CEA (Carcinoembryonic Ag)', reference: '<3 (non-smoker), <5 (smoker)', unit: 'ng/mL' },
    { name: 'AFP (Alpha-Fetoprotein)', reference: '<10', unit: 'ng/mL' },
    { name: 'CA-125', reference: '<35', unit: 'U/mL' },
    { name: 'CA 19-9', reference: '<37', unit: 'U/mL' }
  ]},
  { category: 'HORMONAL PROFILE', tests: [
    { name: 'Testosterone (Total) – M', reference: '270–1070', unit: 'ng/dL' },
    { name: 'FSH', reference: 'M: 1.5–12.4 | F: varies by phase', unit: 'mIU/mL' },
    { name: 'LH', reference: 'M: 1.7–8.6 | F: varies by phase', unit: 'mIU/mL' },
    { name: 'Prolactin', reference: 'M: 2–18 | F: 2–29', unit: 'ng/mL' },
    { name: 'Cortisol (Morning)', reference: '6.2–19.4', unit: 'µg/dL' },
    { name: 'DHEA-S', reference: 'M: 80–560 | F: 35–430', unit: 'µg/dL' }
  ]},
  { category: 'BONE HEALTH', tests: [
    { name: 'Calcium (Serum)', reference: '8.5–10.5', unit: 'mg/dL' },
    { name: 'Phosphorus (Serum)', reference: '2.5–4.5', unit: 'mg/dL' },
    { name: 'PTH (Parathyroid Hormone)', reference: '10–65', unit: 'pg/mL' },
    { name: 'Alkaline Phosphatase (Bone)', reference: '15–41', unit: 'U/L' }
  ]},
  { category: 'IMMUNOLOGY', tests: [
    { name: 'IgE (Total)', reference: '< 100 (adults)', unit: 'IU/mL' },
    { name: 'ANA (Antinuclear Antibody)', reference: 'Negative (<1:40)', unit: 'Titer' },
    { name: 'Rheumatoid Factor (RF)', reference: '<20', unit: 'IU/mL' },
    { name: 'CRP (C-Reactive Protein)', reference: '<6.0', unit: 'mg/L' }
  ]}
];})();

(async ()=>{
  await connect();
  const instituteId = process.argv[2];
  if (!instituteId) { console.error('Usage: node verify_and_insert_missing_panel_tests.js <instituteId>'); process.exit(1); }

  const testsCategory = await imd.ensureTestMasterValues(instituteId);
  if (!testsCategory) { console.error('Failed to ensure Tests category'); process.exit(1); }

  const existing = await MasterValue.find({ Institute_ID: instituteId, category_id: testsCategory._id, 'meta.kind': 'test' }).lean();
  const existingSet = new Set((existing||[]).map(r=>String((r.normalized_value||'').trim().toLowerCase())));

  const backupDir = `server/exports/verify_missing_panel_${instituteId}_${new Date().toISOString().replace(/[:.]/g,'-')}`;
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(`${backupDir}/existing_tests_before.json`, JSON.stringify(existing, null, 2));

  const inserted = [];
  const failed = [];
  for (const cat of panel) {
    for (const t of cat.tests) {
      const norm = imd.normalize(t.name);
      if (existingSet.has(norm)) continue;
      try {
        await imd.ensureValueRecord({ instituteId, categoryId: testsCategory._id, valueName: t.name, meta: { kind: 'test', category: cat.category, categoryNormalized: imd.normalize(cat.category), reference: t.reference, unit: t.unit, source: 'custom_panel_2026-04-15' } });
        inserted.push({ category: cat.category, name: t.name });
        existingSet.add(norm);
      } catch (e) {
        failed.push({ category: cat.category, name: t.name, error: e.message });
      }
    }
  }

  const after = await MasterValue.find({ Institute_ID: instituteId, category_id: testsCategory._id, 'meta.kind': 'test' }).lean();
  fs.writeFileSync(`${backupDir}/report.json`, JSON.stringify({ inserted, failed, beforeCount: existing.length, afterCount: after.length }, null, 2));
  console.log('Inserted:', inserted.length, 'Failed:', failed.length, 'Before:', existing.length, 'After:', after.length);
  if (failed.length) console.log('See', `${backupDir}/report.json`);
  await mongoose.connection.close();
})();
