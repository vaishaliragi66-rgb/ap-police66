const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Employee = require("../models/employee");
const Disease = require("../models/disease");
const DiagnosisRecord = require("../models/diagnostics_record");
const FamilyMember = require("../models/family_member");

const employeeApp = express.Router();

/* ================= MULTER CONFIG ================= */

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads', 'profile-pics');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created upload directory:", uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'employee-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
    }
  }
});

/* ================= REGISTER ================= */

employeeApp.post(
  "/register",
  upload.single("Photo"), // Changed from Profile_Pic to Photo
  expressAsyncHandler(async (req, res) => {
    try {
      console.log("Registration request received");
      
      // Parse the form data
      const data = req.body;
      console.log("Form data received:", data);

      // Validate required fields
      const requiredFields = ["ABS_NO", "Name", "Email", "Password"];
      const missingFields = requiredFields.filter(field => !data[field] || data[field].trim() === "");
      
      if (missingFields.length > 0) {
        // Clean up uploaded file if validation fails
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          message: `Missing required fields: ${missingFields.join(", ")}` 
        });
      }

      // Trim and prepare data
      const employeeData = {
        ABS_NO: data.ABS_NO.trim(),
        Name: data.Name.trim(),
        Email: data.Email.trim().toLowerCase(),
        Password: await bcrypt.hash(data.Password, 10),
        Designation: data.Designation ? data.Designation.trim() : "",
        DOB: data.DOB || null,
        Blood_Group: data.Blood_Group || "",
        Height: data.Height ? data.Height.trim() : "",
        Weight: data.Weight ? data.Weight.trim() : "",
        Phone_No: data.Phone_No ? data.Phone_No.trim() : "",
        Address: {
          Street: data.Street ? data.Street.trim() : "",
          District: data.District ? data.District.trim() : "",
          State: data.State ? data.State.trim() : "",
          Pincode: data.Pincode ? data.Pincode.trim() : ""
        }
      };

      // Handle profile photo
      if (req.file) {
        // Store relative path
        employeeData.Photo = `/uploads/profile-pics/${req.file.filename}`;
        console.log("Profile photo saved:", employeeData.Photo);
      }

      // Check for duplicate email
      const existingEmail = await Employee.findOne({ Email: employeeData.Email });
      if (existingEmail) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(409).json({ 
          message: "Employee already registered with this email" 
        });
      }

      // Check for duplicate ABS_NO
      const existingABS = await Employee.findOne({ ABS_NO: employeeData.ABS_NO });
      if (existingABS) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(409).json({ 
          message: "Employee already registered with this ABS Number" 
        });
      }

      // Save to database
      const newEmployee = new Employee(employeeData);
      const savedEmployee = await newEmployee.save();
      
      // Remove password from response
      const responseData = savedEmployee.toObject();
      delete responseData.Password;

      res.status(201).json({ 
        message: "Employee registered successfully", 
        employee: responseData 
      });

    } catch (err) {
      console.error("Registration error:", err);
      
      // Clean up uploaded file if error occurs
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      // Handle duplicate key errors
      if (err.code === 11000) {
        const field = err.keyPattern?.Email ? "Email" : "ABS_NO";
        return res.status(409).json({ 
          message: `${field} already exists` 
        });
      }

      // Handle validation errors
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: errors 
        });
      }

      res.status(500).json({ 
        message: "Registration failed", 
        error: err.message 
      });
    }
  })
);

/* ================= LOGIN ================= */

employeeApp.post(
  "/login",
  expressAsyncHandler(async (req, res) => {
    try {
      const { ABS_NO, Password } = req.body;

      if (!ABS_NO || !Password) {
        return res.status(400).json({ 
          message: "ABS Number and Password are required" 
        });
      }

      const employee = await Employee.findOne({ ABS_NO: ABS_NO.trim() });
      if (!employee) {
        return res.status(401).json({ 
          message: "Invalid credentials" 
        });
      }

      const isMatch = await bcrypt.compare(Password, employee.Password);
      if (!isMatch) {
        return res.status(401).json({ 
          message: "Invalid credentials" 
        });
      }

      const token = jwt.sign({ id: employee._id }, "empsecret123", {
        expiresIn: "24h",
      });

      // Remove password from response
      const empResponse = employee.toObject();
      delete empResponse.Password;

      res.status(200).json({
        message: "Login successful",
        payload: {
          token,
          id: employee._id,
          Name: employee.Name,
          ABS_NO: employee.ABS_NO,
          Photo: employee.Photo,
          ...empResponse
        },
      });

    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ 
        message: "Login failed", 
        error: err.message 
      });
    }
  })
);

