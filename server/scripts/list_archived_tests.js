const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const dns = require('dns');
const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');

const MONGO_URL = process.env.MONGO_URL || process.env.MONGO_URI || '';
if (!MONGO_URL) {
  console.error('MONGO_URL not set');
  process.exit(1);
}

const getResolver = () => {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);
  return resolver;
};

const buildFallbackMongoUri = async (mongoSrvUri) => {
  const uri = new URL(mongoSrvUri);
  const host = uri.hostname;
  const dbName = uri.pathname && uri.pathname !== '/' ? uri.pathname.slice(1) : 'test';
  const username = decodeURIComponent(uri.username || '');
  const password = decodeURIComponent(uri.password || '');

  const resolver = getResolver();

  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  const hosts = srvRecords
    .sort((a, b) => a.priority - b.priority)
    .map((record) => `${record.name.replace(/\.$/, '')}:${record.port}`)
    .join(',');

  let txtParams = '';
  try {
    const txtRecords = await resolver.resolveTxt(host);
    txtParams = txtRecords.flat().join('');
  } catch (err) {
    txtParams = '';
  }

  const params = new URLSearchParams(uri.search || '');
  if (txtParams) {
    const txtSearchParams = new URLSearchParams(txtParams);
    for (const [key, value] of txtSearchParams.entries()) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }
  }

  if (!params.has('tls')) params.set('tls', 'true');
  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  if (!params.has('w')) params.set('w', 'majority');

  const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';

  return `mongodb://${authPart}${hosts}/${dbName}?${params.toString()}`;
};

const connect = async () => {
  try {
    await mongoose.connect(MONGO_URL);
  } catch (err) {
    const isSrvDnsIssue =
      MONGO_URL?.startsWith('mongodb+srv://') && (err?.message?.includes('querySrv ECONNREFUSED') || err?.code === 'ECONNREFUSED');
    if (!isSrvDnsIssue) throw err;
    console.warn('SRV DNS failed, trying fallback');
    const fallback = await buildFallbackMongoUri(MONGO_URL);
    await mongoose.connect(fallback);
  }
};

(async () => {
  try {
    await connect();
    console.log('Connected');
    const instituteId = String(process.argv[2] || '').trim();
    if (!instituteId) {
      console.error('Usage: node list_archived_tests.js <instituteId>');
      process.exit(1);
    }

    const testsCategory = await MasterCategory.findOne({ normalized_name: 'tests' }).lean();
    if (!testsCategory) {
      console.log('Tests category not found');
      process.exit(0);
    }

    const archived = await MasterValue.find({ Institute_ID: instituteId, category_id: testsCategory._id, 'meta.kind': 'test', 'meta.archived': true }).select('_id value_name status meta').lean();
    console.log(`Found ${archived.length} archived test rows for institute ${instituteId}`);
    archived.slice(0, 50).forEach(r => console.log({ id: String(r._id), name: r.value_name, status: r.status, meta: r.meta }));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
})();
