const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const XLSX = require("xlsx");
const axios = require("axios");
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const Admin = require("../models/admin");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");
const Institute = require("../models/master_institute");
const adminApp = express.Router();

const uploadTempDir = path.join(__dirname, '..', 'uploads', 'temp');
const profilePicDir = path.join(__dirname, '..', 'uploads', 'profile-pics');
if (!fs.existsSync(uploadTempDir)) fs.mkdirSync(uploadTempDir, { recursive: true });
if (!fs.existsSync(profilePicDir)) fs.mkdirSync(profilePicDir, { recursive: true });

const bulkUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadTempDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`)
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "csvFile") {
      return cb(null, /\.csv$/i.test(file.originalname));
    }
    if (file.fieldname === "photoZip") {
      return cb(null, /\.zip$/i.test(file.originalname));
    }
    cb(null, false);
  }
}).fields([
  { name: "csvFile", maxCount: 1 },
  { name: "photoZip", maxCount: 1 }
]);

const getExtensionFromMime = (mimeType) => {
  const map = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif"
  };
  return map[mimeType] || "";
};

const normalizeRow = (row) => {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    const cleanedKey = key.trim().toLowerCase().replace(/[_\s]+/g, "");
    normalized[cleanedKey] = typeof value === "string" ? value.trim() : value;
  });
  return {
    abs_no: normalized.absno || normalized.absnumber || normalized.abs || "",
    name: normalized.name || "",
    email: normalized.email || "",
    password: normalized.password || "",
    designation: normalized.designation || "",
    dob: normalized.dob || normalized.dateofbirth || normalized.dateofbirth || "",
    blood_group: normalized.bloodgroup || normalized.blood_group || "",
    height: normalized.height || "",
    weight: normalized.weight || "",
    phone_no: normalized.phoneno || normalized.phonenumber || normalized.phone || "",
    gender: normalized.gender || "",
    street: normalized.street || "",
    district: normalized.district || "",
    state: normalized.state || "",
    pincode: normalized.pincode || normalized.pin || "",
    photofilename: normalized.photofilename || normalized.photofile || normalized.photofilepath || "",
    photourl: normalized.photourl || normalized.photourl || normalized.photo_url || ""
  };
};

const writePhoto = async (data, filename) => {
  const target = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(filename) || ".jpg"}`;
  const destPath = path.join(profilePicDir, target);
  await fs.promises.writeFile(destPath, data);
  return `/uploads/profile-pics/${target}`;
};

const downloadPhotoFromUrl = async (url) => {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000
  });
  const contentType = response.headers["content-type"] || "";
  if (!contentType.startsWith("image/")) {
    throw new Error("Photo URL must point to an image");
  }
  const ext = path.extname(new URL(url).pathname) || getExtensionFromMime(contentType) || ".jpg";
  return await writePhoto(response.data, `downloaded${ext}`);
};

/* ================= ADMIN REGISTRATION ================= */

