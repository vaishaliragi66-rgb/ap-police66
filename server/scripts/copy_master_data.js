const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');

const SOURCE_ID = process.argv[2] || '69ddce87f953d4306791196f';
const DEST_ID = process.argv[3] || '69982a0c26d4c4f00d2240f3';

const connect = async () => {
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL not set in .env');
  await mongoose.connect(uri, { autoIndex: false });
};

const copy = async (src, dst) => {
  console.log('Copying master data from', src, 'to', dst);

  const srcCats = await MasterCategory.find({ Institute_ID: src }).lean();
  const mapping = new Map();

  for (const cat of srcCats) {
    const existing = await MasterCategory.findOne({ Institute_ID: dst, normalized_name: cat.normalized_name });
    if (existing) {
      mapping.set(String(cat._id), existing._id);
      continue;
    }

    const created = await MasterCategory.create({
      Institute_ID: dst,
      category_name: cat.category_name,
      normalized_name: cat.normalized_name,
      status: cat.status || 'Active',
      seed_version: cat.seed_version || 0
    });
    mapping.set(String(cat._id), created._id);
  }

  const srcValues = await MasterValue.find({ Institute_ID: src }).lean();
  let createdCount = 0;

  for (const val of srcValues) {
    const mappedCatId = mapping.get(String(val.category_id));
    if (!mappedCatId) continue;

    const exists = await MasterValue.findOne({ Institute_ID: dst, category_id: mappedCatId, normalized_value: val.normalized_value });
    if (exists) continue;

    await MasterValue.create({
      Institute_ID: dst,
      category_id: mappedCatId,
      value_name: val.value_name,
      normalized_value: val.normalized_value,
      status: val.status || 'Active',
      meta: val.meta || {}
    });
    createdCount++;
  }

  console.log('Done. Categories processed:', srcCats.length, 'Values created:', createdCount);
};

connect()
  .then(() => copy(SOURCE_ID, DEST_ID))
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error('Error copying master data:', err);
    process.exit(1);
  });