/* ================= GET EMPLOYEE PROFILE ================= */

employeeApp.get(
  "/profile/:id",
  expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      
      const employee = await Employee.findById(id).select('-Password');
      if (!employee) {
        return res.status(404).json({ 
          message: "Employee not found" 
        });
      }

      res.status(200).json(employee);
    } catch (err) {
      console.error("Get profile error:", err);
      res.status(500).json({ 
        message: "Failed to fetch profile", 
        error: err.message 
      });
    }
  })
);

/* ================= GET ALL EMPLOYEES ================= */

employeeApp.get(
  "/all",
  expressAsyncHandler(async (req, res) => {
    try {
      const employees = await Employee.find({})
        .select('ABS_NO Name Email Designation Photo')
        .sort({ createdAt: -1 });
      
      res.status(200).json({
        count: employees.length,
        employees: employees
      });
    } catch (err) {
      console.error("Get all employees error:", err);
      res.status(500).json({ 
        message: "Failed to fetch employees", 
        error: err.message 
      });
    }
  })
);
/* ================= EMPLOYEE + FAMILY HEALTH REPORT ================= */

employeeApp.get(
  "/health-report/:absNo",
  expressAsyncHandler(async (req, res) => {
    try {
      const { absNo } = req.params;

      if (!absNo || absNo.trim() === "") {
        return res.status(400).json({
          message: "ABS Number is required",
        });
      }

      // 🔹 Fetch Employee
      const employee = await Employee.findOne({ ABS_NO: absNo.trim() })
        .select("ABS_NO Name Email Photo");

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      const employeeId = employee._id;

      /* =====================================================
         EMPLOYEE DISEASE RECORDS
      ===================================================== */
      const employeeDiseases = await Disease.find({
        Employee_ID: employeeId,
        IsFamilyMember: false,
      })
        .select(
          "Disease_Name Category Severity_Level Diagnosis Notes createdAt"
        )
        .sort({ createdAt: -1 });

      /* =====================================================
         EMPLOYEE DIAGNOSIS TEST RECORDS
      ===================================================== */
      const employeeDiagnosis = await DiagnosisRecord.find({
        Employee: employeeId,
        IsFamilyMember: false,
      })
        .populate("Tests.Test_ID", "Test_Name")
        .select("Tests Diagnosis_Notes Timestamp")
        .sort({ Timestamp: -1 });

      /* =====================================================
         FAMILY DISEASE RECORDS
      ===================================================== */
      const familyDiseases = await Disease.find({
        Employee_ID: employeeId,
        IsFamilyMember: true,
      })
        .populate("FamilyMember_ID", "Name Relationship")
        .select(
          "Disease_Name Category Severity_Level Diagnosis Notes FamilyMember_ID createdAt"
        )
        .sort({ createdAt: -1 });

      /* =====================================================
         FAMILY DIAGNOSIS TEST RECORDS
      ===================================================== */
      const familyDiagnosis = await DiagnosisRecord.find({
        Employee: employeeId,
        IsFamilyMember: true,
      })
        .populate("FamilyMember", "Name Relationship")
        .select("Tests FamilyMember Timestamp Diagnosis_Notes")
        .sort({ Timestamp: -1 });

      /* =====================================================
         RESPONSE OBJECT
      ===================================================== */
      return res.status(200).json({
        message: "Health report fetched successfully",
        employee,
        employeeDiseases,
        employeeDiagnosis,
        familyDiseases,
        familyDiagnosis,
      });

    } catch (err) {
      console.error("Health report fetch error:", err);

      res.status(500).json({
        message: "Failed to fetch health report",
        error: err.message,
      });
    }
  })
);

module.exports = employeeApp;