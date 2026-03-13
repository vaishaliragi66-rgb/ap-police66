const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ap-police')
.then(async () => {
  const Institute = require('./models/master_institute');

  // Get all institutes
  const institutes = await Institute.find({}).lean();
  console.log('All institutes:');
  institutes.forEach(inst => console.log(inst.name, '-', inst._id));

  mongoose.disconnect();
})
.catch(err => console.error('Error:', err));