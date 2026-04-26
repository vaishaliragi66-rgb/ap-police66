const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dns = require('dns');

require('dotenv').config();

const MasterValue = require('../models/master_value');

const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI;

if (!MONGO_URL) {
  console.error('MONGO_URL not set in .env');
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
    await mongoose.connect(MONGO_URL, { connectTimeoutMS: 10000 });
  } catch (err) {
    const isSrvDnsIssue =
      MONGO_URL?.startsWith('mongodb+srv://') && (err?.message?.includes('querySrv ECONNREFUSED') || err?.code === 'ECONNREFUSED');
    if (!isSrvDnsIssue) throw err;
    console.warn('SRV DNS failed, trying fallback');
    const fallback = await buildFallbackMongoUri(MONGO_URL);
    await mongoose.connect(fallback, { connectTimeoutMS: 10000 });
  }
};

const instituteId = process.argv[2];
if (!instituteId) {
  console.error('Usage: node export_and_delete_archived_tests.js <instituteId>');
  process.exit(1);
}

(async () => {
  await connect();
  console.log('Connected');

  const filter = {
    Institute_ID: instituteId,
    'meta.archived': true,
    'meta.kind': 'test',
  };

  const docs = await MasterValue.find(filter).lean();
  const count = docs.length;
  if (!fs.existsSync(path.join(__dirname, '..', 'exports'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'exports'), { recursive: true });
  }

  const outPath = path.join(__dirname, '..', 'exports', `archived_tests_${instituteId}_${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(docs, null, 2));
  console.log(`Exported ${count} archived docs to ${outPath}`);

  if (count === 0) {
    await mongoose.disconnect();
    process.exit(0);
  }

  // Delete the documents by _id
  const ids = docs.map(d => d._id);
  const delRes = await MasterValue.deleteMany({ _id: { $in: ids } });
  console.log(`Deleted ${delRes.deletedCount} documents from MasterValue`);

  await mongoose.disconnect();
})();
