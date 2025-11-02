const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// import your router here (adjust the path as needed)
const manufacturerApp = require('./apis/manufacture_api'); 
const instituteApp = require('./apis/institute_api');
const employeeApp = require('./apis/employee_api');
const familyMemberApp = require('./apis/family_member_api');


// Example route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Connect to MongoDB
mongoose.connect(process.env.DB_URL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Use manufacturer routes
app.use('/manufacturer-api', manufacturerApp);
app.use('/institute-api',instituteApp)
app.use('/employee-api', employeeApp);
app.use('/family-member-api', familyMemberApp);

// Start server
const PORT = process.env.PORT || 5200;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));