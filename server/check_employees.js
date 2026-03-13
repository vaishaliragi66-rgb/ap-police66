const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ap-police')
.then(async () => {
  const Employee = require('./models/employee');

  console.log('=== ALL EMPLOYEES (first 10) ===');
  const employees = await Employee.find({}).limit(10).select('Name ABS_NO').lean();
  employees.forEach(emp => console.log(emp.Name, '-', emp.ABS_NO));

  console.log('\n=== EMPLOYEES WITH MEDICAL RECORDS ===');
  const Prescription = require('./models/Prescription');
  const DiagnosisRecord = require('./models/diagnostics_record');

  const employeesWithRecords = await Employee.aggregate([
    {
      $lookup: {
        from: 'prescriptions',
        localField: '_id',
        foreignField: 'Employee',
        as: 'prescriptions'
      }
    },
    {
      $lookup: {
        from: 'diagnosisrecords',
        localField: '_id',
        foreignField: 'Employee',
        as: 'diagnoses'
      }
    },
    {
      $match: {
        $or: [
          { prescriptions: { $ne: [] } },
          { diagnoses: { $ne: [] } }
        ]
      }
    },
    {
      $project: {
        Name: 1,
        ABS_NO: 1,
        prescriptionCount: { $size: '$prescriptions' },
        diagnosisCount: { $size: '$diagnoses' }
      }
    }
  ]);

  employeesWithRecords.forEach(emp => {
    console.log(`${emp.Name} (${emp.ABS_NO}) - Prescriptions: ${emp.prescriptionCount}, Diagnoses: ${emp.diagnosisCount}`);
  });

  mongoose.disconnect();
})
.catch(err => console.error('Error:', err));