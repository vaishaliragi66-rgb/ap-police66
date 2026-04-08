const mongoose = require('mongoose');
const Employee = require('../models/employee');
const FamilyMember = require('../models/family_member');
const Institute = require('../models/master_institute');
const Medicine = require('../models/master_medicine');
const Prescription = require('../models/Prescription');

const MONGO = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ap-police66';

async function run(){
  await mongoose.connect(MONGO);

  let institute = await Institute.findOne({ Institute_Name: 'Imported Institute' });
  if (!institute) {
    institute = await Institute.create({
      Institute_Name: 'Imported Institute',
      Address: { Street: 'Imported', District: 'Imported', State: 'Imported', Pincode: '000000' },
      Email_ID: 'import@example.local',
      password: 'imported'
    });
  }

  const emp = await Employee.create({ ABS_NO: `IMP${Date.now() % 10000}`, Name: 'Vaishali', Email: `vaishali${Date.now()%10000}@example.local`, Password: 'pass123', Gender: 'Female' });
  const child = await FamilyMember.create({ Employee: emp._id, Name: 'Bhavs', Relationship: 'Child', Gender: 'Female' });

  emp.FamilyMembers = [child._id];
  await emp.save();

  const med = await Medicine.create({ Institute_ID: institute._id, Medicine_Code: `TST${Date.now()%10000}`, Medicine_Name: 'DemoMed', Strength: '10mg', Quantity: 100, Threshold_Qty: 0, Expiry_Date: new Date(Date.now() + 1000*60*60*24*365) });

  const pres = await Prescription.create({ Institute: institute._id, Employee: emp._id, IsFamilyMember: true, FamilyMember: child._id, Medicines: [ { Medicine_ID: med._id, Medicine_Name: med.Medicine_Name, Strength: med.Strength, Quantity: 2 } ] });

  console.log('Created sample data:');
  console.log({ institute: institute._id.toString(), employee: emp._id.toString(), familyMember: child._id.toString(), medicine: med._id.toString(), prescription: pres._id.toString() });

  await mongoose.disconnect();
}

run().catch(e=>{ console.error(e); process.exit(1); });
