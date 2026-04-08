const mongoose = require('mongoose');
const MasterValue = require('../models/master_value');

const MONGO = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';

async function run(){
  await mongoose.connect(MONGO);
  const vals = await MasterValue.find().lean();
  console.log('count', vals.length);
  console.log(vals.slice(0,10).map(v=>({value_name:v.value_name, meta:v.meta})));
  await mongoose.disconnect();
}

run().catch(e=>{console.error(e); process.exit(1)})
