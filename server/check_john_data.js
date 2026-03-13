const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ap-police')
.then(async () => {
  const Employee = require('./models/employee');
  const Prescription = require('./models/Prescription');
  const DiagnosticsRecord = require('./models/diagnostics_record');
  const Institute = require('./models/master_institute');

  // Get John Doe employee
  const john = await Employee.findOne({ Name: { $regex: /john/i } }).lean();
  console.log('John Doe employee:', john);

  if (john) {
    // Get institute info
    const institute = await Institute.findById(john.institute_id).lean();
    console.log('John\'s institute:', institute);

    // Get prescriptions for John
    const prescriptions = await Prescription.find({ employee_id: john._id }).lean();
    console.log('John\'s prescriptions:', prescriptions.length);
    prescriptions.forEach(p => console.log('Prescription:', p._id, p.date, p.medicines));

    // Get diagnostics for John
    const diagnostics = await DiagnosticsRecord.find({ employee_id: john._id }).lean();
    console.log('John\'s diagnostics:', diagnostics.length);
    diagnostics.forEach(d => console.log('Diagnostic:', d._id, d.date, d.tests));
  }

  mongoose.disconnect();
})
.catch(err => console.error('Error:', err));