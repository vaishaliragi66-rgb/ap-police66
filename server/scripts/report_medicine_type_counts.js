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
  try { await mongoose.connect(uri); } catch (err) {
    if (uri?.startsWith('mongodb+srv://') && (err?.message?.includes('querySrv ECONNREFUSED') || err?.code === 'ECONNREFUSED')) {
      const fallback = await buildFallbackMongoUri(uri);
      await mongoose.connect(fallback);
    } else throw err;
  }
}

function medicineTypeKey(meta) {
  if (!meta || typeof meta !== 'object') return 'UNKNOWN';
  return String(meta.medicineType || meta.medicine_type || meta.typeCategory || meta.typeNormalized || meta.type || '').trim() || 'UNKNOWN';
}

async function main() {
  await connectToMongo(MONGO_DEFAULT);
  const institute = Institute ? await Institute.findOne() : null;
  if (!institute) { console.error('No institute found'); process.exit(1); }
  const instituteId = institute._id;

  const medicinesCat = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: 'medicines' });
  if (!medicinesCat) { console.error('No Medicines category found'); process.exit(1); }

  const vals = await MasterValue.find({ Institute_ID: instituteId, category_id: medicinesCat._id }).lean();
  console.log('Total medicines in DB for institute:', vals.length);

  const counts = {};
  const samples = {};
  const missingType = [];

  for (const v of vals) {
    const key = medicineTypeKey(v.meta);
    counts[key] = (counts[key] || 0) + 1;
    if (!samples[key]) samples[key] = [];
    if (samples[key].length < 10) samples[key].push(v.value_name + (v.meta?.strength ? ` ${v.meta.strength}` : ''));
    if (key === 'UNKNOWN') missingType.push(v.value_name);
  }

  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  console.log('Counts by medicineTypeKey:');
  sorted.forEach(([k,c])=>{
    console.log('-', k, ':', c);
    console.log('  sample:', (samples[k]||[]).slice(0,5).join(', '));
  });

  if (missingType.length) {
    console.log('\nEntries with UNKNOWN medicineType (first 20):');
    console.log(missingType.slice(0,20).join(', '));
  }

  mongoose.disconnect();
}

main().catch(err=>{ console.error(err); process.exit(1); });
