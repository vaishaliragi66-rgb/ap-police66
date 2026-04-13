/**
 * Safe migration script: migrate diagnosistests -> mastervalues
 * - Supports --dry-run (default) and --apply
 * - Accepts --instituteId <id> or --all-institutes
 * - Creates backups of mastervalues for the target institute(s)
 * - Uses ensureCategoryDoc / ensureValueRecord from utils/instituteMasterData.js to perform upserts safely
 *
 * Usage (dry-run):
 *   node server/scripts/migrate_diagnosistests_to_mastervalues.js --instituteId <id>
 *   node server/scripts/migrate_diagnosistests_to_mastervalues.js --all-institutes
 *
 * Apply:
 *   node server/scripts/migrate_diagnosistests_to_mastervalues.js --instituteId <id> --apply
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { TEST_CATEGORY_NAME, DEFAULT_TEST_CATEGORIES, ensureCategoryDoc, ensureValueRecord } = require('../utils/instituteMasterData');

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

const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
const connect = async () => { try{ await mongoose.connect(MONGO); } catch(err){ if(MONGO.startsWith('mongodb+srv://')){ const fb = await buildFallbackMongoUri(MONGO); await mongoose.connect(fb); } else throw err; } };

const argv = require('minimist')(process.argv.slice(2));
const APPLY = !!argv.apply;
const ALL = !!argv['all-institutes'];
const instituteIdArg = argv.instituteId || argv.instituteid || argv.i;

const isNumericString = (s) => /^\s*\d+\s*$/.test(String(s||''));
const normalize = (s) => String(s||'').trim();

(async ()=>{
  await connect();
  console.log('Connected to MongoDB');

  const col = mongoose.connection.db.collection('diagnosistests');
  const rows = await col.find({}).sort({ _id: 1 }).toArray();
  if (!rows.length) { console.log('No diagnosistests rows found'); process.exit(0); }

  // Build ordered mapping: detect category rows and tests under them
  const categories = [];
  const testsByCategory = {};
  let currentCategory = null;

  const knownCategories = (DEFAULT_TEST_CATEGORIES || []).map(c => String(c).trim().toLowerCase());

  for (const r of rows) {
    const testNameField = normalize(r.Test_Name || '');
    const groupField = normalize(r.Group || '');

    // If row is a category row: Group empty and Test_Name matches known category OR Test_Name is uppercase and non-numeric
    const testNameLower = testNameField.toLowerCase();
    const groupLower = groupField.toLowerCase();

    const looksLikeCategory = (
      (!groupField && (knownCategories.includes(testNameLower) || (testNameField && !isNumericString(testNameField) && testNameField === testNameField.toUpperCase())))
    ) || (groupField && knownCategories.includes(groupLower));

    if (looksLikeCategory && (testNameField || groupField)) {
      const catName = testNameField || groupField;
      currentCategory = catName;
      if (!categories.includes(currentCategory)) categories.push(currentCategory);
      testsByCategory[currentCategory] = testsByCategory[currentCategory] || [];
      continue;
    }

    // If row looks like a test: typically Test_Name numeric and Group is readable test name
    if (groupField && isNumericString(testNameField)) {
      const testName = groupField;
      const category = currentCategory || 'Uncategorized';
      if (!testsByCategory[category]) { testsByCategory[category] = []; categories.push(category); }
      testsByCategory[category].push({ name: testName, reference: normalize(r.Reference_Range), unit: normalize(r.Units) });
      continue;
    }

    // If Group empty but Test_Name readable -> treat as test under currentCategory
    if (!groupField && testNameField && !isNumericString(testNameField)) {
      const testName = testNameField;
      const category = currentCategory || 'Uncategorized';
      if (!testsByCategory[category]) { testsByCategory[category] = []; categories.push(category); }
      testsByCategory[category].push({ name: testName, reference: normalize(r.Reference_Range), unit: normalize(r.Units) });
      continue;
    }

    // fallback: if both present but not numeric, use Group as test name
    if (groupField) {
      const testName = groupField;
      const category = currentCategory || 'Uncategorized';
      if (!testsByCategory[category]) { testsByCategory[category] = []; categories.push(category); }
      testsByCategory[category].push({ name: testName, reference: normalize(r.Reference_Range), unit: normalize(r.Units) });
      continue;
    }

    // otherwise ignore
  }

  console.log('Discovered categories:', categories.length);
  for(const c of categories) {
    console.log('- ', c, `(${(testsByCategory[c]||[]).length} tests)`);
  }

  // Determine target institutes
  let institutes = [];
  if (ALL) {
    const instRows = await mongoose.connection.db.collection('institutes').find({}).project({ _id: 1 }).toArray();
    institutes = instRows.map(i => i._id.toString());
  } else if (instituteIdArg) {
    institutes = [instituteIdArg];
  } else {
    console.log('\nNo institute specified. Provide --instituteId <id> or --all-institutes. Dry-run will show mapping only.');
  }

  // Back up plan
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const exportDir = path.join(__dirname, '..', 'exports', `migrate_tests_backup_${ts}`);
  if (APPLY && institutes.length) {
    fs.mkdirSync(exportDir, { recursive: true });
    console.log('Backing up current mastervalues for target institutes into', exportDir);
    for (const iid of institutes) {
      const docs = await mongoose.connection.db.collection('mastervalues').find({ Institute_ID: new mongoose.Types.ObjectId(iid) }).toArray();
      fs.writeFileSync(path.join(exportDir, `mastervalues_${iid}.json`), JSON.stringify(docs, null, 2), 'utf8');
    }
  }

  // Prepare to call ensureCategoryDoc and ensureValueRecord for each institute (or just show plan)
  for (const iid of institutes.length ? institutes : [null]) {
    console.log('\n--- Plan for institute:', iid || 'DRY-RUN (no institute specified)');
    if (!iid) {
      console.log('Dry-run mode: no DB writes will be performed. To apply, re-run with --instituteId <id> --apply');
    }

    if (!iid) continue;

    // ensure Tests master category
    if (APPLY) {
      const categoryDoc = await ensureCategoryDoc(iid, TEST_CATEGORY_NAME);
      console.log('Ensured MasterCategory:', categoryDoc._id.toString());
      // ensure category name entries in mastervalues (category values)
      for (const cat of categories) {
        await ensureValueRecord({ instituteId: iid, categoryId: categoryDoc._id, valueName: cat, meta: { kind: 'category' } });
      }

      // ensure test records
      let created = 0;
      for (const cat of categories) {
        const tests = testsByCategory[cat] || [];
        for (const t of tests) {
          await ensureValueRecord({ instituteId: iid, categoryId: categoryDoc._id, valueName: t.name, meta: { kind: 'test', category: cat, categoryNormalized: String(cat||'').trim().toLowerCase(), reference: t.reference, unit: t.unit } });
          created++;
        }
      }
      console.log(`Applied: upserted ${created} test records for institute ${iid}`);
    } else {
      // dry-run: show a summary
      let planned = 0;
      for (const cat of categories) {
        console.log(`Category: ${cat} -> ${ (testsByCategory[cat]||[]).length } tests`);
        planned += (testsByCategory[cat]||[]).length;
      }
      console.log('Dry-run summary: planned upserts:', planned);
    }
  }

  console.log('\nDone.');
  await mongoose.connection.close();
  process.exit(0);
})();
