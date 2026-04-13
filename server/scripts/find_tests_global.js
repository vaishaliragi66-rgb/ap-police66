const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const dns = require('dns');

const getResolver = () => {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);
  return resolver;
};

const buildFallbackMongoUri = async (mongoSrvUri) => {
  const uri = new URL(mongoSrvUri);
  const host = uri.hostname;
  const dbName = uri.pathname && uri.pathname !== "/" ? uri.pathname.slice(1) : "test";
  const username = decodeURIComponent(uri.username || "");
  const password = decodeURIComponent(uri.password || "");

  const resolver = getResolver();
  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  const hosts = srvRecords
    .sort((a, b) => a.priority - b.priority)
    .map((record) => `${record.name.replace(/\.$/, "")}:${record.port}`)
    .join(",");

  let txtParams = "";
  try {
    const txtRecords = await resolver.resolveTxt(host);
    txtParams = txtRecords.flat().join("");
  } catch (err) {
    txtParams = "";
  }

  const params = new URLSearchParams(uri.search || "");
  if (txtParams) {
    const txtSearchParams = new URLSearchParams(txtParams);
    for (const [key, value] of txtSearchParams.entries()) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }
  }

  if (!params.has("tls")) params.set("tls", "true");
  if (!params.has("retryWrites")) params.set("retryWrites", "true");
  if (!params.has("w")) params.set("w", "majority");

  const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : "";
  return `mongodb://${authPart}${hosts}/${dbName}?${params.toString()}`;
};

const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
const connect = async () => {
  try { await mongoose.connect(MONGO); } catch (err) {
    if (MONGO?.startsWith('mongodb+srv://')) {
      const fallback = await buildFallbackMongoUri(MONGO);
      await mongoose.connect(fallback);
    } else throw err;
  }
};

(async () => {
  await connect();
  const col = mongoose.connection.db.collection('mastervalues');
  const sampleNames = [
    'Hemoglobin', 'RBC Count', 'WBC Count', 'Platelet Count', 'Hematocrit', 'MCV', 'MCH', 'MCHC', 'ESR', 'Neutrophils', 'Lymphocytes', 'Eosinophils', 'Monocytes', 'Basophils', 'RDW',
    'Fasting Blood Sugar', 'Postprandial Blood Sugar', 'HbA1c', 'Random Blood Sugar', 'Insulin', 'C-Peptide',
    'Total Cholesterol', 'LDL Cholesterol', 'HDL Cholesterol', 'Triglycerides', 'VLDL Cholesterol', 'Non-HDL Cholesterol',
    'Bilirubin – Total', 'ALT', 'AST', 'Alkaline Phosphatase', 'GGT', 'Total Protein', 'Albumin',
    'Serum Creatinine', 'Blood Urea Nitrogen', 'Uric Acid', 'eGFR',
    'TSH', 'Free T4', 'Free T3',
    'Sodium', 'Potassium', 'Chloride', 'Calcium', 'Magnesium',
    'Urine pH', 'Urine Specific Gravity', 'Urine Protein', 'Urine Glucose'
  ];

  for (const name of sampleNames) {
    const norm = String(name).trim().toLowerCase();
    const doc = await col.findOne({ 'meta.kind': 'test', normalized_value: norm });
    if (doc) {
      console.log(`FOUND: ${name} -> value_name: ${doc.value_name}, Institute_ID: ${doc.Institute_ID}, meta: ${JSON.stringify(doc.meta)}`);
    } else {
      // try contains
      const loose = await col.findOne({ 'meta.kind': 'test', normalized_value: { $regex: norm.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&') } });
      if (loose) console.log(`FOUND (loose): ${name} -> ${loose.value_name}, Institute_ID: ${loose.Institute_ID}, meta: ${JSON.stringify(loose.meta)}`);
      else console.log(`MISSING: ${name}`);
    }
  }

  const total = await col.countDocuments({ 'meta.kind': 'test' });
  console.log('\nTotal test records in DB:', total);
  await mongoose.connection.close();
})();
