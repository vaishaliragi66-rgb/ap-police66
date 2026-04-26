const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BACKEND = process.env.BACKEND_URL || 'http://localhost:6100';
const JWT_SECRET = process.env.JWT_SECRET || 'institutesecret123';
const instituteId = process.argv[2];

if (!instituteId) {
  console.error('Usage: node seed_core_tests_via_api.js <instituteId>');
  process.exit(1);
}

const categories = {
  'LIVER FUNCTION TESTS': [
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
  ],
  'KIDNEY FUNCTION TESTS': [
    { name: 'Serum Creatinine', reference: 'M: 0.6–1.2 | F: 0.5–1.1', unit: 'mg/dL' },
    { name: 'Blood Urea Nitrogen (BUN)', reference: '10–20', unit: 'mg/dL' },
    { name: 'Urea', reference: '15–40', unit: 'mg/dL' },
    { name: 'Uric Acid', reference: 'M: 3.5–7.2 | F: 2.6–6.0', unit: 'mg/dL' },
    { name: 'eGFR', reference: '>90 (Normal)', unit: "mL/min/1.73m²" },
    { name: 'BUN/Creatinine Ratio', reference: '10:1–20:1', unit: 'Ratio' },
    { name: 'Cystatin C', reference: '0.52–0.98', unit: 'mg/L' }
  ],
  'INFECTIOUS DISEASE PANEL': [
    { name: 'HBsAg', reference: 'Negative (Non-Reactive)', unit: '' },
    { name: 'Anti-HCV', reference: 'Negative (Non-Reactive)', unit: '' },
    { name: 'HIV 1 & 2 ELISA', reference: 'Non-Reactive', unit: '' },
    { name: 'VDRL / RPR (Syphilis)', reference: 'Non-Reactive', unit: '' },
    { name: 'Dengue NS1 Antigen', reference: 'Negative', unit: '' },
    { name: 'Malaria Parasite (MP)', reference: 'Negative', unit: '' },
    { name: 'Widal Test', reference: 'O <1:80 | H <1:80', unit: 'Titer' }
  ]
};

const token = jwt.sign({ instituteId, role: 'institute' }, JWT_SECRET, { expiresIn: '1h' });

const run = async () => {
  for (const [category, tests] of Object.entries(categories)) {
    console.log('Seeding category:', category);
    for (const t of tests) {
      try {
        const res = await axios.post(
          `${BACKEND}/master-data-api/tests`,
          { category, testName: t.name, referenceRange: t.reference || '', unit: t.unit || '' },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
        );
        console.log('  ', t.name, res.data && res.data.created === false ? '(already existed)' : '(created)');
      } catch (err) {
        console.error('  error seeding', t.name, err.response?.data || err.message);
      }
    }
  }
  console.log('Done');
};

run().catch((e) => { console.error(e); process.exit(1); });
