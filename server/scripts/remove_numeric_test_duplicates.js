const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/../.env' });
const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
const MasterValue = require('../models/master_value');

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

const normalize = v => String(v||'').trim().toLowerCase().replace(/[^a-z0-9\s\-\/\.]+/g,'').replace(/\s+/g,' ');

(async ()=>{
  await connect();
  const instituteId = process.argv[2];
  if (!instituteId) { console.error('Usage: node remove_numeric_test_duplicates.js <instituteId>'); process.exit(1); }

  const docs = await MasterValue.find({ Institute_ID: instituteId, 'meta.kind': 'test', value_name: { $regex: '^\\d+$' } }).lean();
  console.log('Numeric docs to consider:', docs.length);
  const backupDir = `server/exports/remove_numeric_test_duplicates_${instituteId}_${new Date().toISOString().replace(/[:.]/g,'-')}`;
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(`${backupDir}/numeric_docs_before.json`, JSON.stringify(docs, null, 2));

  let deleted = 0;
  for (const doc of docs) {
    const desiredNorm = normalize(doc.meta && doc.meta.category || '');
    if (!desiredNorm) continue;
    const existing = await MasterValue.findOne({ Institute_ID: instituteId, 'meta.kind': 'test', normalized_value: desiredNorm, _id: { $ne: doc._id } }).lean();
    if (existing) {
      // safe to delete numeric placeholder
      await MasterValue.deleteOne({ _id: doc._id });
      deleted++;
    } else {
      // no existing record; attempt to rename (best-effort)
      try {
        await MasterValue.updateOne({ _id: doc._id }, { $set: { value_name: doc.meta.category || doc.value_name, normalized_value: desiredNorm, updatedAt: new Date() } });
      } catch (e) {
        console.warn('Failed to update numeric doc', doc._id, e.message);
      }
    }
  }

  const after = await MasterValue.countDocuments({ Institute_ID: instituteId, 'meta.kind': 'test', value_name: { $regex: '^\\d+$' } });
  fs.writeFileSync(`${backupDir}/summary.json`, JSON.stringify({ initially: docs.length, deleted, remainingNumeric: after }, null, 2));
  console.log('Deleted numeric docs:', deleted, 'Remaining numeric count:', after);
  await mongoose.connection.close();
})();
