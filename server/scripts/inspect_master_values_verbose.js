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

    console.log('Connected to MongoDB (verbose)');

    const catId = '69ddcf67f953d43067911978';
    const cat = await MasterCategory.findById(catId).lean();
    if (!cat) {
      console.error('Category id not found:', catId);
      process.exit(1);
    }

    console.log('Inspecting category:', cat._id.toString(), 'Institute_ID:', String(cat.Institute_ID));

    const values = await MasterValue.find({ category_id: cat._id, 'meta.kind': 'test' }).sort({ value_name: 1 }).lean();
    console.log(`Found ${values.length} values for category ${cat._id}`);

    values.slice(-50).forEach((v) => {
      console.log('-', v._id.toString(), 'inst:', String(v.Institute_ID), v.value_name, JSON.stringify(v.meta || {}));
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
