/*
Correct Antibiotics assignment precisely using full medicine names from corrected file.
Usage: node scripts/fix_antibiotics_type_2.js [instituteId]
*/
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');
const Institute = (() => { try { return require('../models/master_institute'); } catch (e) { return null; }})();

const FILE = path.join(__dirname, '..', 'imports', 'medicines_corrected.txt');
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

const normalizeKey = (s) => String(s || '').trim().toLowerCase();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

function parseAntibioticsFullNames() {
  const txt = fs.readFileSync(FILE, 'utf8');
  const lines = txt.split(/\r?\n/);
  let currentType = '';
  const names = [];
  for (let raw of lines) {
    const line = raw.replace(/\u00A0/g,' ').trim();
    if (!line) continue;
    if (/^Dosage Form/i.test(line)) continue;
    if (line.includes('\t')) {
      const [form, medicineRaw] = line.split('\t').map(s=>s.trim()).filter(Boolean);
      if (!medicineRaw) continue;
      // Use full medicineRaw as value_name (do not strip strength)
      if ((currentType || '').toLowerCase().includes('anti') && (currentType || '').toLowerCase().includes('biot')) {
        names.push(medicineRaw.trim());
      }
      continue;
    }
    const isHeading = line === line.toUpperCase();
    if (isHeading) { currentType = line; continue; }
  }
  return names;
}

async function main() {
  await connectToMongo(MONGO_DEFAULT);
  console.log('Connected to mongo');

  let institute = null;
  const argId = process.argv[2];
  if (argId) institute = Institute ? await Institute.findById(argId) : null;
  if (!institute) institute = Institute ? await Institute.findOne() : null;
  if (!institute) { console.log('No institute found. Aborting.'); process.exit(1); }
  const instituteId = institute._id;
  console.log('Using institute:', instituteId.toString());

  const medicinesCat = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: 'medicines' });
  const typesCat = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: 'medicine types' });
  if (!medicinesCat) { console.error('Medicines category not found'); process.exit(1); }
  if (!typesCat) { console.error('Medicine Types category not found'); process.exit(1); }

  const antibioticNames = parseAntibioticsFullNames();
  console.log('Antibiotic names loaded:', antibioticNames.length);
  const nameSet = new Set(antibioticNames.map(n => normalizeKey(n)));

  // Set meta.medicineType = 'Antibiotics' for exact name matches
  let setCount = 0;
  for (const name of antibioticNames) {
    const res = await MasterValue.updateMany({ Institute_ID: instituteId, category_id: medicinesCat._id, value_name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } }, { $set: { 'meta.medicineType': 'Antibiotics' } });
    setCount += res.modifiedCount || 0;
  }
  console.log('Documents set to Antibiotics (exact matches):', setCount);

  // For any other docs incorrectly labeled as Antibiotics but not in list, unset meta.medicineType
  const allAntibioticsDocs = await MasterValue.find({ Institute_ID: instituteId, category_id: medicinesCat._id, 'meta.medicineType': { $regex: '^\\s*Antibiotics\\s*$', $options: 'i' } });
  let unsetCount = 0;
  for (const doc of allAntibioticsDocs) {
    const key = normalizeKey(doc.value_name || '');
    if (!nameSet.has(key)) {
      // unset field
      const res = await MasterValue.updateOne({ _id: doc._id }, { $unset: { 'meta.medicineType': '' } });
      unsetCount += res.modifiedCount || 0;
    }
  }
  console.log('Documents unset from Antibiotics (not in list):', unsetCount);

  // Normalize Medicine Types: keep one 'Antibiotics' entry and remove duplicates
  const candidates = await MasterValue.find({ Institute_ID: instituteId, category_id: typesCat._id });
  const antibCandidates = candidates.filter(c => {
    const k = normalizeKey(c.value_name || c.normalized_value || '');
    return k.includes('anti') && k.includes('biot');
  });
  console.log('Medicine Types candidates matching antibiotics:', antibCandidates.length);
  let kept = null;
  for (const c of antibCandidates) {
    if (normalizeKey(c.value_name) === 'antibiotics' || (c.normalized_value && normalizeKey(c.normalized_value) === 'antibiotics')) {
      kept = c; break;
    }
  }
  if (!kept && antibCandidates.length) kept = antibCandidates[0];

  if (kept) {
    // update kept to canonical
    kept.value_name = 'Antibiotics';
    kept.normalized_value = 'antibiotics';
    await kept.save();
    // delete others
    for (const c of antibCandidates) {
      if (String(c._id) === String(kept._id)) continue;
      await MasterValue.deleteOne({ _id: c._id });
      console.log('Deleted duplicate Medicine Type:', c.value_name);
    }
  } else {
    // create a new one
    const created = await MasterValue.create({ Institute_ID: instituteId, category_id: typesCat._id, value_name: 'Antibiotics', normalized_value: 'antibiotics', status: 'Active', meta: {} });
    console.log('Created Medicine Type entry:', created._id.toString());
  }

  // Final count check
  const finalDocs = await MasterValue.find({ Institute_ID: instituteId, category_id: medicinesCat._id, 'meta.medicineType': { $regex: '^\\s*Antibiotics\\s*$', $options: 'i' } });
  console.log('Final Antibiotics count in DB:', finalDocs.length);

  mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
