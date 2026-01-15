const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/admin");
const Employee = require("../models/employee");
const FamilyMember = require("../models/family_member");
const Institute = require("../models/master_institute");
const adminApp = express.Router();

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
          District: "$Address.District",
          Age: 1,

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

          First_Visit: { $min: "$diagnosis.createdAt" },
          Last_Visit: { $max: "$diagnosis.createdAt" }
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
      { $unwind: "$emp" },

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
          District: "$emp.Address.District",
          Age: 1,

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
      /* MAIN STORE MEDICINES */
      {
        $lookup: {
          from: "mainstoremedicines",
          localField: "_id",
          foreignField: "Institute_ID",
          as: "mainStore"
        }
      },

      /* SUB STORE MEDICINES */
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
          MainStore_Count: { $size: "$mainStore" },
          SubStore_Count: { $size: "$subStore" },

          MainStore_TotalQty: {
            $sum: { $ifNull: ["$mainStore.Quantity", []] }
          },
          SubStore_TotalQty: {
            $sum: { $ifNull: ["$subStore.Quantity", []] }
          },

          LowStock_Count: {
            $size: {
              $filter: {
                input: "$subStore",
                as: "m",
                cond: { $lte: ["$$m.Quantity", "$$m.Threshold_Qty"] }
              }
            }
          }
        }
      },

      {
        $project: {
          Institute_ID: 1,
          Institute_Name: 1,
          Email_ID: 1,
          Contact_No: 1,
          "Address.District": 1,
          "Address.State": 1,

          Employees_Count: { $size: "$Employees" },
          Family_Count: { $size: "$Family_member" },

          MainStore_Count: 1,
          SubStore_Count: 1,
          MainStore_TotalQty: 1,
          SubStore_TotalQty: 1,
          LowStock_Count: 1,

          mainStore: 1,
          subStore: 1
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