const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');

const MONGO = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';

async function run(){
  await mongoose.connect(MONGO);
  const docs = await Prescription.find().limit(20).populate('FamilyMember').populate('Employee').lean();
  console.log('count', await Prescription.countDocuments());
  console.log(docs.map(d => ({_id:d._id, Employee: d.Employee?.Name, IsFamilyMember:d.IsFamilyMember, FamilyMember: d.FamilyMember?.Name, Medicines: d.Medicines.length})));
  await mongoose.disconnect();
}

run().catch(e=>{console.error(e); process.exit(1)})
