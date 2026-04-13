const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const dns = require('dns');

const getResolver = () => { const r = new dns.promises.Resolver(); r.setServers(['8.8.8.8','1.1.1.1']); return r; };
const buildFallbackMongoUri = async (mongoSrvUri) => {
  const uri = new URL(mongoSrvUri);
  const host = uri.hostname; const dbName = uri.pathname && uri.pathname !== '/' ? uri.pathname.slice(1) : 'test';
  const username = decodeURIComponent(uri.username||''); const password = decodeURIComponent(uri.password||'');
  const resolver = getResolver();
  const srv = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  const hosts = srv.map(s=>`${s.name.replace(/\.$/,'')}:${s.port}`).join(',');
  let txt=''; try{ txt = (await resolver.resolveTxt(host)).flat().join(''); }catch(e){}
  const params = new URLSearchParams(uri.search||''); if (txt){ const t = new URLSearchParams(txt); for(const [k,v] of t.entries()) if(!params.has(k)) params.set(k,v); }
  if(!params.has('tls')) params.set('tls','true'); if(!params.has('retryWrites')) params.set('retryWrites','true'); if(!params.has('w')) params.set('w','majority');
  const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  return `mongodb://${auth}${hosts}/${dbName}?${params.toString()}`;
};

const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
const connect = async () => { try{ await mongoose.connect(MONGO); } catch(err){ if(MONGO.startsWith('mongodb+srv://')){ const fb = await buildFallbackMongoUri(MONGO); await mongoose.connect(fb); } else throw err; } };

(async ()=>{
  await connect();
  const col = mongoose.connection.db.collection('mastervalues');

  // counts per institute for meta.kind == 'test'
  const agg = await col.aggregate([
    { $match: { 'meta.kind': 'test' } },
    { $group: { _id: '$Institute_ID', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log('Test counts by Institute_ID:');
  agg.forEach(a => console.log({ Institute_ID: a._id ? a._id.toString() : null, count: a.count }));

  // show for each institute a couple of sample test records grouped by category
  for (const row of agg) {
    const iid = row._id;
    console.log('\n--- Samples for institute', iid ? iid.toString() : 'null');
    const samples = await col.find({ Institute_ID: iid, 'meta.kind': 'test' }).sort({ 'meta.category': 1, value_name: 1 }).limit(12).toArray();
    for (const s of samples) {
      console.log({ value_name: s.value_name, normalized_value: s.normalized_value, category: s.meta?.category, reference: s.meta?.reference, unit: s.meta?.unit, status: s.status });
    }
  }

  await mongoose.connection.close();
})();
