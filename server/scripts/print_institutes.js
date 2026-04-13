const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Institute = require('../models/master_institute');
const MONGO_DEFAULT = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';
(async function(){
  await mongoose.connect(MONGO_DEFAULT, { useNewUrlParser: true, useUnifiedTopology: true });
  const inst = await Institute.find().limit(5).lean();
  console.log('Found institutes:', inst.map(i=>i._id));
  mongoose.disconnect();
})();
