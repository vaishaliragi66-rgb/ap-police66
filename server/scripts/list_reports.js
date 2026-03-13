require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DiagnosisRecord = require('../models/diagnostics_record');

const mongoUri = process.env.MONGO_URL || 'mongodb://localhost:27017/test';

async function run(){
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to mongo');
  const records = await DiagnosisRecord.find({ 'Reports.0': { $exists: true } }).limit(50).lean();
  console.log('Found', records.length, 'records with reports');
  records.forEach(r => {
    console.log('--- Record', r._id);
    console.log('Employee', r.Employee, 'Institute', r.Institute, 'IsFamily', r.IsFamilyMember);
    console.log('Reports:');
    (r.Reports || []).forEach(rep => console.log(' ', rep.filename, rep.url, rep.originalname));
  });
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
