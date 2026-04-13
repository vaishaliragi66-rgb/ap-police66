const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const { ensureTestMasterValues, listMasterTests } = require('../utils/instituteMasterData');
const fs = require('fs');

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

const connect = async () => { try{ await mongoose.connect(MONGO); } catch(err){ if(MONGO.startsWith('mongodb+srv://')){ const fb = await buildFallbackMongoUri(MONGO); await mongoose.connect(fb); } else throw err; } };

(async () => {
  await connect();
  const Institute = mongoose.connection.db.collection('institutes');
  // Accept --instituteId or -i on command line
  let instituteIdArg = null;
  const idx = process.argv.findIndex((a) => a === '--instituteId' || a === '-i');
  if (idx >= 0 && process.argv[idx + 1]) {
    instituteIdArg = process.argv[idx + 1];
  } else {
    const eq = process.argv.find((a) => a && a.indexOf('--instituteId=') === 0);
    if (eq) instituteIdArg = eq.split('=')[1];
  }

  let inst = null;
  if (instituteIdArg) {
    try {
      const oid = new mongoose.Types.ObjectId(instituteIdArg);
      inst = await Institute.findOne({ _id: oid });
      if (!inst) {
        console.warn('No institute found with provided id:', instituteIdArg);
      }
    } catch (e) {
      console.warn('Invalid instituteId provided:', instituteIdArg);
    }
  }
  if (!inst) inst = await Institute.findOne({});
  if (!inst) {
    console.log('No institute found');
    process.exit(0);
  }
  const instituteId = inst._id.toString();
  console.log('Using institute:', instituteId);

  // Ensure tests
  await ensureTestMasterValues(instituteId);
  const masterTests = await listMasterTests(instituteId, { includeInactive: true });

  // Build categories set similar to server
  const DEFAULT_TEST_CATEGORIES = require('../utils/instituteMasterData').DEFAULT_TEST_CATEGORIES || [];
  const categoriesSet = new Set(DEFAULT_TEST_CATEGORIES.map(c => String(c).trim()));
  masterTests.forEach((t) => {
    const categoryName = String(t.Group || '').trim();
    if (categoryName) categoriesSet.add(categoryName);
  });

  const categories = Array.from(categoriesSet).sort((a,b)=>a.localeCompare(b));
  const testsByCategory = {};
  categories.forEach(c=>testsByCategory[c]=[]);
  masterTests.forEach((test)=>{
    const categoryName = String(test.Group || '').trim() || 'Uncategorized';
    if (!testsByCategory[categoryName]) testsByCategory[categoryName]=[];
    testsByCategory[categoryName].push({ id: test._id, name: test.Test_Name, reference: test.Reference_Range, unit: test.Units });
  });

  console.log('categories count:', categories.length);
  console.log('sample categories:', categories.slice(0,20));
  for (const c of categories) {
    console.log('->', c, 'tests:', (testsByCategory[c] || []).length);
  }

  await mongoose.connection.close();
})();
