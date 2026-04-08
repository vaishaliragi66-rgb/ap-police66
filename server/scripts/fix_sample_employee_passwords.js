const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('../models/employee');
const MONGO = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';

async function run(){
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to mongo');

  const candidates = await Employee.find({ Password: { $exists: true } });
  let fixed = 0;
  for (const emp of candidates) {
    const pw = emp.Password || '';
    if (!pw.startsWith('$2')) {
      // treat as plaintext, hash it
      const newHash = await bcrypt.hash(pw, 10);
      emp.Password = newHash;
      await emp.save();
      fixed++;
      console.log('Hashed password for', emp._id.toString(), 'ABS_NO', emp.ABS_NO);
    }
  }

  console.log('Done. Hashed count:', fixed);
  await mongoose.disconnect();
}

run().catch(e=>{ console.error(e); process.exit(1); });
