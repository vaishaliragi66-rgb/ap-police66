// Idempotent seeder for Master Data categories: Tests, Xray Types, Medicines
// Usage: node seed_master_data_full.js <instituteId>

const mongoose = require('mongoose');
const path = require('path');
const { ensureCategoryDoc, ensureValueRecord, DEFAULT_TEST_CATEGORIES } = require('../utils/instituteMasterData');

const MasterValue = require('../models/master_value');

async function main() {
  const instituteId = process.argv[2] || process.env.INSTITUTE_ID || '';
  if (!mongoose.Types.ObjectId.isValid(String(instituteId))) {
    console.error('Usage: node seed_master_data_full.js <instituteId>');
    process.exit(1);
  }

  const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/appolice';
  await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  try {
    // Ensure Tests category and default categories within Tests
    const testsCategory = await ensureCategoryDoc(instituteId, 'Tests');
    if (testsCategory) {
      const categories = Array.isArray(DEFAULT_TEST_CATEGORIES) ? DEFAULT_TEST_CATEGORIES : [];
      for (const cat of categories) {
        await ensureValueRecord({ instituteId, categoryId: testsCategory._id, valueName: cat, meta: { kind: 'category' } });
      }
      console.log('Ensured Tests categories');
    }

    // Seed a small canonical set of common tests (idempotent)
    const sampleTests = [
      { name: 'Hemoglobin', group: 'HEMATOLOGY', reference: '', unit: '' },
      { name: 'Total Cholesterol', group: 'LIPID PROFILE', reference: '', unit: '' },
      { name: 'TSH', group: 'THYROID PROFILE', reference: '', unit: '' },
      { name: 'Fasting Blood Sugar', group: 'DIABETES & GLUCOSE', reference: '', unit: '' }
    ];

    for (const t of sampleTests) {
      await ensureValueRecord({
        instituteId,
        categoryId: testsCategory._id,
        valueName: t.name,
        meta: { kind: 'test', category: t.group, categoryNormalized: String(t.group || '').trim().toLowerCase(), reference: t.reference || '', unit: t.unit || '' }
      });
    }
    console.log('Ensured sample Tests');

    // Ensure Xray Types category and a few body parts/xray types
    const xrayCategory = await ensureCategoryDoc(instituteId, 'Xray Types');
    if (xrayCategory) {
      const bodyParts = ['Chest', 'Skull', 'Abdomen', 'Cervical spine', 'Pelvis'];
      for (const bp of bodyParts) {
        await ensureValueRecord({ instituteId, categoryId: xrayCategory._id, valueName: bp, meta: { kind: 'xray_body_part', bodyPart: bp } });
      }

      const xrayTypes = [
        { name: 'Chest X-ray – PA view', bodyPart: 'Chest', side: 'NA', view: 'PA view', filmSize: '' },
        { name: 'Skull X-ray – AP view', bodyPart: 'Skull', side: 'NA', view: 'AP view', filmSize: '' },
        { name: 'Pelvis X-ray – AP view', bodyPart: 'Pelvis', side: 'NA', view: 'AP view', filmSize: '' }
      ];

      for (const x of xrayTypes) {
        await ensureValueRecord({ instituteId, categoryId: xrayCategory._id, valueName: x.name, meta: { kind: 'xray', bodyPart: x.bodyPart, side: x.side || 'NA', view: x.view || '', filmSize: x.filmSize || '' } });
      }
    }
    console.log('Ensured sample Xray Types');

    // Ensure Medicines category and a basic set of medicines, medicine types and dosage forms
    const medicinesCat = await ensureCategoryDoc(instituteId, 'Medicines');
    const medicineTypesCat = await ensureCategoryDoc(instituteId, 'Medicine Types');
    const dosageFormsCat = await ensureCategoryDoc(instituteId, 'Dosage Forms');

    if (medicineTypesCat) {
      const types = ['Antibiotics', 'Analgesics', 'Antipyretics', 'Vitamins', 'Others'];
      for (const t of types) {
        await ensureValueRecord({ instituteId, categoryId: medicineTypesCat._id, valueName: t, meta: { kind: 'medicine_type' } });
      }
    }

    if (dosageFormsCat) {
      const forms = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment'];
      for (const f of forms) {
        await ensureValueRecord({ instituteId, categoryId: dosageFormsCat._id, valueName: f, meta: { kind: 'dosage_form' } });
      }
    }

    if (medicinesCat) {
      const meds = [
        { name: 'Paracetamol', type: 'Antipyretics', form: 'Tablet', strength: '500mg' },
        { name: 'Amoxicillin', type: 'Antibiotics', form: 'Capsule', strength: '500mg' },
        { name: 'Ibuprofen', type: 'Analgesics', form: 'Tablet', strength: '400mg' },
        { name: 'Vitamin D', type: 'Vitamins', form: 'Tablet', strength: '60000 IU' }
      ];

      for (const m of meds) {
        await ensureValueRecord({
          instituteId,
          categoryId: medicinesCat._id,
          valueName: m.name,
          meta: { kind: 'medicine', medicineType: m.type, dosageForm: m.form, strength: m.strength }
        });
      }
    }
    console.log('Ensured sample Medicines');

    console.log('Seeding complete');
  } catch (err) {
    console.error('Seeding error', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
