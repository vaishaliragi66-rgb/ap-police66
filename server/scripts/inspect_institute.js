const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const Institute = require('../models/master_institute');

(async () => {
  try {
    const email = process.argv[2];
    if (!email) {
      console.error('Usage: node inspect_institute.js <email>');
      process.exit(1);
    }
    const mongoUri = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    const institute = await Institute.findOne({ Email_ID: { $regex: `^${email.trim()}$`, $options: 'i' } }).lean();
    if (!institute) {
      console.error('Institute not found for', email);
      process.exit(2);
    }
    const pwd = String(institute.password || '');
    const isBcrypt = /^\$2[aby]\$\d{2}\$/.test(pwd);
    console.log('Institute found:');
    console.log('  _id:', institute._id);
    console.log('  Email_ID:', institute.Email_ID);
    console.log('  Institute_Name:', institute.Institute_Name);
    console.log('  password_preview:', (pwd.length>12 ? pwd.slice(0,12)+'...':'(len:'+pwd.length+')'));
    console.log('  password_length:', pwd.length);
    console.log('  password_is_bcrypt:', isBcrypt);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e && e.message);
    process.exit(1);
  }
})();