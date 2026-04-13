/*
Set meta.medicineType='Antibiotics' for medicines whose normalized_value indicates antibiotics.
Usage: node scripts/fix_antibiotics_3.js [instituteId]
*/
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');
const Institute = (() => { try { return require('../models/master_institute'); } catch (e) { return null; }})();

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

async function main() {
  await connectToMongo(MONGO_DEFAULT);
  const argId = process.argv[2];
  let institute = null;
  if (argId) institute = Institute ? await Institute.findById(argId) : null;
  if (!institute) institute = Institute ? await Institute.findOne() : null;
  if (!institute) { console.error('No institute found'); process.exit(1); }
  const instituteId = institute._id;

  const medicinesCat = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: 'medicines' });
  if (!medicinesCat) { console.error('Medicines category not found'); process.exit(1); }

  // Update docs where normalized_value contains ::antibiotics::
  const filter = { Institute_ID: instituteId, category_id: medicinesCat._id, normalized_value: /::antibiotics::/ };
  const update = { $set: { 'meta.medicineType': 'Antibiotics' } };
  const res = await MasterValue.updateMany(filter, update);
  console.log('MatchedCount:', res.matchedCount || res.n || 0, 'ModifiedCount:', res.modifiedCount || res.nModified || 0);

  // Also, set for any docs where meta exists but medicineType missing and value_name matches common patterns (fallback)
  const fallbackFilter = { Institute_ID: instituteId, category_id: medicinesCat._id, 'meta.medicineType': { $exists: false }, value_name: /cef|amox|amib|ampic|clox|cepha|cipro|levo|azith|clarith|eryth|metronid|tinid|cotrimox|nitrofur|linezolid|vancomycin|amikacin|gentamicin|ceftriaxone|cefepime|meropenem|imipenem|piperacillin|aztreonam|colistin|clindamycin|teicoplanin|tigecycline|polymyxin|rifampicin|isoniazid|pyrazinamide|ethambutol/i };
  const res2 = await MasterValue.updateMany(fallbackFilter, { $set: { 'meta.medicineType': 'Antibiotics' } });
  console.log('Fallback Matched:', res2.matchedCount || res2.n || 0, 'Fallback Modified:', res2.modifiedCount || res2.nModified || 0);

  const finalCount = await MasterValue.countDocuments({ Institute_ID: instituteId, category_id: medicinesCat._id, 'meta.medicineType': { $regex: '^\\s*Antibiotics\\s*$', $options: 'i' } });
  console.log('Final Antibiotics count in DB:', finalCount);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
