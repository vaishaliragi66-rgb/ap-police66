const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

const { ensureCategoryDoc, ensureValueRecord, normalize } = require('../utils/instituteMasterData');

const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/appolice';

const getResolver = () => {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);
  return resolver;
};

const buildFallbackMongoUri = async (mongoSrvUri) => {
  const uri = new URL(mongoSrvUri);
  const host = uri.hostname;
  const dbName = uri.pathname && uri.pathname !== '/' ? uri.pathname.slice(1) : 'test';
  const username = decodeURIComponent(uri.username || '');
  const password = decodeURIComponent(uri.password || '');
  const resolver = getResolver();
  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  const hosts = srvRecords.map((r) => `${r.name.replace(/\.$/, '')}:${r.port}`).join(',');
  const params = new URLSearchParams(uri.search || '');
  if (!params.has('tls')) params.set('tls', 'true');
  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  if (!params.has('w')) params.set('w', 'majority');
  const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  return `mongodb://${authPart}${hosts}/${dbName}?${params.toString()}`;
};

const connect = async () => {
  try {
    await mongoose.connect(MONGO_URL);
  } catch (err) {
    if (MONGO_URL.startsWith('mongodb+srv://')) {
      console.warn('SRV DNS failed, trying fallback');
      const fallback = await buildFallbackMongoUri(MONGO_URL);
      await mongoose.connect(fallback);
    } else throw err;
  }
};

const instituteId = process.argv[2];
if (!instituteId) {
  console.error('Usage: node ensure_core_tests.js <instituteId>');
  process.exit(1);
}

(async () => {
  await connect();
  console.log('Connected to MongoDB');

  const testsCategory = await ensureCategoryDoc(instituteId, 'Tests');
  if (!testsCategory) {
    console.error('Could not ensure Tests category');
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

  for (const [categoryName, tests] of Object.entries(categories)) {
    console.log('Ensuring category:', categoryName);
    await ensureValueRecord({ instituteId, categoryId: testsCategory._id, valueName: categoryName, meta: { kind: 'category' } });
    for (const t of tests) {
      await ensureValueRecord({
        instituteId,
        categoryId: testsCategory._id,
        valueName: t.name,
        meta: {
          kind: 'test',
          category: categoryName,
          categoryNormalized: String(categoryName || '').trim().toLowerCase(),
          reference: t.reference || '',
          unit: t.unit || ''
        }
      });
      console.log('  ensured', t.name);
    }
  }

  console.log('Done seeding core tests');
  await mongoose.disconnect();
})();
