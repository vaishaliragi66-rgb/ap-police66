const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ap-police')
.then(async () => {
  const Prescription = require('./models/Prescription');
  const DiagnosticsRecord = require('./models/diagnostics_record');
  const Employee = require('./models/employee');

  // Get John
  const john = await Employee.findOne({ Name: { $regex: /john/i } });
  console.log('John ID:', john._id);

  // Get prescriptions for John
  const prescriptions = await Prescription.find({ Employee: john._id }).lean();
  console.log('Prescriptions for John:', prescriptions.length);
  prescriptions.forEach(p => console.log('Prescription:', JSON.stringify(p, null, 2)));

  // Get diagnostics for John
  const diagnostics = await DiagnosticsRecord.find({ Employee: john._id }).lean();
  console.log('Diagnostics for John:', diagnostics.length);
  diagnostics.forEach(d => console.log('Diagnostic:', JSON.stringify(d, null, 2)));

  mongoose.disconnect();
})
.catch(err => console.error('Error:', err));