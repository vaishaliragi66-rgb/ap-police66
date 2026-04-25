const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const Institute = require('../models/master_institute');

(async () => {
  try {
    const mongoUri = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    const docs = await Institute.find({}).limit(20).lean();
    console.log('Found', docs.length, 'institutes. Sample emails:');
    docs.forEach((d, i) => {
      console.log(i+1, '-', d.Email_ID, ' | Institute_Name:', d.Institute_Name, ' | _id:', d._id);
    });
    process.exit(0);
  } catch (e) {
    console.error('Error:', e && e.message);
    process.exit(1);
  }
})();