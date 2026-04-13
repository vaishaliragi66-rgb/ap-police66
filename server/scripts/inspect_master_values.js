const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');

(async () => {
  try {
    const mongoUri = process.env.MONGO_URL;
    if (!mongoUri) {
      console.error('MONGO_URL not set in .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri, { maxPoolSize: 5 });

    console.log('Connected to MongoDB');

    const testsCategories = await MasterCategory.find({ category_name: 'Tests' }).lean();
    if (!testsCategories || testsCategories.length === 0) {
      console.log('No Tests category found');
      process.exit(0);
    }

    for (const cat of testsCategories) {
      console.log('Found Tests category:', cat._id.toString(), 'Institute:', cat.Institute_ID?.toString(), 'seed_version:', cat.seed_version);
      const values = await MasterValue.find({ category_id: cat._id, 'meta.kind': 'test' }).sort({ value_name: 1 }).lean();
      console.log(`Found ${values.length} test values for category ${cat._id}:`);
      values.slice(-50).forEach((v) => console.log('-', v._id.toString(), v.value_name, JSON.stringify(v.meta || {})));
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();