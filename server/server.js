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
const FamilyApp=require('./apis/family_member_api')
const prescriptionApp = require("./apis/prescription-api");
const diagnosisApp=require("./apis/diagnosis_api")
const diseaseApp=require("./apis/institute_enter_disease");
const ledgerApp = require("./apis/instituteLedgerApi");
const indentApp = require("./apis/institute_indent_api");
const analyticsApi = require("./apis/analytics-api");
app.use("/analytics-api", analyticsApi);

app.use("/medicine-api", medicineApp);
app.use("/institute-api", instituteApp);
app.use("/manufacturer-api", manufacturerApp);
app.use("/employee-api",employeeApp);
app.use("/family-api",FamilyApp);
app.use("/prescription-api", prescriptionApp);
app.use("/diagnosis-api",diagnosisApp);
app.use("/disease-api",diseaseApp)
app.use("/uploads", express.static("uploads"));
app.use("/ledger-api", ledgerApp);
app.use("/indent-api", indentApp);
app.use("/disease-api", require("./apis/disease-api"));
app.use("/medicine-limit-api", require("./apis/medicine_limit_api"));

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