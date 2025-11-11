const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: './.env' });


const app = express();
app.use(cors());
app.use(express.json());

// import your router here (adjust the path as needed)
const manufacturerApp = require('./apis/manufacture_api'); 
const instituteApp = require('./apis/institute_api');
const medicineApp = require("./apis/medicines_api");
const employeeApp=require('./apis/employee_api')
const familyApp=require('./apis/family_member_api')
app.use("/medicine-api", medicineApp);
app.use("/institute-api", instituteApp);
app.use("/manufacturer-api", manufacturerApp);
app.use("/employee-api",employeeApp);
app.use("/family-api",familyApp);
// Base route
app.get("/", (req, res) => res.send("Manufacturer Server Running!"));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Mongo connection failed:", err));

// Start server
const PORT = process.env.PORT || 5200;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));