const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/../.env' });
const { listMasterTests } = require('../utils/instituteMasterData');
const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
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
const normalize = (s) => String(s||'').trim().toLowerCase();

(async () => {
  await connect();
  const instituteId = process.argv[2];
  if (!instituteId) { console.error('Usage: node compare_master_references.js <instituteId>'); process.exit(1); }

  const masterTests = await listMasterTests(instituteId, { includeInactive: true });

  // simple grouping (group value or fallback to Uncategorized)
  const grouped = {};
  masterTests.forEach(t => {
    const cat = t.Group || t.Category || 'Uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ name: t.Test_Name || t.value_name || '', reference: t.Reference_Range || t.reference || '', unit: t.Units || t.unit || '' });
  });

  // load public map file (workspace root tmp_public_map.json)
  const publicMapPath = 'tmp_public_map.json';
  if (!fs.existsSync(publicMapPath)) { console.error('tmp_public_map.json not found in workspace root'); process.exit(1); }
  const publicRaw = fs.readFileSync(publicMapPath, 'utf8');
  let publicJson = null;
  try { publicJson = JSON.parse(publicRaw); } catch (e) { console.error('Failed parse tmp_public_map.json:', e.message); process.exit(1); }

  // build map: normalized test name -> meta
  const publicTests = {};
  if (Array.isArray(publicJson.mastervalues)) {
    publicJson.mastervalues.forEach(v => {
      if (v.meta && v.meta.kind === 'test') {
        const n = normalize(v.value_name || v.meta.category || v.meta.categoryNormalized || '');
        publicTests[n] = { reference: v.meta.reference || '', unit: v.meta.unit || '' };
      }
    });
  } else {
    // fallback: attempt to extract array of values from root
    const arr = publicJson.values || publicJson.mastervalues || [];
    arr.forEach(v => {
      if (v.meta && v.meta.kind === 'test') {
        const n = normalize(v.value_name || v.meta.category || v.meta.categoryNormalized || '');
        publicTests[n] = { reference: v.meta.reference || '', unit: v.meta.unit || '' };
      }
    });
  }

  const mismatches = [];
  let total = 0;
  Object.entries(grouped).forEach(([cat, tests]) => {
    tests.forEach(t => {
      total++;
      const n = normalize(t.name);
      const pub = publicTests[n];
      if (!pub) {
        mismatches.push({ type: 'missing_in_public_map', category: cat, name: t.name, reference: t.reference, unit: t.unit });
      } else {
        const refMatch = normalize(pub.reference) === normalize(t.reference);
        const unitMatch = normalize(pub.unit) === normalize(t.unit);
        if (!refMatch || !unitMatch) {
          mismatches.push({ type: 'mismatch', category: cat, name: t.name, expected: { reference: pub.reference, unit: pub.unit }, actual: { reference: t.reference, unit: t.unit } });
        }
      }
    });
  });

  const out = { instituteId, totalTests: total, mismatchesCount: mismatches.length, mismatches };
  const outDir = 'server/exports';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = `${outDir}/compare_master_references_${instituteId}.json`;
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('Done. Total tests:', total, 'Mismatches:', mismatches.length, 'Report:', outPath);
  await mongoose.connection.close();
})();
