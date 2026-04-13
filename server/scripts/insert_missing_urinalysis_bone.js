const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/../.env' });
const imd = require('../utils/instituteMasterData');
const MasterValue = require('../models/master_value');

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

(async ()=>{
  await connect();
  const instituteId = process.argv[2];
  if (!instituteId) { console.error('Usage: node insert_missing_urinalysis_bone.js <instituteId>'); process.exit(1); }

  const testsCategory = await imd.ensureTestMasterValues(instituteId);
  if (!testsCategory) { console.error('Failed to ensure Tests category'); process.exit(1); }

  const desired = {
    'URINALYSIS': [
      'Urine pH','Urine Specific Gravity','Urine Protein','Urine Glucose','Urine Ketones','Urine RBC','Urine WBC','Urine Nitrite','Urine Bilirubin','Microalbuminuria (Spot)'
    ],
    'BONE HEALTH': [
      'Calcium (Serum)','Phosphorus (Serum)','PTH (Parathyroid Hormone)','Alkaline Phosphatase (Bone)'
    ]
  };

  const existing = await MasterValue.find({ Institute_ID: instituteId, category_id: testsCategory._id, 'meta.kind': 'test' }).lean();
  const existingSet = new Set((existing||[]).map(r=>imd.normalize(r.value_name)));

  const backupDir = `server/exports/insert_missing_urinalysis_bone_${instituteId}_${new Date().toISOString().replace(/[:.]/g,'-')}`;
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(`${backupDir}/existing_before.json`, JSON.stringify(existing, null, 2));

  const inserted = [];
  for (const [cat, tests] of Object.entries(desired)) {
    for (const name of tests) {
      const norm = imd.normalize(name);
      if (existingSet.has(norm)) continue;
      try {
        await imd.ensureValueRecord({ instituteId, categoryId: testsCategory._id, valueName: name, meta: { kind: 'test', category: cat, categoryNormalized: imd.normalize(cat), source: 'manual_fix_2026-04-15' } });
        inserted.push({ category: cat, name });
        existingSet.add(norm);
      } catch (e) {
        console.error('Failed to insert', name, e.message);
      }
    }
  }

  const after = await MasterValue.find({ Institute_ID: instituteId, category_id: testsCategory._id, 'meta.kind': 'test' }).lean();
  fs.writeFileSync(`${backupDir}/report.json`, JSON.stringify({ inserted, before: existing.length, after: after.length }, null, 2));
  console.log('Inserted:', inserted.length, 'Before:', existing.length, 'After:', after.length, 'Report:', `${backupDir}/report.json`);
  await mongoose.connection.close();
})();
