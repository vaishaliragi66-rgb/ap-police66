/*
Fix MasterValue.meta.medicineType for entries listed under ANTI BIOTICS in the corrected import file.
Also normalize the Medicine Types master value to 'Antibiotics'.

Usage: node scripts/fix_antibiotics_type.js [instituteId]
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

const normalize = (v) => String(v || '').trim();
const normalizeLoose = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function parseAntibioticsFromFile() {
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
      const last = parts[parts.length-1] || '';
      if (/^\d+[a-zA-Z%\\/]+$/i.test(last) || /\d/.test(last) && /(mg|g|ml|iu|mcg|%|u|mu)/i.test(last)) {
        strength = parts.pop();
      }
      const value_name = parts.join(' ');
      if ((currentType || '').toLowerCase().includes('anti') && (currentType || '').toLowerCase().includes('biot')) {
        entries.push({ value_name: normalize(value_name), dosageForm: normalize(form), strength: normalize(strength) });
      }
      continue;
    }
    const isHeading = line === line.toUpperCase();
    if (isHeading) { currentType = line; continue; }
  }
  return entries;
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

  const antibiotics = await parseAntibioticsFromFile();
  console.log('Antibiotics entries found in file:', antibiotics.length);

  // Update medicines: set meta.medicineType = 'Antibiotics' for matching value_names
  let totalUpdated = 0;
  for (const a of antibiotics) {
    const name = a.value_name;
    if (!name) continue;
    const res = await MasterValue.updateMany({ Institute_ID: instituteId, category_id: medicinesCat._id, value_name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } }, { $set: { 'meta.medicineType': 'Antibiotics' } });
    totalUpdated += res.modifiedCount || 0;
  }
  console.log('Total Medicine docs updated:', totalUpdated);

  // Normalize Medicine Types entry to 'Antibiotics'
  const candidates = await MasterValue.find({ Institute_ID: instituteId, category_id: typesCat._id });
  for (const c of candidates) {
    const key = normalizeLoose(c.value_name || c.normalized_value || '');
    if (key.includes('anti') && key.includes('biot')) {
      c.value_name = 'Antibiotics';
      c.normalized_value = normalizeLoose('Antibiotics');
      await c.save();
      console.log('Updated Medicine Type entry id:', c._id.toString());
    }
  }

  // Report final counts for Antibiotics
  const docs = await MasterValue.find({ Institute_ID: instituteId, category_id: medicinesCat._id, 'meta.medicineType': { $regex: '^\\s*Antibiotics\\s*$', $options: 'i' } });
  console.log('Final Antibiotics count in DB (meta.medicineType == Antibiotics):', docs.length);

  mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
