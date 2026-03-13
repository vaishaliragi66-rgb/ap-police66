const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ap-police')
.then(async () => {
  const Institute = require('./models/master_institute');
  const Employee = require('./models/employee');
  const Prescription = require('./models/Prescription');
  const DiagnosticsRecord = require('./models/diagnostics_record');
  const Medicine = require('./models/master_medicine');
  const DiagnosisTest = require('./models/diagnostics_test');

  // Get the institute
  const institute = await Institute.findOne({}).lean();
  console.log('Institute details:', institute);

  // Assign John Doe to this institute
  await Employee.updateOne(
    { Name: { $regex: /john/i } },
    { $set: { institute_id: institute._id } }
  );
  console.log('Assigned John Doe to institute');

  // Get John
  const john = await Employee.findOne({ Name: { $regex: /john/i } }).lean();
  console.log('John found:', !!john);

  // Get some medicines
  const medicines = await Medicine.find({}).limit(2).lean();
  console.log('Available medicines:', medicines.length);

  if (medicines.length > 0) {
    // Create a prescription
    const prescription = new Prescription({
      Institute: institute._id,
      Employee: john._id,
      Medicines: medicines.slice(0, 2).map(med => ({
        Medicine_ID: med._id,
        Medicine_Name: med.Medicine_Name,
        Quantity: 10
      })),
      Notes: 'Fever and infection treatment'
    });
    await prescription.save();
    console.log('Created prescription for John');
  }

  // Get some diagnosis tests
  const tests = await DiagnosisTest.find({}).limit(2).lean();
  console.log('Available tests:', tests.length);

  if (tests.length > 0) {
    // Create a diagnostic record
    const diagnostic = new DiagnosticsRecord({
      Institute: institute._id,
      Employee: john._id,
      Tests: tests.map(test => ({
        Test_ID: test._id,
        Test_Name: test.Test_Name,
        Result_Value: 'Normal',
        Reference_Range: 'Normal range',
        Remarks: 'Within normal limits'
      })),
      Diagnosis_Notes: 'Routine checkup - all normal'
    });
    await diagnostic.save();
    console.log('Created diagnostic record for John');
  } else {
    // Create a simple diagnostic record without test references
    const diagnostic = new DiagnosticsRecord({
      Institute: institute._id,
      Employee: john._id,
      Tests: [
        {
          Test_Name: 'Blood Pressure',
          Result_Value: '120/80',
          Reference_Range: 'Normal: <120/80',
          Remarks: 'Normal blood pressure'
        },
        {
          Test_Name: 'Temperature',
          Result_Value: '98.6°F',
          Reference_Range: 'Normal: 97-99°F',
          Remarks: 'Normal temperature'
        }
      ],
      Diagnosis_Notes: 'Routine checkup - all normal'
    });
    await diagnostic.save();
    console.log('Created diagnostic record for John (without test references)');
  }

  console.log('Medical data creation complete');

  mongoose.disconnect();
})
.catch(err => console.error('Error:', err));