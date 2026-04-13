const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const dns = require('dns');
const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');

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
  try {
    await mongoose.connect(MONGO);
  } catch (err) {
    const isSrvDnsIssue =
      MONGO?.startsWith('mongodb+srv://') && (err?.message?.includes('querySrv ECONNREFUSED') || err?.code === 'ECONNREFUSED');
    if (!isSrvDnsIssue) throw err;
    console.warn('SRV DNS failed, trying fallback');
    const fallback = await buildFallbackMongoUri(MONGO);
    await mongoose.connect(fallback);
  }
};

(async () => {
  try {
    await connect();
    console.log('Connected to MongoDB');

    const category = await MasterCategory.findOne({ category_name: 'Tests' }).lean();
    if (!category) {
      console.log('No MasterCategory with category_name "Tests" found.');
      await mongoose.connection.close();
      return;
    }

    console.log('Found Tests category:', { _id: category._id.toString(), seed_version: category.seed_version });

    const totalTests = await MasterValue.countDocuments({ category_id: category._id, 'meta.kind': 'test' });
    console.log('Total master test records for this institute/category (meta.kind=="test"):', totalTests);

    const sampleNames = [
      'Hemoglobin',
      'RBC Count',
      'WBC Count (TLC)',
      'Platelet Count',
      'Fasting Blood Sugar (FBS)',
      'HbA1c',
      'Total Cholesterol',
      'ALT (SGPT)',
      'Serum Creatinine',
      'TSH',
      'Urine pH',
      'Troponin I (High Sensitivity)'
    ];

    for (const name of sampleNames) {
      const normalized = String(name).trim().toLowerCase();
      const doc = await MasterValue.findOne({ category_id: category._id, normalized_value: normalized }).lean();
      if (doc) {
        console.log(`FOUND: "${name}" -> value_name: "${doc.value_name}", status: ${doc.status}, meta: ${JSON.stringify(doc.meta)}`);
      } else {
        // try regex loose search
        const loose = await MasterValue.findOne({ category_id: category._id, 'meta.kind': 'test', normalized_value: { $regex: normalized.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') } }).lean();
        if (loose) {
          console.log(`FOUND (loose): "${name}" -> value_name: "${loose.value_name}", status: ${loose.status}, meta: ${JSON.stringify(loose.meta)}`);
        } else {
          console.log(`MISSING: "${name}" not found in master values`);
        }
      }
    }

    // show first 5 test records
    const firstRows = await MasterValue.find({ category_id: category._id, 'meta.kind': 'test' }).sort({ value_name: 1 }).limit(5).lean();
    console.log('\nSample records (first 5):');
    firstRows.forEach((r) => console.log({ _id: r._id.toString(), value_name: r.value_name, meta: r.meta, status: r.status }));

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    try { await mongoose.connection.close(); } catch (e) {}
    process.exit(1);
  }
})();
