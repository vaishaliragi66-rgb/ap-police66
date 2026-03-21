const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const Employee = require("../models/employee");
const Disease = require("../models/disease");
const DiagnosisRecord = require("../models/diagnostics_record");
const XrayRecord = require("../models/XrayRecordSchema");
const FamilyMember = require("../models/family_member");
const MedicalAction = require("../models/medical_action");

const employeeApp = express.Router();

/* ================= MULTER CONFIG ================= */

// Create uploads directories if they don't exist
const uploadDir = path.join(__dirname, '..', 'uploads', 'profile-pics');
const absCardDir = path.join(__dirname, '..', 'uploads', 'abs-cards');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(absCardDir)) {
  fs.mkdirSync(absCardDir, { recursive: true });
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

const absCardStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, absCardDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'abs-card-' + uniqueSuffix + ext);
  }
});

const absCardUpload = multer({
  storage: absCardStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedExt = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/(jpeg|png|gif)|application\/pdf/.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image or PDF files are allowed (jpeg, jpg, png, gif, pdf)"));
  }
});

const absCardUploadSingle = (req, res, next) => {
  absCardUpload.single("ABS_Card")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

/* ================= REGISTER ================= */
employeeApp.get(
  "/health-report-detailed",
  async (req, res) => {
    try {
      const { employeeId, isFamily, familyMemberId } = req.query;

      if (!employeeId) {
        return res.status(400).json({
          message: "employeeId is required"
        });
      }

      const diseaseFilter = {
        Employee_ID: employeeId
      };

      const prescriptionFilter = {
        employee_id: employeeId
      };

      if (isFamily === "true") {
        diseaseFilter.IsFamilyMember = true;
        diseaseFilter.FamilyMember_ID = familyMemberId;

        prescriptionFilter["data.IsFamilyMember"] = true;
        prescriptionFilter["data.FamilyMember_ID"] = familyMemberId;
      } else {
        diseaseFilter.IsFamilyMember = false;
        prescriptionFilter["data.IsFamilyMember"] = false;
      }

      const diseases = await Disease.find(diseaseFilter).sort({ createdAt: -1 });

      const medicalActions = await MedicalAction.find({
        employee_id: employeeId,
        action_type: { $in: ["DOCTOR_DIAGNOSIS", "DOCTOR_XRAY"] },
        ...prescriptionFilter
      }).sort({ created_at: -1 });

      const diagnosisFilter = {
        Employee: employeeId
      };

      const xrayFilter = {
        Employee: employeeId
      };

      if (isFamily === "true") {
        diagnosisFilter.IsFamilyMember = true;
        diagnosisFilter.FamilyMember = familyMemberId;
        xrayFilter.IsFamilyMember = true;
        xrayFilter.FamilyMember = familyMemberId;
      } else {
        diagnosisFilter.IsFamilyMember = false;
        xrayFilter.IsFamilyMember = false;
      }

      const diagnosisRecords = await DiagnosisRecord.find(diagnosisFilter)
        .populate("Institute", "Institute_Name")
        .populate("Employee", "Name ABS_NO")
        .populate("FamilyMember", "Name Relationship")
        .populate("Tests.Test_ID", "Test_Name Reference_Range Units")
        .sort({ updatedAt: -1, createdAt: -1 });

      const xrayRecords = await XrayRecord.find(xrayFilter)
        .populate("Institute", "Institute_Name")
        .populate("Employee", "Name ABS_NO")
        .populate("FamilyMember", "Name Relationship")
        .sort({ updatedAt: -1, createdAt: -1 });

      res.json({
        diseases,
        medicalActions,
        diagnosisRecords,
        xrayRecords
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

employeeApp.post(
  "/register",
  upload.single("Photo"), // Changed from Profile_Pic to Photo
  expressAsyncHandler(async (req, res) => {
    try {
      
      // Parse the form data
      const data = req.body;

      // Validate required fields
      const requiredFields = ["ABS_NO", "Name", "Email", "Password","Gender"];
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
        Gender: data.Gender? data.Gender.trim() : "",
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

employeeApp.get("/all", async (req, res) => {
  try {
    const employees = await Employee.find({})
      .select(
        'ABS_NO Name Email DOB Blood_Group Height Weight Phone_No Gender Photo'
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: employees.length,
      employees
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch employees",
      error: err.message
    });
  }
});

/* ================= EMPLOYEE + FAMILY HEALTH REPORT ================= */

employeeApp.get("/health-report", expressAsyncHandler(async (req, res) => {
    try {
      const absNo = req.query.absNo;

      if (!absNo || absNo.trim() === "") {
        return res.status(400).json({
          message: "ABS Number is required",
        });
      }

      // 🔹 Fetch Employee
 const employee = await Employee.findOne({ ABS_NO: absNo.trim() })
.select("ABS_NO Name Email Photo Gender DOB Height Weight Blood_Group Medical_History");



      if (!employee) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      const employeeId = employee._id;

      let age = null;

  if (employee.DOB) {
    const today = new Date();
    const dob = new Date(employee.DOB);
    age = today.getFullYear() - dob.getFullYear();

    const monthDiff = today.getMonth() - dob.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dob.getDate())
    ) {
      age--;
    }
  }

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
        .select("Tests Diagnosis_Notes Timestamp Reports")
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
        .select("Tests FamilyMember Timestamp Diagnosis_Notes Reports")
        .sort({ Timestamp: -1 });

        console.log("Health report generated for employee:", employee.Name);
      /* =====================================================
         RESPONSE OBJECT
      ===================================================== */
      return res.status(200).json({
        message: "Health report fetched successfully",
        employee: {
          ...employee.toObject(),
          Age: age,
        },
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

employeeApp.put("/update-profile/:id", expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find and update the employee
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      {
        Name: updateData.Name,
        Email: updateData.Email,
        Designation: updateData.Designation,
        DOB: updateData.DOB,
        Blood_Group: updateData.Blood_Group,
        Height: updateData.Height,
        Weight: updateData.Weight,
        Phone_No: updateData.Phone_No,
        Gender: updateData.Gender,
        Address: updateData.Address
      },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      employee: updatedEmployee
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update profile",
      error: err.message
    });
  }
}));

employeeApp.put(
  "/upload-abs-card/:id",
  absCardUploadSingle,
  expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({ message: "ABS card file is required" });
      }

      const employee = await Employee.findById(id);
      if (!employee) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: "Employee not found" });
      }

      // Remove old ABS card file if present
      if (employee.ABS_Card) {
        const safeRelPath = employee.ABS_Card.replace(/^[\\/]/, "");
        const oldPath = path.join(__dirname, "..", safeRelPath);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      employee.ABS_Card = `/uploads/abs-cards/${req.file.filename}`;
      await employee.save();

      const responseData = employee.toObject();
      delete responseData.Password;

      res.status(200).json({
        message: "ABS card uploaded successfully",
        employee: responseData
      });
    } catch (err) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        message: err.message || "Failed to upload ABS card",
        error: err.message
      });
    }
  })
);

employeeApp.delete(
  "/delete-abs-card/:id",
  expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      const employee = await Employee.findById(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.ABS_Card) {
        const safeRelPath = employee.ABS_Card.replace(/^[\\/]/, "");
        const absPath = path.join(__dirname, "..", safeRelPath);
        if (fs.existsSync(absPath)) {
          fs.unlinkSync(absPath);
        }
      }

      employee.ABS_Card = "";
      await employee.save();

      const responseData = employee.toObject();
      delete responseData.Password;

      res.status(200).json({
        message: "ABS card deleted successfully",
        employee: responseData
      });
    } catch (err) {
      res.status(500).json({
        message: err.message || "Failed to delete ABS card",
        error: err.message
      });
    }
  })
);

module.exports = employeeApp;
