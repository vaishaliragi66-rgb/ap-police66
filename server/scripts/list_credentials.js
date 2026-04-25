const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const InstitutionCredential = require('../models/InstituteCredential');

(async () => {
  try {
    const mongoUri = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    const docs = await InstitutionCredential.find({}).limit(50).lean();
    console.log('Found', docs.length, 'credentials. Sample:');
    docs.forEach((d, i) => {
      console.log(i+1, '-', 'instituteId:', d.instituteId, 'role:', d.role, 'pwd_preview:', (String(d.password||'').slice(0,12)));
    });
    process.exit(0);
  } catch (e) {
    console.error('Error:', e && e.message);
    process.exit(1);
  }
})();