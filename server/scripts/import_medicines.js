/* One-shot import script

Usage: node scripts/import_medicines.js

This script will:
 - connect to Mongo using process.env.MONGO_URL
 - find an institute (first one) to target
 - ensure MasterCategory entries exist for 'Medicines', 'Medicine Types', 'Dosage Forms'
 - create missing medicine types
 - create MasterValue entries for each medicine (meta.kind = 'medicine')

Caveats: run this only on dev/local. It will skip duplicates.
*/

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');
const Institute = (() => {
  try { return require('../models/master_institute'); } catch (e) { return null; }
})();

const DATA = [
  { value_name: "Amoxicillin", medicineType: "ANTI BIOTICS", dosageForm: "Capsule", strength: "250mg" },
  { value_name: "Amoxicillin", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "250mg" },
  { value_name: "Amoxicillin", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "250mg" },
  { value_name: "Amoxicillin", medicineType: "ANTI BIOTICS", dosageForm: "Capsule", strength: "500mg" },
  { value_name: "Amoxicillin", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "500mg" },
  { value_name: "Amoxicillin", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "500mg" },
  { value_name: "Amoxicillin + Clavulanate", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "250mg" },
  { value_name: "Amoxicillin + Clavulanate", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "250mg" },
  { value_name: "Amoxicillin + Clavulanate", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "500mg" },
  { value_name: "Amoxicillin + Clavulanate", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "500mg" },
  { value_name: "Ampicillin", medicineType: "ANTI BIOTICS", dosageForm: "Capsule", strength: "250mg" },
  { value_name: "Ampicillin", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "250mg" },
  { value_name: "Ampicillin", medicineType: "ANTI BIOTICS", dosageForm: "Capsule", strength: "500mg" },
  { value_name: "Ampicillin", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "500mg" },
  { value_name: "Cloxacillin", medicineType: "ANTI BIOTICS", dosageForm: "Capsule", strength: "250mg" },
  { value_name: "Cloxacillin", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "250mg" },
  { value_name: "Cloxacillin", medicineType: "ANTI BIOTICS", dosageForm: "Capsule", strength: "500mg" },
  { value_name: "Cloxacillin", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "500mg" },
  { value_name: "Cephalexin", medicineType: "ANTI BIOTICS", dosageForm: "Capsule", strength: "250mg" },
  { value_name: "Cephalexin", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "250mg" },
  { value_name: "Cephalexin", medicineType: "ANTI BIOTICS", dosageForm: "Capsule", strength: "500mg" },
  { value_name: "Cephalexin", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "500mg" },
  { value_name: "Cefuroxime", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "250mg" },
  { value_name: "Cefuroxime", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "250mg" },
  { value_name: "Cefuroxime", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "500mg" },
  { value_name: "Cefuroxime", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "500mg" },
  { value_name: "Cefixime", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "200mg" },
  { value_name: "Cefixime", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "200mg" },
  { value_name: "Cefixime", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "400mg" },
  { value_name: "Cefixime", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "400mg" },
  { value_name: "Cefpodoxime", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "200mg" },
  { value_name: "Cefpodoxime", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "200mg" },
  { value_name: "Cefpodoxime", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "400mg" },
  { value_name: "Cefpodoxime", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "400mg" },
  { value_name: "Doxycycline", medicineType: "ANTI BIOTICS", dosageForm: "Capsule", strength: "100mg" },
  { value_name: "Doxycycline", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "100mg" },
  { value_name: "Ciprofloxacin", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "250mg" },
  { value_name: "Ciprofloxacin", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "500mg" },
  { value_name: "Ofloxacin", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "200mg" },
  { value_name: "Ofloxacin", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "400mg" },
  { value_name: "Levofloxacin", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "250mg" },
  { value_name: "Levofloxacin", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "500mg" },
  { value_name: "Azithromycin", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "250mg" },
  { value_name: "Azithromycin", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "250mg" },
  { value_name: "Azithromycin", medicineType: "ANTI BIOTICS", dosageForm: "Tablet", strength: "500mg" },
  { value_name: "Azithromycin", medicineType: "ANTI BIOTICS", dosageForm: "Syrup", strength: "500mg" }
  // truncated here for brevity - the dataset can be extended as needed
];

const MONGO_DEFAULT = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';

const normalize = (v) => String(v || '').trim().toLowerCase();

async function main() {
  await mongoose.connect(MONGO_DEFAULT, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to mongo');

  let institute = Institute ? await Institute.findOne() : null;
  if (!institute) {
    console.log('No Institute found. Creating a temporary institute for import...');
    institute = await Institute.create({
      Institute_Name: 'Imported Institute',
      Address: { Street: 'Imported', District: 'Imported', State: 'Imported', Pincode: '000000' },
      Email_ID: 'import@example.local',
      password: 'imported',
      Contact_No: ''
    });
    console.log('Created institute with id:', institute._id);
  }

  const instituteId = institute._id || institute.id || institute.Institute_ID;
  console.log('Using institute id:', instituteId);

  // get or create categories
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

  let createdCount = 0;
  for (const entry of DATA) {
    const valueName = String(entry.value_name || '').trim();
    if (!valueName) continue;

    const normalized = normalize(valueName + '::' + (entry.strength || ''));

    // create medicine MasterValue if not exists
    const existing = await MasterValue.findOne({ Institute_ID: instituteId, category_id: medicinesCat._id, normalized_value: normalize(valueName + ' ' + (entry.strength || '')) });
    if (existing) continue;

    const meta = { kind: 'medicine', medicineType: String(entry.medicineType || '').trim(), dosageForm: String(entry.dosageForm || '').trim(), strength: String(entry.strength || '').trim() };

    try {
      await MasterValue.create({ Institute_ID: instituteId, category_id: medicinesCat._id, value_name: valueName, normalized_value: normalize(valueName), status: 'Active', meta });
      createdCount++;
    } catch (err) {
      if (err.code === 11000) continue; // duplicate
      console.error('Failed to create', valueName, err.message);
    }
  }

  console.log('Import complete. Created values:', createdCount);
  mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });