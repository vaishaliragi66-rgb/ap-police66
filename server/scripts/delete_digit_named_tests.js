/*
  Script: delete_digit_named_tests.js
  Usage:
    node delete_digit_named_tests.js [instituteId]

  Deletes MasterValue documents under the Tests master category whose name/value_name
  consists only of digits. If an instituteId is provided it will restrict deletions to that
  institute, otherwise it will run across all institutes.
*/
require('dotenv').config();
const mongoose = require('mongoose');
const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');

const isDigitsOnly = (s) => /^\d+$/.test(String(s || '').trim());

async function main() {
  const targetInstituteId = String(process.argv[2] || '').trim();
  if (!process.env.MONGO_URL) {
    console.error('MONGO_URL not set in environment');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    const query = targetInstituteId ? { Institute_ID: targetInstituteId } : {};
    const testsCategories = await MasterCategory.find({ normalized_name: 'tests', ...query }).lean();
    if (!testsCategories.length) {
      console.log('No Tests master category found for the given scope');
      return;
    }

    let totalDeleted = 0;
    for (const cat of testsCategories) {
      const q = {
        category_id: cat._id,
        'meta.kind': 'test',
        $or: [
          { name: { $regex: '^\\d+$' } },
          { value_name: { $regex: '^\\d+$' } }
        ]
      };
      if (targetInstituteId) q.Institute_ID = targetInstituteId;
      const del = await MasterValue.deleteMany(q);
      console.log(`Category ${cat.category_name} (${String(cat._id)}) - deleted ${del.deletedCount} rows`);
      totalDeleted += del.deletedCount || 0;
    }

    console.log(`Total deleted: ${totalDeleted}`);
  } catch (err) {
    console.error('Error while deleting digit-only tests', err);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
