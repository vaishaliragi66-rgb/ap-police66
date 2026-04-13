const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/../.env' });
const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
const MasterValue = require('../models/master_value');
const MasterCategory = require('../models/master_category');
const imd = require('../utils/instituteMasterData');

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

const normalize = v => String(v||'').trim().toLowerCase().replace(/[^a-z0-9\s\-\/\.]+/g,'').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'');

(async ()=>{
  await connect();
  const instituteId = process.argv[2];
  if (!instituteId) { console.error('Usage: node move_tests_to_tests_category.js <instituteId>'); process.exit(1); }

  // ensure Tests master category exists and test category values are present
  const testsCategory = await imd.ensureTestMasterValues(instituteId);
  if (!testsCategory) { console.error('Failed to ensure Tests category'); process.exit(1); }

  // Find test values inserted by our custom panel
  const docs = await MasterValue.find({ Institute_ID: instituteId, 'meta.kind': 'test', 'meta.source': 'custom_panel_2026-04-15' }).lean();
  console.log('Found inserted test docs to move:', docs.length);

  const backupDir = `server/exports/move_tests_to_tests_category_${instituteId}_${new Date().toISOString().replace(/[:.]/g,'-')}`;
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(`${backupDir}/before_move.json`, JSON.stringify(docs, null, 2));

  let moved = 0;
  const failures = [];
  for (const doc of docs) {
    try {
      // Try to resolve the original group name from the category_id if it's a MasterCategory
      let groupName = doc.meta && doc.meta.category;
      if (!groupName) {
        const cat = await MasterCategory.findById(doc.category_id).lean();
        if (cat && cat.category_name) groupName = cat.category_name;
      }

      if (!groupName) groupName = 'Uncategorized';

      // ensure a category value exists under Tests for this group
      await imd.ensureValueRecord({ instituteId, categoryId: testsCategory._id, valueName: groupName, meta: { kind: 'category' } });

      // perform update: change category_id to testsCategory._id and set meta.category fields
      await MasterValue.updateOne({ _id: doc._id }, { $set: { category_id: testsCategory._id, 'meta.category': groupName, 'meta.categoryNormalized': normalize(groupName) } });
      moved++;
    } catch (e) {
      failures.push({ id: doc._id, error: e.message });
    }
  }

  const after = await MasterValue.countDocuments({ Institute_ID: instituteId, category_id: testsCategory._id, 'meta.kind': 'test' });
  fs.writeFileSync(`${backupDir}/summary.json`, JSON.stringify({ initially: docs.length, moved, failures, after }, null, 2));
  console.log('Moved:', moved, 'Failures:', failures.length, 'After count:', after);
  await mongoose.connection.close();
})();
