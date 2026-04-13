const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');
const Institute = (() => { try { return require('../models/master_institute'); } catch (e) { return null; }})();

const MONGO_DEFAULT = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';

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
  if (!srvRecords || srvRecords.length === 0) {
    throw new Error("No SRV records found for MongoDB host");
  }

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

  const authPart = username
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
    : "";

  return `mongodb://${authPart}${hosts}/${dbName}?${params.toString()}`;
};

async function connectToMongo(mongoUri) {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to mongo for check.');
    return;
  } catch (err) {
    const isSrvDnsIssue =
      mongoUri?.startsWith('mongodb+srv://') &&
      (err?.message?.includes('querySrv ECONNREFUSED') || err?.code === 'ECONNREFUSED');

    if (!isSrvDnsIssue) throw err;

    console.warn('Mongo SRV DNS lookup failed. Retrying with DNS fallback...');
    const fallbackUri = await buildFallbackMongoUri(mongoUri);
    await mongoose.connect(fallbackUri);
    console.log('Connected to mongo for check (DNS fallback).');
  }
}

async function main() {
  await connectToMongo(MONGO_DEFAULT);

  const institute = Institute ? await Institute.findOne() : null;
  const instituteId = institute ? institute._id : null;
  console.log('Institute found:', institute ? `${institute._id} (${institute.Institute_Name || 'unnamed'})` : 'none');

  const medicinesCat = instituteId
    ? await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: 'medicines' })
    : await MasterCategory.findOne({ normalized_name: 'medicines' });

  if (!medicinesCat) {
    console.log('No MasterCategory "Medicines" found.');
    const totalCats = await MasterCategory.countDocuments();
    console.log('Total master categories in DB:', totalCats);
    process.exit(0);
  }

  console.log('Medicines category id:', medicinesCat._id);

  const totalValues = await MasterValue.countDocuments({ category_id: medicinesCat._id });
  console.log('Total master values under Medicines:', totalValues);

  const sample = await MasterValue.find({ category_id: medicinesCat._id }).limit(20).lean();
  console.log('Sample values (up to 20):');
  sample.forEach((v) => {
    console.log('-', v.value_name, '| normalized:', v.normalized_value, '| meta:', JSON.stringify(v.meta || {}));
  });

  // Check for specific entries
  const checkNames = ['Amoxicillin', 'Amoxicillin + Clavulanate', 'Azithromycin'];
  for (const name of checkNames) {
    const found = await MasterValue.find({ category_id: medicinesCat._id, normalized_value: name.toLowerCase() }).lean();
    console.log(`Found entries for "${name}":`, found.length);
  }

  mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
