const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const MasterValue = require('../models/master_value');
const MasterCategory = require('../models/master_category');
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
  const institute = Institute ? await Institute.findOne() : null;
  if (!institute) { console.log('No institute found'); process.exit(1); }
  const instituteId = institute._id;
  const medicinesCat = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: 'medicines' });
  if (!medicinesCat) { console.log('No medicines category'); process.exit(1); }

  console.log('Institute:', instituteId.toString());
  console.log('Medicines category id:', medicinesCat._id.toString());

  const docs = await MasterValue.find({ Institute_ID: instituteId, category_id: medicinesCat._id, value_name: /amox/i }).limit(50).lean();
  console.log('Found', docs.length, 'documents with value_name matching /amox/i');
  docs.forEach(d => {
    console.log('- value_name:', JSON.stringify(d.value_name), '| normalized_value:', d.normalized_value, '| meta:', JSON.stringify(d.meta));
  });

  const antibCount = await MasterValue.countDocuments({ Institute_ID: instituteId, category_id: medicinesCat._id, 'meta.medicineType': { $regex: '^\\s*Antibiotics\\s*$', $options: 'i' } });
  console.log('Documents with meta.medicineType == Antibiotics:', antibCount);

  const anyWithMeta = await MasterValue.find({ Institute_ID: instituteId, category_id: medicinesCat._id, 'meta.medicineType': { $exists: true } }).limit(10).lean();
  console.log('Sample docs with meta.medicineType set (up to 10):');
  anyWithMeta.forEach(d => console.log('-', JSON.stringify({ value_name: d.value_name, meta: d.meta })));

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
