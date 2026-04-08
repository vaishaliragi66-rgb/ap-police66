const mongoose = require('mongoose');
const MasterCategory = require('../models/master_category');

const MONGO = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';

async function run(){
  await mongoose.connect(MONGO);
  const cats = await MasterCategory.find().lean();
  console.log('count', cats.length);
  console.log(cats.map(c=>c.category_name));
  await mongoose.disconnect();
}

run().catch(e=>{console.error(e); process.exit(1)})
