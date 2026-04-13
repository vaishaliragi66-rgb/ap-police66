/* import_parsed_medicines.js
Reads server/imports/parsed_medicines_*.json (latest) and imports to MasterValue.
Usage: node server/scripts/import_parsed_medicines.js
*/
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');
const Institute = (() => { try { return require('../models/master_institute'); } catch (e) { return null; }})();

const MONGO_DEFAULT = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';

const normalize = (v) => String(v || '').trim().toLowerCase();

async function main() {
  await mongoose.connect(MONGO_DEFAULT, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to mongo');

  let institute = Institute ? await Institute.findOne() : null;
  if (!institute) {
    institute = await Institute.create({ Institute_Name: 'Imported Institute', Address: {}, Email_ID: 'import@example.local', password: 'imported' });
  }
  const instituteId = institute._id;

  // find latest parsed JSON
  const importsDir = path.join(__dirname, '..', 'imports');
  const files = fs.readdirSync(importsDir).filter(f => f.startsWith('parsed_medicines_') && f.endsWith('.json'));
  if (!files.length) { console.error('No parsed_medicines_*.json found in server/imports'); process.exit(1); }
  files.sort();
  const latest = files[files.length-1];
  let raw = fs.readFileSync(path.join(importsDir, latest), 'utf8');
  // strip BOM and trim
  raw = raw.replace(/^\uFEFF/, '').trim();
  // find first JSON char
  const first = raw.search(/[\[{]/);
  if (first > 0) raw = raw.slice(first);
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) { console.error('Parsed file does not contain an array'); process.exit(1); }

  // ensure categories
  const ensureCategory = async (name) => {
    const normalized = normalize(name);
    let cat = await MasterCategory.findOne({ Institute_ID: instituteId, normalized_name: normalized });
    if (!cat) {
      cat = await MasterCategory.create({ Institute_ID: instituteId, category_name: name, normalized_name: normalized, status: 'Active' });
      console.log('Created category', name);
    }
    return cat;
  };

  const medicinesCat = await ensureCategory('Medicines');
  const typesCat = await ensureCategory('Medicine Types');
  const formsCat = await ensureCategory('Dosage Forms');

  let created = 0;
  for (const entry of data) {
    const name = String(entry.name || '').trim();
    const type = String(entry.medicineType || '').trim();
    const form = String(entry.dosageForm || '').trim();
    const strength = String(entry.strength || '').trim();
    if (!name) continue;

    // create type and form entries if missing (in their categories)
    if (type) {
      const existingType = await MasterValue.findOne({ Institute_ID: instituteId, category_id: typesCat._id, normalized_value: normalize(type) });
      if (!existingType) {
        await MasterValue.create({ Institute_ID: instituteId, category_id: typesCat._id, value_name: type, normalized_value: normalize(type), status: 'Active' });
      }
    }
    if (form) {
      const existingForm = await MasterValue.findOne({ Institute_ID: instituteId, category_id: formsCat._id, normalized_value: normalize(form) });
      if (!existingForm) {
        await MasterValue.create({ Institute_ID: instituteId, category_id: formsCat._id, value_name: form, normalized_value: normalize(form), status: 'Active' });
      }
    }

    // check duplicate medicine
    const existing = await MasterValue.findOne({ Institute_ID: instituteId, category_id: medicinesCat._id, normalized_value: normalize(name + ' ' + strength) });
    if (existing) continue;

    const meta = { kind: 'medicine', medicineType: type, dosageForm: form, strength: strength, typeNormalized: normalize(type) };
    try {
      await MasterValue.create({ Institute_ID: instituteId, category_id: medicinesCat._id, value_name: name, normalized_value: normalize(name), status: 'Active', meta });
      created++;
    } catch (err) {
      if (err.code === 11000) continue;
      console.error('Failed to create', name, err.message);
    }
  }

  console.log('Import finished. Created:', created);
  mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
