const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/admin");

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



module.exports = adminApp;