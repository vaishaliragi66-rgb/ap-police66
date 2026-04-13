const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
const MasterCategory = require('../models/master_category');
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

(async ()=>{
  await connect();
  const instituteId = process.argv[2];
  if (!instituteId) { console.error('Usage: node diagnose_test_name_issues.js <instituteId>'); process.exit(1); }

  const testsCat = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: 'tests' });
  if (!testsCat) { console.error('Tests category not found'); process.exit(1); }

  // find test values where value_name looks numeric or very short
  const numericNames = await MasterValue.find({ Institute_ID: instituteId, category_id: testsCat._id, 'meta.kind': 'test', value_name: { $regex: '^\\d+$' } }).limit(200).lean();
  console.log('Numeric value_name count:', numericNames.length);
  numericNames.slice(0,50).forEach(doc=>{
    console.log('ID:', doc._id, 'value_name:', doc.value_name, 'meta:', doc.meta);
  });

  // find tests where meta.reference looks like contains digits and value_name is short
  const suspect = await MasterValue.find({ Institute_ID: instituteId, category_id: testsCat._id, 'meta.kind': 'test', $or:[ { value_name: { $regex: '^.{0,4}$' } }, { 'meta.reference': { $regex: '\\d' } } ] }).limit(200).lean();
  console.log('Suspect count:', suspect.length);
  suspect.slice(0,50).forEach(doc=>{
    console.log('ID:', doc._id, 'value_name:', doc.value_name, 'meta.reference:', doc.meta && doc.meta.reference, 'meta.category:', doc.meta && doc.meta.category);
  });

  await mongoose.connection.close();
})();