adminApp.post(
  "/register",
  expressAsyncHandler(async (req, res) => {
    try {
      console.log("Admin registration request received");
      
      // Parse the request body
      const data = req.body;
      console.log("Admin form data received:", data);

      // Validate required fields
      const requiredFields = ["name", "email", "password", "confirmPassword"];
      const missingFields = requiredFields.filter(field => !data[field] || data[field].trim() === "");
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}` 
        });
      }

      // Validate email format
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(data.email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address"
        });
      }

      // Check if passwords match
      if (data.password !== data.confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Passwords do not match"
        });
      }

      // Check password length
      if (data.password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long"
        });
      }

      // Check for duplicate email
      const existingAdmin = await Admin.findOne({ email: data.email.toLowerCase().trim() });
      if (existingAdmin) {
        return res.status(409).json({ 
          success: false,
          message: "Admin already registered with this email" 
        });
      }

      // Prepare admin data
      const adminData = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password, // Will be hashed by pre-save middleware
        dob: data.dob || null,
        address: data.address ? data.address.trim() : "",
        role: data.role || "admin",
        isActive: true,
        permissions: {
          canManageAdmins: data.canManageAdmins || false,
          canManageEmployees: data.canManageEmployees !== undefined ? data.canManageEmployees : true,
          canManageSettings: data.canManageSettings || false,
          canViewReports: data.canViewReports !== undefined ? data.canViewReports : true
        }
      };

      // Save to database (password will be hashed by pre-save middleware)
      const newAdmin = new Admin(adminData);
      const savedAdmin = await newAdmin.save();
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: savedAdmin._id,
          email: savedAdmin.email,
          role: savedAdmin.role 
        }, 
        "adminsecret123", // Use environment variable in production
        { expiresIn: "24h" }
      );

      // Remove password from response
      const responseData = savedAdmin.toObject();
      delete responseData.password;

      res.status(201).json({ 
        success: true,
        message: "Admin registered successfully", 
        admin: responseData,
        token: token
      });

    } catch (err) {
      console.error("Admin registration error:", err);
      
      // Handle duplicate key errors
      if (err.code === 11000) {
        return res.status(409).json({ 
          success: false,
          message: "Email already exists" 
        });
      }

      // Handle validation errors
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ 
          success: false,
          message: "Validation failed", 
          errors: errors 
        });
      }

      res.status(500).json({ 
        success: false,
        message: "Admin registration failed", 
        error: err.message 
      });
    }
  })
);

adminApp.post(
  "/employee-bulk-upload",
  bulkUpload,
  expressAsyncHandler(async (req, res) => {
    const csvFile = req.files?.csvFile?.[0];
    const zipFile = req.files?.photoZip?.[0];

    if (!csvFile) {
      if (zipFile) fs.unlinkSync(zipFile.path);
      return res.status(400).json({ success: false, message: "CSV file is required." });
    }

    let photoMap = {};
    try {
      const workbook = XLSX.readFile(csvFile.path, { type: "file" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      fs.unlinkSync(csvFile.path);

      if (zipFile) {
        const zip = new AdmZip(zipFile.path);
        zip.getEntries().forEach((entry) => {
          if (!entry.isDirectory()) {
            photoMap[path.basename(entry.entryName).toLowerCase()] = entry.getData();
          }
        });
        fs.unlinkSync(zipFile.path);
      }

      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        return res.status(400).json({ success: false, message: "CSV file is empty or invalid." });
      }

      const csvEmailSet = new Set();
      const csvAbsSet = new Set();
      const emails = [];
      const absNumbers = [];
      const normalizedRows = rawRows.map((row, index) => {
        const record = normalizeRow(row);
        record._rowNumber = index + 2;
        if (record.email) emails.push(record.email.toLowerCase());
        if (record.abs_no) absNumbers.push(record.abs_no);
        return record;
      });

      const existingEmployees = await Employee.find({
        $or: [
          { Email: { $in: emails.filter(Boolean).map((email) => email.toLowerCase()) } },
          { ABS_NO: { $in: absNumbers.filter(Boolean) } }
        ]
      }).lean();

      const existingByEmail = new Map();
      const existingByAbs = new Map();
      existingEmployees.forEach((employee) => {
        if (employee.Email) existingByEmail.set(employee.Email.toLowerCase(), true);
        if (employee.ABS_NO) existingByAbs.set(employee.ABS_NO, true);
      });

      const created = [];
      const errors = [];

      for (const row of normalizedRows) {
        const rowErrors = [];
        const rowNumber = row._rowNumber;

        if (!row.abs_no) rowErrors.push("ABS_NO is required");
        if (!row.name) rowErrors.push("Name is required");
        if (!row.email) rowErrors.push("Email is required");
        if (!row.password) rowErrors.push("Password is required");
        if (!row.gender) rowErrors.push("Gender is required");

        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          rowErrors.push("Invalid email format");
        }

        if (row.password && row.password.length < 6) {
          rowErrors.push("Password must be at least 6 characters long");
        }

        if (row.phone_no && !/^[6-9]\d{9}$/.test(row.phone_no)) {
          rowErrors.push("Phone number must be a valid 10-digit Indian number");
        }

        if (row.pincode && !/^\d{6}$/.test(row.pincode)) {
          rowErrors.push("Pincode must be 6 digits");
        }

        if (row.abs_no && csvAbsSet.has(row.abs_no)) {
          rowErrors.push("Duplicate ABS_NO in CSV upload");
        }

        if (row.email && csvEmailSet.has(row.email.toLowerCase())) {
          rowErrors.push("Duplicate Email in CSV upload");
        }

        if (row.email && existingByEmail.has(row.email.toLowerCase())) {
          rowErrors.push("Employee already exists with this email");
        }

        if (row.abs_no && existingByAbs.has(row.abs_no)) {
          rowErrors.push("Employee already exists with this ABS_NO");
        }

        if (row.abs_no) csvAbsSet.add(row.abs_no);
        if (row.email) csvEmailSet.add(row.email.toLowerCase());

        let photoPath = "";
        if (row.photofilename) {
          const filename = path.basename(row.photofilename.toString()).toLowerCase();
          const fileData = photoMap[filename];
          if (fileData) {
            try {
              photoPath = await writePhoto(fileData, filename);
            } catch (err) {
              rowErrors.push(`Failed to save photo ${filename}: ${err.message}`);
            }
          } else {
            rowErrors.push(`Photo file not found in ZIP: ${row.photofilename}`);
          }
        } else if (row.photourl) {
          try {
            photoPath = await downloadPhotoFromUrl(row.photourl);
          } catch (err) {
            rowErrors.push(`Failed to download photo URL: ${err.message}`);
          }
        }

        if (rowErrors.length > 0) {
          errors.push({ row: rowNumber, errors: rowErrors });
          continue;
        }

        const employeeData = {
          ABS_NO: row.abs_no,
          Name: row.name,
          Email: row.email.toLowerCase(),
          Password: await bcrypt.hash(row.password, 10),
          Designation: row.designation || "",
          DOB: row.dob || null,
          Blood_Group: row.blood_group || "",
          Height: row.height || "",
          Weight: row.weight || "",
          Phone_No: row.phone_no || "",
          Gender: row.gender || "",
          Address: {
            Street: row.street || "",
            District: row.district || "",
            State: row.state || "",
            Pincode: row.pincode || ""
          }
        };

        if (photoPath) {
          employeeData.Photo = photoPath;
        }

        try {
          const saved = await new Employee(employeeData).save();
          const employeeResponse = saved.toObject();
          delete employeeResponse.Password;
          created.push(employeeResponse);
        } catch (err) {
          const errorMessage = err.code === 11000 ? "Duplicate record prevented by database" : err.message;
          errors.push({ row: rowNumber, errors: [errorMessage] });
        }
      }

      if (created.length === 0) {
        return res.status(400).json({ success: false, message: "No employees were created.", errors });
      }

      res.status(200).json({
        success: true,
        message: "Bulk employee upload completed.",
        totalRows: normalizedRows.length,
        createdCount: created.length,
        errors
      });
    } catch (err) {
      console.error("Bulk upload error:", err);
      return res.status(500).json({ success: false, message: "Bulk upload failed.", error: err.message });
    }
  })
);

/* ================= ADMIN LOGIN ================= */

adminApp.post(
  "/login",
  expressAsyncHandler(async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ 
          success: false,
          message: "Email and Password are required" 
        });
      }

      // Find admin by email
      const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
      
      if (!admin) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid credentials" 
        });
      }

      // Check if admin is active
      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated. Please contact super admin."
        });
      }

      // Verify password using the model method
      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid credentials" 
        });
      }

      // Update last login
      admin.lastLogin = new Date();
      await admin.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: admin._id,
          email: admin.email,
          role: admin.role,
          name: admin.name
        }, 
        "adminsecret123", // Use environment variable in production
        { expiresIn: "24h" }
      );

      // Remove password from response
      const adminResponse = admin.toObject();
      delete adminResponse.password;

      res.status(200).json({
        success: true,
        message: "Login successful",
        admin: adminResponse,
        token: token
      });

    } catch (err) {
      console.error("Admin login error:", err);
      res.status(500).json({ 
        success: false,
        message: "Login failed", 
        error: err.message 
      });
    }
  })
);

/* ================= GET ADMIN PROFILE ================= */

adminApp.get(
  "/profile/:id",
  expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      
      const admin = await Admin.findById(id).select('-password');
      if (!admin) {
        return res.status(404).json({ 
          success: false,
          message: "Admin not found" 
        });
      }

      res.status(200).json({
        success: true,
        admin: admin
      });
    } catch (err) {
      console.error("Get admin profile error:", err);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch profile", 
        error: err.message 
      });
    }
  })
);



/* ================= UPDATE ADMIN PROFILE ================= */

adminApp.put(
  "/profile/:id",
  expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove password from update data if present
      delete updateData.password;

      // Find and update admin
      const updatedAdmin = await Admin.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedAdmin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        admin: updatedAdmin
      });

    } catch (err) {
      console.error("Update admin profile error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to update profile",
        error: err.message
      });
    }
  })
);

/* ================= CHANGE PASSWORD ================= */

adminApp.put(
  "/change-password/:id",
  expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword, confirmNewPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({
          success: false,
          message: "All password fields are required"
        });
      }

      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({
          success: false,
          message: "New passwords do not match"
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters long"
        });
      }

      // Find admin
      const admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found"
        });
      }

      // Verify current password
      const isMatch = await admin.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect"
        });
      }

      // Update password (will be hashed by pre-save middleware)
      admin.password = newPassword;
      await admin.save();

      res.status(200).json({
        success: true,
        message: "Password changed successfully"
      });

    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to change password",
        error: err.message
      });
    }
  })
);

adminApp.get("/analytics/all", async (req, res) => {
  try {
    /* ================================
       EMPLOYEE PIPELINE (ALL INSTITUTES)
    =================================*/
    const employeePipeline = [
      {
        $lookup: {
          from: "prescriptions",
          localField: "_id",
          foreignField: "Employee",
          as: "prescriptions"
        }
      },
      {
        $lookup: {
          from: "diagnosisrecords",
          localField: "_id",
          foreignField: "Employee",
          as: "diagnosis"
        }
      },
      {
        $lookup: {
          from: "diseases",
          localField: "_id",
          foreignField: "Employee_ID",
          as: "diseases"
        }
      },

      {
        $addFields: {
          Age: {
            $cond: [
              { $ifNull: ["$DOB", false] },
              { $dateDiff: { startDate: "$DOB", endDate: "$$NOW", unit: "year" } },
              null
            ]
          }
        }
      },

      {
        $project: {
          Role: { $literal: "Employee" },
          Name: "$Name",
          ABS_NO: { $ifNull: ["$ABS_NO", "N/A"] },
          Gender: "$Gender",
          District: { $ifNull: ["$Address.District", "N/A"] },
          State: { $ifNull: ["$Address.State", "N/A"] },
          Age: 1,
          Blood_Group: "$Blood_Group",
          Phone_No: { $ifNull: ["$Phone_No", "N/A"] },
          Height: { $ifNull: ["$Height", "N/A"] },
          Weight: { $ifNull: ["$Weight", "N/A"] },

          Communicable_Diseases: {
            $map: {
              input: {
                $filter: {
                  input: "$diseases",
                  as: "d",
                  cond: { $eq: ["$$d.Category", "Communicable"] }
                }
              },
              as: "d",
              in: { $concat: ["$$d.Disease_Name", " (", "$$d.Severity_Level", ")"] }
            }
          },

          NonCommunicable_Diseases: {
            $map: {
              input: {
                $filter: {
                  input: "$diseases",
                  as: "d",
                  cond: { $eq: ["$$d.Category", "Non-Communicable"] }
                }
              },
              as: "d",
              in: { $concat: ["$$d.Disease_Name", " (", "$$d.Severity_Level", ")"] }
            }
          },

          Tests: {
            $reduce: {
              input: "$diagnosis",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this.Tests"] }
            }
          },

          Medicines: {
            $reduce: {
              input: "$prescriptions",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this.Medicines"] }
            }
          },

          First_Visit_Date: { $min: "$diagnosis.createdAt" },
          Last_Visit_Date: { $max: "$diagnosis.createdAt" }
        }
      }
    ];

    /* ================================
       FAMILY PIPELINE (ALL INSTITUTES)
    =================================*/
    const familyPipeline = [
      {
        $lookup: {
          from: "prescriptions",
          localField: "_id",
          foreignField: "FamilyMember",
          as: "prescriptions"
        }
      },
      {
        $lookup: {
          from: "diagnosisrecords",
          localField: "_id",
          foreignField: "FamilyMember",
          as: "diagnosis"
        }
      },
      {
        $lookup: {
          from: "diseases",
          localField: "_id",
          foreignField: "FamilyMember_ID",
          as: "diseases"
        }
      },
      {
        $lookup: {
          from: "employees",
          localField: "Employee",
          foreignField: "_id",
          as: "emp"
        }
      },
      {
        $addFields: {
          emp: { $ifNull: [{ $arrayElemAt: ["$emp", 0] }, {}] }
        }
      },

      {
        $addFields: {
          Age: {
            $cond: [
              { $ifNull: ["$DOB", false] },
              { $dateDiff: { startDate: "$DOB", endDate: "$$NOW", unit: "year" } },
              null
            ]
          }
        }
      },

      {
        $project: {
          Role: { $literal: "Family" },
          Name: "$Name",
          Linked_Employee_Name: { $ifNull: ["$emp.Name", "N/A"] },
          ABS_NO: { $ifNull: ["$emp.ABS_NO", "N/A"] },
          Gender: "$Gender",
          District: { $ifNull: ["$emp.Address.District", "N/A"] },
          State: { $ifNull: ["$emp.Address.State", "N/A"] },
          Age: 1,
          Blood_Group: "$Blood_Group",
          Phone_No: { $ifNull: ["$Phone_No", "N/A"] },
          Height: { $ifNull: ["$Height", "N/A"] },
          Weight: { $ifNull: ["$Weight", "N/A"] },

          Communicable_Diseases: {
            $map: {
              input: {
                $filter: {
                  input: "$diseases",
                  as: "d",
                  cond: { $eq: ["$$d.Category", "Communicable"] }
                }
              },
              as: "d",
              in: { $concat: ["$$d.Disease_Name", " (", "$$d.Severity_Level", ")"] }
            }
          },

          NonCommunicable_Diseases: {
            $map: {
              input: {
                $filter: {
                  input: "$diseases",
                  as: "d",
                  cond: { $eq: ["$$d.Category", "Non-Communicable"] }
                }
              },
              as: "d",
              in: { $concat: ["$$d.Disease_Name", " (", "$$d.Severity_Level", ")"] }
            }
          },

          Tests: [],
          Medicines: [],

          First_Visit: { $min: "$diagnosis.createdAt" },
          Last_Visit: { $max: "$diagnosis.createdAt" }
        }
      }
    ];

    const employees = await Employee.aggregate(employeePipeline);
    const family = await FamilyMember.aggregate(familyPipeline);

    res.json([...employees, ...family]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

adminApp.get("/analytics/institutes", async (req, res) => {
  try {
    const institutes = await Institute.aggregate([

      /* ================= VISITS LOOKUP ================= */
      {
        $lookup: {
          from: "dailyvisits",
          localField: "_id",
          foreignField: "Institute_ID",
          as: "visits"
        }
      },
      {
        $addFields: {
          Total_Visits: { $size: "$visits" }
        }
      },

      /* ================= MEDICINE LOOKUPS ================= */
      {
        $lookup: {
          from: "mainstoremedicines",
          localField: "_id",
          foreignField: "Institute_ID",
          as: "mainStore"
        }
      },
      {
        $lookup: {
          from: "medicines",
          localField: "_id",
          foreignField: "Institute_ID",
          as: "subStore"
        }
      },
      {
        $addFields: {
          allMedicines: {
            $concatArrays: ["$mainStore", "$subStore"]
          }
        }
      },

      /* ================= GROUP MEDICINES ================= */
      {
        $addFields: {
          medicines: {
            $map: {
              input: {
                $setUnion: [
                  {
                    $map: {
                      input: "$allMedicines",
                      as: "m",
                      in: "$$m.Medicine_Name"
                    }
                  }
                ]
              },
              as: "medName",
              in: {
                Medicine_Name: "$$medName",

                Total_Qty: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$allMedicines",
                          as: "m",
                          cond: { $eq: ["$$m.Medicine_Name", "$$medName"] }
                        }
                      },
                      as: "m",
                      in: "$$m.Quantity"
                    }
                  }
                },

                Threshold: {
                  $max: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$allMedicines",
                          as: "m",
                          cond: { $eq: ["$$m.Medicine_Name", "$$medName"] }
                        }
                      },
                      as: "m",
                      in: "$$m.Threshold_Qty"
                    }
                  }
                }
              }
            }
          }
        }
      },

      /* ================= LOW STOCK CHECK ================= */
      {
        $addFields: {
          medicines: {
            $map: {
              input: "$medicines",
              as: "m",
              in: {
                Medicine_Name: "$$m.Medicine_Name",
                Total_Qty: "$$m.Total_Qty",
                isLowStock: {
                  $lte: ["$$m.Total_Qty", "$$m.Threshold"]
                }
              }
            }
          }
        }
      },

      /* ================= TOTALS ================= */
      {
        $addFields: {
          Total_Medicine_Types: { $size: "$medicines" },

          Total_Quantity: {
            $sum: {
              $map: {
                input: "$medicines",
                as: "m",
                in: "$$m.Total_Qty"
              }
            }
          },

          LowStock_Count: {
            $size: {
              $filter: {
                input: "$medicines",
                as: "m",
                cond: { $eq: ["$$m.isLowStock", true] }
              }
            }
          }
        }
      },

      /* ================= FINAL OUTPUT ================= */
      {
        $project: {
          Institute_ID: 1,
          Institute_Name: 1,
          Email_ID: 1,
          "Address.District": 1,

          Total_Visits: 1,

          Total_Medicine_Types: 1,
          Total_Quantity: 1,
          LowStock_Count: 1,
          medicines: 1
        }
      }

    ]);

    res.json(institutes);

  } catch (err) {
    console.error("Institute analytics error:", err);
    res.status(500).json({ message: err.message });
  }
});


const nodemailer = require("nodemailer");

adminApp.post("/send-mail", async (req, res) => {
  try {
    const { from, to, subject, message } = req.body;

    if (!from || !to) {
      return res.status(400).json({ message: "Missing email fields" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ADMIN_EMAIL,       // Gmail used to SEND
        pass: process.env.ADMIN_EMAIL_PASS   // App password
      }
    });

    await transporter.sendMail({
      from: `"${from}" <${process.env.ADMIN_EMAIL}>`,
      replyTo: from,        // 👈 replies go to admin
      to,
      subject,
      text: message
    });

    res.json({ message: "Mail sent successfully" });
  } catch (err) {
    console.error("Mail error:", err);
    res.status(500).json({ message: "Mail sending failed" });
  }
});





module.exports = adminApp;