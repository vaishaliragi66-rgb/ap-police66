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
const MONGO = process.env.MONGO_URL || 'mongodb://localhost:27017/ap-police';
const connect = async () => { try{ await mongoose.connect(MONGO); } catch(err){ if(MONGO.startsWith('mongodb+srv://')){ const fb = await buildFallbackMongoUri(MONGO); await mongoose.connect(fb); } else throw err; } };

(async ()=>{
  await connect();
  const col = mongoose.connection.db.collection('diagnosistests');
  const groupsToSearch = ['Hemoglobin','HbA1c','TSH','Troponin I','Urine pH','Total Cholesterol','ALT (SGPT)','Serum Creatinine','Fasting Blood Sugar','Platelet Count'];
  for(const g of groupsToSearch){
    const doc = await col.findOne({ Group: { $regex: `^${g}$`, $options: 'i' } });
    if(doc) console.log(`Found group match for "${g}":`, { Test_Name: doc.Test_Name, Group: doc.Group, Reference_Range: doc.Reference_Range, Units: doc.Units });
    else console.log(`No exact group match for "${g}"`);
  }
  await mongoose.connection.close();
})();
