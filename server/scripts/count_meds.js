const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const MasterValue = require('../models/master_value');
(async()=>{
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66');
  const inst='69d670d3abdf152c06d887fc';
  const meds = await MasterValue.find({ Institute_ID: inst, 'meta.kind':'medicine' }).lean();
  console.log('Found medicine docs for institute:', meds.length);
  process.exit(0);
})();
