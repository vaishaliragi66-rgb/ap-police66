const mongoose = require('mongoose');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: __dirname + '/../.env' });

const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
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

const normalize = s => String(s||'').trim().toLowerCase();

async function ensureCategory(collections, instituteId, catName) {
  const mc = collections.mastercategories;
  const normalized = normalize(catName);
  // existing DB uses fields: Institute_ID, category_name, normalized_name
  const existing = await mc.findOne({ Institute_ID: instituteId, normalized_name: normalized });
  if (existing) return existing._id;
  const doc = { Institute_ID: instituteId, category_name: catName, normalized_name: normalized, status: 'Active', createdAt: new Date(), updatedAt: new Date() };
  const r = await mc.insertOne(doc);
  return r.insertedId;
}

function buildNormalizedValue(name) {
  return normalize(name).replace(/[^a-z0-9\s\-\/\.]+/g,'').replace(/\s+/g,' ');
}

(async ()=>{
  await connect();
  const instituteId = process.argv[2];
  const applyFlag = process.argv.includes('--apply');
  if (!instituteId) { console.error('Usage: node apply_public_map_mastervalues.js <instituteId> [--apply]'); process.exit(1); }

  const publicMapPath = 'tmp_public_map.json';
  if (!fs.existsSync(publicMapPath)) { console.error('tmp_public_map.json not found'); process.exit(1); }
  const publicJson = JSON.parse(fs.readFileSync(publicMapPath,'utf8'));
  // tmp_public_map.json uses a top-level "Tests" key containing test entries
  let valuesArr = [];
  if (Array.isArray(publicJson.mastervalues)) valuesArr = publicJson.mastervalues;
  else if (Array.isArray(publicJson.values)) valuesArr = publicJson.values;
  else if (Array.isArray(publicJson.Tests)) valuesArr = publicJson.Tests;
  else {
    console.error('No recognizable tests/mastervalues array found in tmp_public_map.json'); process.exit(1);
  }

  const db = mongoose.connection.db;
  const collections = {
    mastervalues: db.collection('mastervalues'),
    mastercategories: db.collection('mastercategories'),
  };

  // backup current mastercategories and mastervalues for this institute
  const backupDir = `server/exports/backup_mastervalues_${instituteId}_${new Date().toISOString().replace(/[:.]/g,'-')}`;
  fs.mkdirSync(backupDir, { recursive: true });
  const existingVals = await collections.mastervalues.find({ Institute_ID: instituteId }).toArray();
  const existingCats = await collections.mastercategories.find({ Institute_ID: instituteId }).toArray();
  fs.writeFileSync(`${backupDir}/mastervalues_existing_${instituteId}.json`, JSON.stringify(existingVals, null, 2));
  fs.writeFileSync(`${backupDir}/mastercategories_existing_${instituteId}.json`, JSON.stringify(existingCats, null, 2));

  const report = { instituteId, totalSeen: 0, toUpsert: 0, upserted: 0, skipped:0, errors: [] };

  for (const v of valuesArr) {
    if (!v.meta || v.meta.kind !== 'test') continue;
    const name = v.value_name || v.meta.category || v.meta.categoryNormalized || ''; if (!name) continue;
    const cat = v.meta.category || v.meta.categoryNormalized || 'Uncategorized';
    const normalizedValue = buildNormalizedValue(name);
    report.totalSeen++;

    try {
      const categoryId = await ensureCategory(collections, instituteId, cat);
      const query = { Institute_ID: instituteId, category_id: categoryId, normalized_value: normalizedValue };
      const update = { $set: { Institute_ID: instituteId, category_id: categoryId, value_name: name, normalized_value: normalizedValue, meta: v.meta || {}, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date(), status: 'Active' } };
      report.toUpsert++;
      if (applyFlag) {
        const res = await collections.mastervalues.updateOne(query, update, { upsert: true });
        if (res.upsertedId || res.modifiedCount>0) report.upserted++;
        else report.skipped++;
      }
    } catch (e) {
      report.errors.push({ name, category: cat, error: e.message });
    }
  }

  const outPath = `${backupDir}/apply_public_map_report_${instituteId}.json`;
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('Done. Report:', outPath, 'Apply flag:', applyFlag, 'Summary:', report);
  await mongoose.connection.close();
})();
