const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const MasterValue = require('../models/master_value');
const MasterCategory = require('../models/master_category');
(async()=>{
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66');
  const inst='69d670d3abdf152c06d887fc';
  const cat = await MasterCategory.findOne({ Institute_ID: inst, normalized_name: 'medicines' }).lean();
  console.log('Medicines category:', cat?._id);
  const meds = await MasterValue.find({ Institute_ID: inst, category_id: cat?._id }).lean();
  console.log('Found meds under category:', meds.length);
  console.log(meds.slice(0,10).map(m=>({name:m.value_name, strength:m.meta?.strength}))); 
  process.exit(0);
})();
