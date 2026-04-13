/*
List all MasterValue docs under 'Medicine Types' category and detect entries that look like medicine names.
Usage: node scripts/list_medicine_types_entries.js [instituteId]
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

function looksLikeMedicineName(s) {
  if (!s) return false;
  const lower = String(s).toLowerCase();
  // heuristic: contains mg, ml, iu, % or digits
  if (/\d/.test(lower) && /mg|ml|iu|mcg|%|g|u|mu/.test(lower)) return true;
  // common medicine word patterns
  if (/tablet|capsule|syrup|injection|cream|ointment|drops|suspension|inhaler/.test(lower)) return true;
  // multi-word with digits
  if (/\w+ \d+/.test(lower)) return true;
  return false;
}

async function main() {
  await connectToMongo(MONGO_DEFAULT);
  const argId = process.argv[2];
  let institute = null;
  if (argId) institute = Institute ? await Institute.findById(argId) : null;
  if (!institute) institute = Institute ? await Institute.findOne() : null;
  if (!institute) { console.error('No institute found'); process.exit(1); }
  const instituteId = institute._id;

  const typesCat = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: 'medicine types' });
  if (!typesCat) { console.error('Medicine Types category not found'); process.exit(1); }

  const docs = await MasterValue.find({ Institute_ID: instituteId, category_id: typesCat._id }).lean();
  console.log('Total entries under Medicine Types:', docs.length);

  const suspicious = docs.filter(d => looksLikeMedicineName(d.value_name));
  console.log('Suspicious entries that look like medicine names:', suspicious.length);
  suspicious.slice(0, 50).forEach(d => console.log('-', d.value_name, '| normalized:', d.normalized_value || ''));

  // show count per normalized_value
  const counts = docs.reduce((acc, d) => { const k = String(d.normalized_value || (d.value_name||'')).toLowerCase(); acc[k] = (acc[k]||0)+1; return acc; }, {});
  const dupCount = Object.values(counts).filter(c => c>1).length;
  console.log('Distinct normalized types:', Object.keys(counts).length, 'Entries with duplicate normalized_value count:', dupCount);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
