/*
Seed canonical medicines from a JSON file.

Place a file at `server/scripts/canonical_medicines.json` with the format:
[
  { "value_name": "Amoxicillin", "medicineType": "ANTI BIOTICS", "dosageForm": "Capsule", "strength": "250mg" },
  ...
]

Usage (from repo root):
node server/scripts/seed_canonical_medicines.js --instituteId=69ddce87f953d4306791196f

This script will:
- connect to Mongo (MONGO_URL or default localhost)
- ensure categories 'Medicines', 'Medicine Types', 'Dosage Forms' exist
- delete existing MasterValue rows in the Medicines category for the given institute
- insert canonical Medicine Types and Dosage Forms as MasterValue rows (if missing)
- insert MasterValue rows for each medicine with meta.kind='medicine'

WARNING: This will remove existing Medicines values for the institute. Run only in controlled environments.
*/

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');

const MONGO_DEFAULT = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';

const argv = require('minimist')(process.argv.slice(2));
const instituteId = String(argv.instituteId || argv.instituteid || argv.i || '').trim();
const dataFile = path.join(__dirname, 'canonical_medicines.json');

async function main() {
  if (!instituteId) {
    console.error('Please provide --instituteId=INSTITUTE_ID');
    process.exit(1);
  }

  if (!fs.existsSync(dataFile)) {
    console.error('Missing data file:', dataFile);
    console.error('Create server/scripts/canonical_medicines.json using the canonical dataset (JSON array of objects).');
    process.exit(1);
  }

  const raw = fs.readFileSync(dataFile, 'utf8');
  let DATA = [];
  try {
    DATA = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse canonical_medicines.json:', e.message);
    process.exit(1);
  }

  await mongoose.connect(MONGO_DEFAULT, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to Mongo at', MONGO_DEFAULT);

  const normalize = (s) => String(s || '').trim().toLowerCase();

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

  // Delete existing medicines for institute
  const del = await MasterValue.deleteMany({ Institute_ID: instituteId, category_id: medicinesCat._id });
  console.log('Deleted existing medicines:', del.deletedCount);

  // Upsert medicine types and dosage forms
  const typeSet = new Map();
  const formSet = new Map();

  DATA.forEach((row) => {
    const t = String(row.medicineType || row.type || '').trim();
    const f = String(row.dosageForm || row.form || '').trim();
    if (t) typeSet.set(normalize(t), t);
    if (f) formSet.set(normalize(f), f);
  });

  // Insert types
  for (const [key, name] of typeSet.entries()) {
    const existing = await MasterValue.findOne({ Institute_ID: instituteId, category_id: typesCat._id, normalized_value: key });
    if (!existing) {
      await MasterValue.create({ Institute_ID: instituteId, category_id: typesCat._id, value_name: name, normalized_value: key, status: 'Active' });
      console.log('Inserted medicine type:', name);
    }
  }

  // Insert forms
  for (const [key, name] of formSet.entries()) {
    const existing = await MasterValue.findOne({ Institute_ID: instituteId, category_id: formsCat._id, normalized_value: key });
    if (!existing) {
      await MasterValue.create({ Institute_ID: instituteId, category_id: formsCat._id, value_name: name, normalized_value: key, status: 'Active' });
      console.log('Inserted dosage form:', name);
    }
  }

  // Insert medicines
  let created = 0;
  for (const row of DATA) {
    const valueName = String(row.value_name || row.MEDICINE || row.Medicine || '').trim();
    if (!valueName) continue;
    const medType = String(row.medicineType || row.Type || '').trim();
    const dosageForm = String(row.dosageForm || row.Dosage || row.Form || '').trim();
    const strength = String(row.strength || row.Strength || '').trim();

    const normalizedValue = normalize(valueName);
    const exists = await MasterValue.findOne({ Institute_ID: instituteId, category_id: medicinesCat._id, normalized_value: normalizedValue, 'meta.strength': strength, 'meta.medicineType': medType, 'meta.dosageForm': dosageForm });
    if (exists) continue;

    try {
      await MasterValue.create({
        Institute_ID: instituteId,
        category_id: medicinesCat._id,
        value_name: valueName,
        normalized_value: normalizedValue,
        status: 'Active',
        meta: {
          kind: 'medicine',
          medicineType: medType,
          dosageForm: dosageForm,
          strength: strength,
          typeNormalized: normalize(medType)
        }
      });
      created++;
    } catch (err) {
      // ignore duplicate key errors and continue
      if (err && err.code === 11000) continue;
      console.error('Failed to insert medicine', valueName, err && err.message);
    }
  }

  console.log('Inserted medicines:', created);
  mongoose.disconnect();
  console.log('Done');
}

main().catch((e) => { console.error(e); process.exit(1); });
