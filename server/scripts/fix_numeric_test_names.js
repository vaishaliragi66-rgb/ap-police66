const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/../.env' });
const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
const MasterValue = require('../models/master_value');
const MasterCategory = require('../models/master_category');

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

const normalize = (v) => String(v||'').trim().toLowerCase();

(async ()=>{
  await connect();
  const instituteId = process.argv[2];
  if (!instituteId) { console.error('Usage: node fix_numeric_test_names.js <instituteId>'); process.exit(1); }

  // Backup affected docs
  const backupDir = `server/exports/fix_numeric_test_names_${instituteId}_${new Date().toISOString().replace(/[:.]/g,'-')}`;
  fs.mkdirSync(backupDir, { recursive: true });

  const docs = await MasterValue.find({ Institute_ID: instituteId, 'meta.kind': 'test', value_name: { $regex: '^\\d+$' } }).lean();
  fs.writeFileSync(`${backupDir}/numeric_test_docs_${instituteId}.json`, JSON.stringify(docs, null, 2));
  console.log('Found numeric test docs:', docs.length);

  let updated = 0;
  for (const doc of docs) {
    const id = doc._id;
    const properName = String(doc.meta && doc.meta.category || '').trim();
    if (!properName) continue;
    const normalized = normalize(properName).replace(/[^a-z0-9\s\-\/\.]+/g,'').replace(/\s+/g,' ');
    try {
      await MasterValue.updateOne({ _id: id }, { $set: { value_name: properName, normalized_value: normalized, updatedAt: new Date() } });
      updated++;
    } catch (e) {
      console.warn('Failed to update', id, e.message);
    }
  }

  console.log('Updated numeric test docs:', updated);
  await mongoose.connection.close();
})();
