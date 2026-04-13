const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const dns = require('dns');

const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';

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
  try {
    await mongoose.connect(MONGO);
  } catch (err) {
    if (MONGO.startsWith('mongodb+srv://')) {
      const fb = await buildFallbackMongoUri(MONGO);
      await mongoose.connect(fb);
    } else throw err;
  }
};

const MasterValue = require('../models/master_value');

const args = process.argv.slice(2);
const fileArgIndex = args.findIndex(a => a === '--file' || a === '--backup');
let filePath = null;
if (fileArgIndex >= 0 && args[fileArgIndex+1]) {
  filePath = args[fileArgIndex+1];
} else {
  const instituteArg = (() => {
    const idx = args.findIndex(a => a === '--instituteId');
    return idx >= 0 && args[idx+1] ? args[idx+1] : null;
  })();
  if (instituteArg) {
    const exportsDir = path.join(__dirname, '..', 'exports');
    const candidates = fs.readdirSync(exportsDir).flatMap(d => {
      const p = path.join(exportsDir, d);
      try { return fs.statSync(p).isDirectory() ? fs.readdirSync(p).map(f => path.join(p, f)) : []; } catch(e){ return []; }
    });
    const found = candidates.find(c => c.includes(`mastervalues_tests_${instituteArg}.json`));
    if (found) filePath = found;
  }
}

if (!filePath) {
  console.error('Usage: node restore_mastervalues_from_backup.js --file <backup-json> OR --instituteId <id>');
  process.exit(1);
}

(async () => {
  await connect();
  console.log('Connected to MongoDB');

  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) {
    console.error('Backup file not found:', abs);
    process.exit(1);
  }

  const content = fs.readFileSync(abs, 'utf8');
  let docs = [];
  try { docs = JSON.parse(content || '[]'); } catch (e) { console.error('Failed to parse JSON', e); process.exit(1); }

  let applied = 0;
  for (const doc of docs) {
    try {
      const id = doc._id;
      const update = {
        Institute_ID: doc.Institute_ID,
        category_id: new mongoose.Types.ObjectId(String(doc.category_id)),
        value_name: doc.value_name,
        normalized_value: doc.normalized_value,
        status: doc.status || 'Active',
        meta: doc.meta || {}
      };

      await MasterValue.updateOne({ _id: new mongoose.Types.ObjectId(String(id)) }, { $set: update }, { upsert: true });
      applied++;
    } catch (e) {
      console.error('Failed to restore doc', doc && doc._id, e.message || e);
    }
  }

  console.log(`Restored ${applied} mastervalue docs from backup ${abs}`);
  await mongoose.connection.close();
  process.exit(0);
})();
