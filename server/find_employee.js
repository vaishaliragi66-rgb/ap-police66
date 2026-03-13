const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ap-police')
.then(async () => {
  const Employee = require('./models/employee');

  // Search for employees with ABS_NO containing 'ABC' or 'abc'
  const employees = await Employee.find({
    ABS_NO: { $regex: /abc/i }
  }).select('Name ABS_NO _id').lean();

  console.log('Employees with ABC in ABS_NO:');
  employees.forEach(emp => console.log(emp.Name + ' - ' + emp.ABS_NO + ' - ' + emp._id));

  // Search for employees with ABS_NO containing '123'
  const employees123 = await Employee.find({
    ABS_NO: { $regex: /123/i }
  }).select('Name ABS_NO _id').lean();

  console.log('\nEmployees with 123 in ABS_NO:');
  employees123.forEach(emp => console.log(emp.Name + ' - ' + emp.ABS_NO + ' - ' + emp._id));

  // Also check for John specifically
  const johnEmployees = await Employee.find({
    Name: { $regex: /john/i }
  }).select('Name ABS_NO _id').lean();

  console.log('\nEmployees named John:');
  johnEmployees.forEach(emp => console.log(emp.Name + ' - ' + emp.ABS_NO + ' - ' + emp._id));

  // Get all employees
  const allEmployees = await Employee.find({}).select('Name ABS_NO _id').lean();
  console.log('\nAll employees:');
  allEmployees.forEach(emp => console.log(emp.Name + ' - ' + emp.ABS_NO + ' - ' + emp._id));

  mongoose.disconnect();
})
.catch(err => console.error('Error:', err));