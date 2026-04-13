const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const dns = require('dns');

const getResolver = () => {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);
  return resolver;
};

const buildFallbackMongoUri = async (mongoSrvUri) => {
  const uri = new URL(mongoSrvUri);
  const host = uri.hostname;
  const dbName = uri.pathname && uri.pathname !== "/" ? uri.pathname.slice(1) : "test";
  const username = decodeURIComponent(uri.username || "");
  const password = decodeURIComponent(uri.password || "");

  const resolver = getResolver();

  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  const hosts = srvRecords
    .sort((a, b) => a.priority - b.priority)
    .map((record) => `${record.name.replace(/\.$/, "")}:${record.port}`)
    .join(",");

  let txtParams = "";
  try {
    const txtRecords = await resolver.resolveTxt(host);
    txtParams = txtRecords.flat().join("");
  } catch (err) {
    txtParams = "";
  }

  const params = new URLSearchParams(uri.search || "");
  if (txtParams) {
    const txtSearchParams = new URLSearchParams(txtParams);
    for (const [key, value] of txtSearchParams.entries()) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }
  }

  if (!params.has("tls")) params.set("tls", "true");
  if (!params.has("retryWrites")) params.set("retryWrites", "true");
  if (!params.has("w")) params.set("w", "majority");

  const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : "";

  return `mongodb://${authPart}${hosts}/${dbName}?${params.toString()}`;
};

const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';

const connect = async () => {
  try {
    await mongoose.connect(MONGO);
  } catch (err) {
    const isSrvDnsIssue =
      MONGO?.startsWith('mongodb+srv://') && (err?.message?.includes('querySrv ECONNREFUSED') || err?.code === 'ECONNREFUSED');
    if (!isSrvDnsIssue) throw err;
    console.warn('SRV DNS failed, trying fallback');
    const fallback = await buildFallbackMongoUri(MONGO);
    await mongoose.connect(fallback);
  }
};

(async () => {
  await connect();
  const db = mongoose.connection.db;
  const col = db.collection('mastervalues');
  const total = await col.countDocuments({});
  console.log('mastervalues total:', total);

  const kinds = await col.aggregate([
    { $group: { _id: "$meta.kind", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('Counts by meta.kind:');
  console.table(kinds);

  const sampleTests = await col.find({ 'meta.kind': 'test' }).limit(10).toArray();
  console.log('\nSample test records (up to 10):');
  sampleTests.forEach(r => console.log({ _id: r._id.toString(), value_name: r.value_name, normalized_value: r.normalized_value, status: r.status, meta: r.meta, Institute_ID: r.Institute_ID ? r.Institute_ID.toString() : null, category_id: r.category_id ? r.category_id.toString() : null }));

  await mongoose.connection.close();
})();
