/*
Import medicines from imports/medicines_raw.txt

Usage: node scripts/import_medicines_from_raw.js
*/
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');
const Institute = (() => { try { return require('../models/master_institute'); } catch (e) { return null; }})();

const FILE = path.join(__dirname, '..', 'imports', 'medicines_raw.txt');
const MONGO_DEFAULT = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';

const normalize = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeKey = (parts) => parts.map(p => String(p||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'')).join('::');

async function ensureCategory(instituteId, name) {
  const normalized = normalize(name);
  let cat = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: normalized });
  if (!cat) {
    cat = await MasterCategory.create({ Institute_ID: instituteId, category_name: name, normalized_name: normalized, status: 'Active' });
    console.log('Created category', name);
  }
  return cat;
}

async function parseFile() {
  const txt = fs.readFileSync(FILE, 'utf8');
  const lines = txt.split(/\r?\n/);

  const entries = [];
  let currentType = '';
  for (let raw of lines) {
    const line = raw.replace(/\u00A0/g,' ').trim();
    if (!line) continue;
    // skip header
    if (/^Dosage Form/i.test(line)) continue;
    // if line has tab -> form and medicine
    if (line.includes('\t')) {
      const [form, medicineRaw] = line.split('\t').map(s => s.trim()).filter(Boolean);
      if (!medicineRaw) continue;
      // extract strength if last token contains a digit
      const parts = medicineRaw.split(/\s+/);
      let strength = '';
      if (parts.length > 1 && /\d/.test(parts[parts.length-1])) {
        strength = parts.pop();
      }
      const value_name = parts.join(' ');
      entries.push({ value_name, medicineType: currentType || '', dosageForm: form || '', strength });
      continue;
    }
    // if uppercase line without tab, treat as medicineType heading
    const isHeading = line === line.toUpperCase();
    if (isHeading) {
      currentType = line;
      continue;
    }
    // otherwise ignore
  }
  return entries;
}

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
    console.log('Connected to mongo');
    return;
  } catch (err) {
    const isSrvDnsIssue =
      mongoUri?.startsWith('mongodb+srv://') &&
      (err?.message?.includes('querySrv ECONNREFUSED') || err?.code === 'ECONNREFUSED');

    if (!isSrvDnsIssue) throw err;

    console.warn('Mongo SRV DNS lookup failed. Retrying with DNS fallback...');
    const fallbackUri = await buildFallbackMongoUri(mongoUri);
    await mongoose.connect(fallbackUri);
    console.log('Connected to mongo (DNS fallback).');
  }
}

async function main() {
  await connectToMongo(MONGO_DEFAULT);

  let institute = Institute ? await Institute.findOne() : null;
  if (!institute) {
    console.log('No Institute found. Creating temporary institute...');
    institute = Institute ? await Institute.create({ Institute_Name: 'Imported Institute', Address: {}, Email_ID: 'import@example.local', password: 'imported' }) : null;
  }
  const instituteId = institute ? institute._id : null;
  console.log('Using institute id:', instituteId);

  const medicinesCat = await ensureCategory(instituteId, 'Medicines');
  await ensureCategory(instituteId, 'Medicine Types');
  await ensureCategory(instituteId, 'Dosage Forms');

  const entries = await parseFile();
  console.log('Parsed entries:', entries.length);

  let created = 0;
  for (const e of entries) {
    const valueName = String(e.value_name || '').trim();
    if (!valueName) continue;

    const strength = String(e.strength || '').trim();
    const dosageForm = String(e.dosageForm || '').trim();
    const medicineType = String(e.medicineType || '').trim();

    const normalized_value = normalizeKey([valueName, medicineType, dosageForm, strength]);

    const exists = await MasterValue.findOne({ Institute_ID: instituteId, category_id: medicinesCat._id, normalized_value });
    if (exists) continue;

    const meta = { kind: 'medicine', medicineType, dosageForm, strength };
    try {
      await MasterValue.create({ Institute_ID: instituteId, category_id: medicinesCat._id, value_name: valueName, normalized_value, status: 'Active', meta });
      created++;
    } catch (err) {
      if (err.code === 11000) continue;
      console.error('Failed to create', valueName, err.message);
    }
  }

  console.log('Import complete. Created:', created);
  mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
