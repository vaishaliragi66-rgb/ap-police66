const mongoose = require('mongoose');
const Employee = require('../models/employee');

const MONGO = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';

async function run(){
  await mongoose.connect(MONGO);
  const employees = await Employee.find({}).select('ABS_NO Name Email _id').limit(200);
  console.log('employee_count', employees.length);
  employees.forEach(e => console.log({ _id: e._id.toString(), ABS_NO: e.ABS_NO, Name: e.Name, Email: e.Email }));
  await mongoose.disconnect();
}

run().catch(e=>{ console.error(e); process.exit(1); });
