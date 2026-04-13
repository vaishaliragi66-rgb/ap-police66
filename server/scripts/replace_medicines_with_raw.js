/*
Deletes existing Medicines MasterValue entries for the institute (first institute found)
and re-imports all entries from imports/medicines_raw.txt. Also ensures Medicine Types
are present under the 'Medicine Types' category as MasterValue entries.

Usage: node scripts/replace_medicines_with_raw.js
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

const dns = require('dns');
const getResolver = () => { const r = new dns.promises.Resolver(); r.setServers(['8.8.8.8','1.1.1.1']); return r; };
const buildFallbackMongoUri = async (mongoSrvUri) => {
  const uri = new URL(mongoSrvUri);
  const host = uri.hostname;
  const dbName = uri.pathname && uri.pathname !== '/' ? uri.pathname.slice(1) : 'test';
  const username = decodeURIComponent(uri.username || '');
  const password = decodeURIComponent(uri.password || '');
  const resolver = getResolver();
  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  const hosts = srvRecords.sort((a,b)=>a.priority-b.priority).map(r=>`${r.name.replace(/\.$/,'')}:${r.port}`).join(',');
  let txtParams = '';
  try { txtParams = (await resolver.resolveTxt(host)).flat().join(''); } catch {};
  const params = new URLSearchParams(uri.search || '');
  if (txtParams) { const p = new URLSearchParams(txtParams); for (const [k,v] of p.entries()) if (!params.has(k)) params.set(k,v); }
  if (!params.has('tls')) params.set('tls','true');
  if (!params.has('retryWrites')) params.set('retryWrites','true');
  if (!params.has('w')) params.set('w','majority');
  const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  return `mongodb://${auth}${hosts}/${dbName}?${params.toString()}`;
};
async function connectToMongo(uri) {
  try { await mongoose.connect(uri); return; } catch (err) {
    const isSrv = uri?.startsWith('mongodb+srv://') && (err?.message?.includes('querySrv ECONNREFUSED') || err?.code === 'ECONNREFUSED');
    if (!isSrv) throw err;
    const fallback = await buildFallbackMongoUri(uri);
    await mongoose.connect(fallback);
  }
}

const normalize = (v) => String(v || '').trim();
const normalizeKey = (parts) => parts.map(p => String(p||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'')).join('::');

async function parseFile() {
  const txt = fs.readFileSync(FILE, 'utf8');
  const lines = txt.split(/\r?\n/);
  const entries = [];
  let currentType = '';
  for (let raw of lines) {
    const line = raw.replace(/\u00A0/g,' ').trim();
    if (!line) continue;
    if (/^Dosage Form/i.test(line)) continue;
    if (line.includes('\t')) {
      const [form, medicineRaw] = line.split('\t').map(s=>s.trim()).filter(Boolean);
      if (!medicineRaw) continue;
      const parts = medicineRaw.split(/\s+/);
      let strength = '';
      if (parts.length>1 && /\d/.test(parts[parts.length-1])) strength = parts.pop();
      const value_name = parts.join(' ');
      entries.push({ value_name: normalize(value_name), medicineType: normalize(currentType), dosageForm: normalize(form), strength: normalize(strength) });
      continue;
    }
    const isHeading = line === line.toUpperCase();
    if (isHeading) { currentType = line; continue; }
  }
  return entries;
}

async function ensureMasterTypeValue(instituteId, typesCategory, typeName) {
  if (!typeName) return;
  const norm = typeName.trim().toLowerCase();
  const existing = await MasterValue.findOne({ Institute_ID: instituteId, category_id: typesCategory._id, normalized_value: norm });
  if (existing) return existing;
  return await MasterValue.create({ Institute_ID: instituteId, category_id: typesCategory._id, value_name: typeName, normalized_value: norm, status: 'Active', meta: {} });
}

async function main() {
  await connectToMongo(MONGO_DEFAULT);
  console.log('Connected to mongo');

  let institute = Institute ? await Institute.findOne() : null;
  if (!institute) {
    console.log('No institute found. Aborting.');
    process.exit(1);
  }
  const instituteId = institute._id;
  console.log('Using institute:', instituteId.toString());

  let medicinesCat = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: 'medicines' });
  if (!medicinesCat) medicinesCat = await MasterCategory.create({ Institute_ID: instituteId, category_name: 'Medicines', normalized_name: 'medicines', status: 'Active' });

  let typesCat = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: 'medicine types' });
  if (!typesCat) typesCat = await MasterCategory.create({ Institute_ID: instituteId, category_name: 'Medicine Types', normalized_name: 'medicine types', status: 'Active' });

  // Delete existing master values under Medicines for this institute
  const delRes = await MasterValue.deleteMany({ Institute_ID: instituteId, category_id: medicinesCat._id });
  console.log('Deleted existing Medicines master values:', delRes.deletedCount);

  const entries = await parseFile();
  console.log('Parsed entries count:', entries.length);

  // ensure medicine types exist and collect normalized type names
  const uniqueTypes = [...new Set(entries.map(e => (e.medicineType || '').trim()).filter(Boolean))];
  for (const t of uniqueTypes) {
    await ensureMasterTypeValue(instituteId, typesCat, t);
  }

  // insert all entries
  const docs = entries.map(e => ({ Institute_ID: instituteId, category_id: medicinesCat._id, value_name: e.value_name, normalized_value: normalizeKey([e.value_name, e.medicineType, e.dosageForm, e.strength]), status: 'Active', meta: { kind: 'medicine', medicineType: e.medicineType, dosageForm: e.dosageForm, strength: e.strength } }));

  let created = 0;
  if (docs.length) {
    try {
      await MasterValue.insertMany(docs, { ordered: false });
      created = docs.length;
    } catch (err) {
      // if some duplicates/errors, try inserting one-by-one to count successful inserts
      created = 0;
      for (const d of docs) {
        try { await MasterValue.create(d); created++; } catch (e) { if (e.code===11000) continue; }
      }
    }
  }

  console.log('Re-import complete. Inserted:', created);
  mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
