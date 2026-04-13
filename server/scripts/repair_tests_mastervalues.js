/**
 * Repair Tests mastervalues for an institute by rebuilding from diagnosistests
 * Usage (dry-run): node server/scripts/repair_tests_mastervalues.js --instituteId <id>
 * Apply: node server/scripts/repair_tests_mastervalues.js --instituteId <id> --apply
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const argv = require('minimist')(process.argv.slice(2));

const APPLY = !!argv.apply;
const instituteIdArg = argv.instituteId || argv.i || '';

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
  const params = new URLSearchParams(uri.search||''); if (txt) { const t = new URLSearchParams(txt); for(const [k,v] of t.entries()) if(!params.has(k)) params.set(k,v); }
  if(!params.has('tls')) params.set('tls','true'); if(!params.has('retryWrites')) params.set('retryWrites','true'); if(!params.has('w')) params.set('w','majority');
  const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  return `mongodb://${auth}${hosts}/${dbName}?${params.toString()}`;
};

const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
const connect = async () => { try{ await mongoose.connect(MONGO); } catch(err){ if(MONGO.startsWith('mongodb+srv://')){ const fb = await buildFallbackMongoUri(MONGO); await mongoose.connect(fb); } else throw err; } };

const normalize = (s) => String(s||'').trim().toLowerCase();
const trim = (s) => String(s||'').trim();

(async ()=>{
  if (!instituteIdArg) {
    console.log('Please provide --instituteId <id>'); process.exit(1);
  }
  await connect();
  console.log('Connected to MongoDB');

  const MasterCategory = mongoose.connection.db.collection('mastercategories');
  const MasterValue = mongoose.connection.db.collection('mastervalues');
  const diag = mongoose.connection.db.collection('diagnosistests');

  const inst = instituteIdArg;
  const testsCategory = await MasterCategory.findOne({ Institute_ID: new mongoose.Types.ObjectId(inst), category_name: 'Tests' });
  if (!testsCategory) {
    console.log('Tests category not found for institute', inst);
    process.exit(1);
  }

  // Backup existing test mastervalues for this institute
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const exportDir = path.join(__dirname, '..', 'exports', `repair_tests_backup_${ts}`);
  fs.mkdirSync(exportDir, { recursive: true });
  const existing = await MasterValue.find({ Institute_ID: new mongoose.Types.ObjectId(inst), category_id: testsCategory._id }).toArray();
  fs.writeFileSync(path.join(exportDir, `mastervalues_tests_${inst}.json`), JSON.stringify(existing, null, 2), 'utf8');
  console.log('Backed up', existing.length, 'mastervalues to', exportDir);

  if (!APPLY) {
    console.log('DRY RUN: to apply changes re-run with --apply');
  }

  // Build mapping from diagnosistests (non-destructive in dry-run)
  const rows = await diag.find({}).sort({ Group: 1, Test_Name: 1 }).toArray();
  if (!rows.length) { console.log('No diagnosistests found'); process.exit(0); }

  // Detect categories and tests similar to migration script but prefer GROUP as category when available
  const categories = [];
  const testsByCategory = {};
  let currentCategory = null;
  const isNumeric = (s) => /^\s*\d+\s*$/.test(String(s||''));

  for (const r of rows) {
    const tn = trim(r.Test_Name);
    const gp = trim(r.Group);
    // If group is present and looks like a category, set currentCategory
    if (gp && gp === gp.toUpperCase() && !isNumeric(gp)) {
      currentCategory = gp;
      if (!categories.includes(currentCategory)) categories.push(currentCategory);
      testsByCategory[currentCategory] = testsByCategory[currentCategory] || [];
      continue;
    }
    // If group provided and test name numeric -> use group as test name
    if (gp && isNumeric(tn)) {
      const testName = gp;
      const category = currentCategory || 'Uncategorized';
      if (!testsByCategory[category]) { testsByCategory[category]=[]; categories.push(category); }
      testsByCategory[category].push({ name: testName, reference: trim(r.Reference_Range), unit: trim(r.Units) });
      continue;
    }
    // If no group but tn present and tn not numeric -> treat tn as test under currentCategory
    if (!gp && tn && !isNumeric(tn)) {
      const category = currentCategory || 'Uncategorized';
      if (!testsByCategory[category]) { testsByCategory[category]=[]; categories.push(category); }
      testsByCategory[category].push({ name: tn, reference: trim(r.Reference_Range), unit: trim(r.Units) });
      continue;
    }
    // fallback
    if (gp) {
      const testName = gp;
      const category = currentCategory || 'Uncategorized';
      if (!testsByCategory[category]) { testsByCategory[category]=[]; categories.push(category); }
      testsByCategory[category].push({ name: testName, reference: trim(r.Reference_Range), unit: trim(r.Units) });
    }
  }

  console.log('Detected categories:', categories.length);
  let totalTests = 0;
  for (const c of categories) {
    const tcount = (testsByCategory[c]||[]).length;
    console.log('-', c, tcount);
    totalTests += tcount;
  }
  console.log('Total tests detected:', totalTests);

  if (!APPLY) { await mongoose.connection.close(); process.exit(0); }

  // Delete existing tests & categories under Tests category
  const delRes = await MasterValue.deleteMany({ Institute_ID: new mongoose.Types.ObjectId(inst), category_id: testsCategory._id });
  console.log('Deleted', delRes.deletedCount, 'existing mastervalues under Tests');

  // Insert category mastervalues then test mastervalues
  for (const cat of categories) {
    await MasterValue.updateOne(
      { Institute_ID: new mongoose.Types.ObjectId(inst), category_id: testsCategory._id, normalized_value: normalize(cat) },
      { $setOnInsert: { value_name: cat, status: 'Active', meta: { kind: 'category' } } },
      { upsert: true }
    );
  }

  for (const cat of categories) {
    const tests = testsByCategory[cat] || [];
    for (const t of tests) {
      await MasterValue.updateOne(
        { Institute_ID: new mongoose.Types.ObjectId(inst), category_id: testsCategory._id, normalized_value: normalize(t.name) },
        { $setOnInsert: { value_name: t.name, status: 'Active', meta: { kind: 'test', category: cat, categoryNormalized: normalize(cat), reference: t.reference, unit: t.unit } } },
        { upsert: true }
      );
    }
  }

  console.log('Rebuilt tests mastervalues for institute', inst);
  await mongoose.connection.close();
})();
