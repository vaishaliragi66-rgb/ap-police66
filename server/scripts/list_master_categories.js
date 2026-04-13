const mongoose = require('mongoose');
const MasterCategory = require('../models/master_category');
const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';

(async () => {
  await mongoose.connect(MONGO);
  const cats = await MasterCategory.find({}).limit(50).lean();
  console.log('Found', cats.length, 'MasterCategory docs');
  cats.forEach(c => console.log({ _id: c._id.toString(), category_name: c.category_name, normalized_name: c.normalized_name, Institute_ID: c.Institute_ID ? c.Institute_ID.toString() : null, seed_version: c.seed_version }));
  await mongoose.connection.close();
})();
