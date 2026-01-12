const express = require('express');
const expressAsyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const instituteApp = express.Router();
const Institute = require('../models/master_institute');
const Medicine = require("../models/master_medicine");  
const Employee = require("../models/employee"); 
const InstituteLedger = require("../models/InstituteLedger");
const MainStoreMedicine = require("../models/main_store");
const DiagnosisRecord = require("../models/diagnostics_record"); 
const FamilyMember = require("../models/family_member");
const Disease = require("../models/disease");
// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "institutesecret123");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// GET all institutes
instituteApp.get("/institutions", async (req, res) => {
  try {
    const institutions = await Institute.find();
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all institutes except one
instituteApp.get("/except/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id)
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid institute ID" });
    }

    const institutes = await Institute.find({
      _id: { $ne: id }
    })
    .select("Institute_Name Address District Institute_ID")
    .sort({ Institute_Name: 1 });

    res.json(institutes);

  } catch (err) {
    console.error("Get institutes except one error:", err);
    res.status(500).json({
      message: "Failed to fetch institutes",
      error: err.message
    });
  }
});

// POST - Register new institute (with password hashing)
instituteApp.post(
  "/register/institute",
  expressAsyncHandler(async (req, res) => {
    try {
      const instituteData = req.body;

      const {
        Institute_Name,
        Email_ID,
        password,
        confirm_password,
        Address,
        Contact_No
      } = instituteData;

      // 🔒 Required field check
      if (
        !Institute_Name ||
        !Email_ID ||
        !password ||
        !Address ||
        !Address.Street ||
        !Address.District ||
        !Address.State ||
        !Address.Pincode
      ) {
        return res.status(400).send({ message: "All required fields must be provided" });
      }

      // Check if passwords match
      if (confirm_password && password !== confirm_password) {
        return res.status(400).send({ message: "Passwords do not match" });
      }

      // Check if institute already exists
      const existingInstitute = await Institute.findOne({ 
        $or: [
          { Institute_Name },
          { Email_ID }
        ]
      });
      
      if (existingInstitute) {
        return res.status(409).send({ 
          message: existingInstitute.Institute_Name === Institute_Name 
            ? "Institute name already exists" 
            : "Email already registered"
        });
      }

      // Hash password before saving
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newInstitute = new Institute({
        Institute_Name,
        Email_ID,
        password: hashedPassword, // Store hashed password
        Contact_No,
        Address,
        Medicine_Inventory: []
      });

      const savedInstitute = await newInstitute.save();

      // Remove password from response
      const instituteResponse = savedInstitute.toObject();
      delete instituteResponse.password;

      res.status(201).send({
        message: "Institute registered successfully",
        payload: instituteResponse
      });
    } catch (err) {
      console.error("Institute registration error:", err);
      
      if (err.code === 11000) {
        return res.status(409).json({ 
          message: "Duplicate entry. Institute name or email already exists." 
        });
      }
      
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ 
          message: "Validation failed", 
          errors 
        });
      }
      
      res.status(500).json({ 
        message: "Registration failed", 
        error: err.message 
      });
    }
  })
);

// POST - Login Institute (with JWT token)
instituteApp.post(
  '/institute/login',
  expressAsyncHandler(async (req, res) => {
    try {
      const { Email_ID, password } = req.body;

      // Validate fields
      if (!Email_ID || !password) {
        return res.status(400).json({ 
          message: "Email and Password are required" 
        });
      }

      // Find institute by email
      const institute = await Institute.findOne({ 
        Email_ID: Email_ID.trim().toLowerCase() 
      });

      if (!institute) {
        return res.status(401).json({ 
          message: "Invalid email or password" 
        });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, institute.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          message: "Invalid email or password" 
        });
      }

      // Create JWT token
      const token = jwt.sign(
        { 
          id: institute._id,
          instituteId: institute._id,
          email: institute.Email_ID,
          name: institute.Institute_Name,
          role: "institute"
        },
        process.env.JWT_SECRET || "institutesecret123",
        { expiresIn: "24h" }
      );

      // Remove password from response
      const instituteResponse = institute.toObject();
      delete instituteResponse.password;

      res.status(200).json({
        message: "Login successful",
        token: token,
        payload: {
          ...instituteResponse,
          token // Include token in payload for convenience
        }
      });
    } catch (err) {
      console.error("Institute login error:", err);
      res.status(500).json({ 
        message: "Login failed", 
        error: err.message 
      });
    }
  })
);

// GET institute profile (protected route)
instituteApp.get('/profile/:id', verifyToken, async (req, res) => {
  try {
    // Check if user is authorized to access this profile
    if (req.user.id !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({ 
        message: "Access denied. Not authorized to view this profile." 
      });
    }

    const institute = await Institute.findById(req.params.id)
      .populate('Medicine_Inventory.Medicine_ID', 'Medicine_Name Threshold_Qty')
      .select('-password'); // Exclude password from response

    if (!institute) {
      return res.status(404).json({ 
        message: 'Institute not found' 
      });
    }

    // Compute inventory summary
    const totalDistinct = institute.Medicine_Inventory.length;
    const totalQuantity = institute.Medicine_Inventory.reduce((sum, item) => sum + (item.Quantity || 0), 0);

    const lowStock = institute.Medicine_Inventory
      .filter(item => item.Medicine_ID && typeof item.Medicine_ID.Threshold_Qty === 'number')
      .filter(item => item.Quantity < item.Medicine_ID.Threshold_Qty)
      .map(item => ({
        medicineId: item.Medicine_ID._id,
        medicineName: item.Medicine_ID.Medicine_Name,
        quantity: item.Quantity,
        threshold: item.Medicine_ID.Threshold_Qty
      }));

    // Recent orders
    const recentOrders = (institute.Orders || [])
      .slice()
      .sort((a, b) => new Date(b.Order_Date) - new Date(a.Order_Date))
      .slice(0, 10);

    return res.json({
      profile: institute,
      inventorySummary: {
        totalDistinct,
        totalQuantity,
        lowStockCount: lowStock.length,
        lowStock
      },
      recentOrders
    });
  } catch (err) {
    console.error('Error in GET /profile/:id', err);
    return res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// PUT /institute-api/profile/:id (protected route)
instituteApp.put('/profile/:id', verifyToken, async (req, res) => {
  try {
    // Authorization check
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ 
        message: "Access denied. Can only update own profile." 
      });
    }

    const allowed = ['Institute_Name', 'Address', 'Email_ID', 'Contact_No'];
    const update = {};
    
    allowed.forEach(field => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });

    // Handle password update separately
    if (req.body.password && req.body.confirm_password) {
      if (req.body.password !== req.body.confirm_password) {
        return res.status(400).json({ 
          message: 'Passwords do not match' 
        });
      }
      
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(req.body.password, salt);
    } else if (req.body.password && !req.body.confirm_password) {
      return res.status(400).json({ 
        message: 'Confirm password is required when changing password' 
      });
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ 
        message: 'No valid fields to update' 
      });
    }

    const institute = await Institute.findByIdAndUpdate(
      req.params.id, 
      update, 
      { new: true, runValidators: true }
    )
    .populate('Medicine_Inventory.Medicine_ID', 'Medicine_Name Threshold_Qty')
    .select('-password');

    if (!institute) {
      return res.status(404).json({ 
        message: 'Institute not found' 
      });
    }

    return res.json({ 
      message: 'Profile updated successfully', 
      profile: institute 
    });
  } catch (err) {
    console.error('Error in PUT /profile/:id', err);
    
    if (err.code === 11000) {
      return res.status(409).json({ 
        message: 'Email or Institute Name already exists' 
      });
    }
    
    return res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// GET inventory for ONE institute only
instituteApp.get("/inventory/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: "Invalid institute ID" });
    }

    const instituteObjectId = new mongoose.Types.ObjectId(instituteId);

    // ✅ MAIN STORE (ONLY this institute)
    const mainStoreMeds = await MainStoreMedicine.find({
      Institute_ID: instituteObjectId
    }).lean();

    // ✅ SUB STORE (ONLY this institute)
    const subStoreMeds = await Medicine.find({
      Institute_ID: instituteObjectId
    }).lean();

    // ✅ DO NOT MERGE — SHOW BOTH
    const inventory = [
      ...mainStoreMeds.map(m => ({
        _id: m._id,
        Medicine_Code: m.Medicine_Code,
        Medicine_Name: m.Medicine_Name,
        Quantity: m.Quantity,
        Threshold_Qty: m.Threshold_Qty,
        Expiry_Date: m.Expiry_Date,
        Store_Type: "MAIN_STORE"
      })),
      ...subStoreMeds.map(m => ({
        _id: m._id,
        Medicine_Code: m.Medicine_Code,
        Medicine_Name: m.Medicine_Name,
        Quantity: m.Quantity,
        Threshold_Qty: m.Threshold_Qty,
        Expiry_Date: m.Expiry_Date,
        Store_Type: "SUB_STORE"
      }))
    ];

    res.json(inventory);

  } catch (err) {
    console.error("Institute inventory error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET single institute by ID
instituteApp.get("/institution/:id", verifyToken, async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id).select('-password');
    if (!institute) {
      return res.status(404).json({ 
        message: "Institute not found" 
      });
    }
    res.json(institute);
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

// GET dashboard stats (protected route)
instituteApp.get("/dashboard-stats/:instituteId", verifyToken, async (req, res) => {
  try {
    const { instituteId } = req.params;

    // Authorization check
    if (req.user.id !== instituteId && req.user.role !== "admin") {
      return res.status(403).json({ 
        message: "Access denied. Not authorized to view dashboard." 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ 
        message: "Invalid institute ID" 
      });
    }

    // 1️⃣ Total Employees
    const totalEmployees = await Employee.countDocuments();

    // 2️⃣ Registered Employees (same as total employees for now)
    const registeredEmployees = totalEmployees;

    // 3️⃣ Fetch institute
    const institute = await Institute.findById(instituteId).lean();
    if (!institute) {
      return res.status(404).json({ 
        message: "Institute not found" 
      });
    }

    // 4️⃣ Total medicines in inventory
    const totalMedicinesInInventory = institute.Medicine_Inventory?.reduce((sum, item) => 
      sum + (item.Quantity || 0), 0) || 0;

    // 5️⃣ Low stock medicines
    const lowStockMedicines = institute.Medicine_Inventory?.filter(item => {
      const threshold = item.Medicine_ID?.Threshold_Qty || 0;
      return (item.Quantity || 0) < threshold;
    }).length || 0;

    return res.json({
      totalEmployees,
      registeredEmployees,
      totalMedicinesInInventory,
      lowStockMedicines,
      inventoryItemCount: institute.Medicine_Inventory?.length || 0
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ 
      message: "Server error", 
      error: err.message 
    });
  }
});

// GET detailed employees (protected route)
instituteApp.get("/employees-detailed", verifyToken, async (req, res) => {
  try {
    const employees = await Employee.find({})
      .select('ABS_NO Name Email Designation DOB Phone_No Height Weight Address Blood_Group Photo Medical_History')
      .select('-password') // Ensure password is not included
      .sort({ Name: 1 })
      .lean();

    // Format the response
    const formattedEmployees = employees.map(emp => ({
      _id: emp._id,
      ABS_NO: emp.ABS_NO || "-",
      Name: emp.Name || "-",
      Email: emp.Email || "-",
      Designation: emp.Designation || "-",
      DOB: emp.DOB ? new Date(emp.DOB).toISOString().split('T')[0] : "-",
      Phone_No: emp.Phone_No || "-",
      Height: emp.Height || "-",
      Weight: emp.Weight || "-",
      Address: emp.Address ? 
        `${emp.Address.Street || ""}, ${emp.Address.District || ""}, ${emp.Address.State || ""} - ${emp.Address.Pincode || ""}`.trim() 
        : "-",
      Blood_Group: emp.Blood_Group || "-",
      Photo: emp.Photo || null,
      Medical_History_Count: emp.Medical_History?.length || 0,
      Medical_History: emp.Medical_History || []
    }));

    res.status(200).json({
      count: formattedEmployees.length,
      employees: formattedEmployees
    });
  } catch (err) {
    console.error("Error fetching detailed employees:", err);
    res.status(500).json({ 
      message: "Failed to fetch employees", 
      error: err.message 
    });
  }
});

// GET single employee details (protected route)
instituteApp.get("/employee/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: "Invalid employee ID" 
      });
    }

    const employee = await Employee.findById(id)
      .select('-Password')
      .lean();

    if (!employee) {
      return res.status(404).json({ 
        message: "Employee not found" 
      });
    }

    // Format the response
    const formattedEmployee = {
      ...employee,
      DOB: employee.DOB ? new Date(employee.DOB).toISOString().split('T')[0] : null,
      Address: employee.Address ? 
        `${employee.Address.Street || ""}, ${employee.Address.District || ""}, ${employee.Address.State || ""} - ${employee.Address.Pincode || ""}`.trim() 
        : null,
      Medical_History_Count: employee.Medical_History?.length || 0
    };

    res.status(200).json(formattedEmployee);
  } catch (err) {
    console.error("Error fetching employee details:", err);
    res.status(500).json({ 
      message: "Failed to fetch employee details", 
      error: err.message 
    });
  }
});

instituteApp.get("/analytics/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: "Invalid institute ID" });
    }

    const instituteObjectId = new mongoose.Types.ObjectId(instituteId);

    /* =====================================================
       EMPLOYEE PIPELINE
    ======================================================*/
    const employeePipeline = [
      /* 🔹 Prescriptions */
      {
        $lookup: {
          from: "prescriptions",
          let: { empId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$Employee", "$$empId"] },
                    { $eq: ["$Institute", instituteObjectId] },
                    { $eq: ["$IsFamilyMember", false] }
                  ]
                }
              }
            }
          ],
          as: "prescriptions"
        }
      },

      /* 🔹 Diagnosis Records */
      {
        $lookup: {
          from: "diagnosisrecords",
          let: { empId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$Employee", "$$empId"] },
                    { $eq: ["$Institute", instituteObjectId] },
                    { $eq: ["$IsFamilyMember", false] }
                  ]
                }
              }
            }
          ],
          as: "diagnosis"
        }
      },

      /* 🔹 Diseases */
      {
        $lookup: {
          from: "diseases",
          let: { empId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$Employee_ID", "$$empId"] },
                    { $eq: ["$Institute_ID", instituteObjectId] },
                    { $eq: ["$IsFamilyMember", false] }
                  ]
                }
              }
            }
          ],
          as: "diseases"
        }
      },

      /* 🔹 Include ONLY if any record exists */
      {
        $match: {
          $expr: {
            $or: [
              { $gt: [{ $size: "$prescriptions" }, 0] },
              { $gt: [{ $size: "$diagnosis" }, 0] },
              { $gt: [{ $size: "$diseases" }, 0] }
            ]
          }
        }
      },

      /* 🔹 Derived Fields */
      {
        $addFields: {
          Age: {
            $cond: [
              { $ifNull: ["$DOB", false] },
              {
                $dateDiff: {
                  startDate: "$DOB",
                  endDate: "$$NOW",
                  unit: "year"
                }
              },
              null
            ]
          }
        }
      },

      /* 🔹 Final Shape */
      {
        $project: {
          Role: { $literal: "Employee" },
          Name: "$Name",
          Linked_Employee_Name: null,

          District: "$Address.District",

          Age: 1,
          Gender: { $literal: "—" },
          Blood_Group: "$Blood_Group",
          Height: "$Height",
          Weight: "$Weight",

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
              in: {
                $concat: [
                  "$$d.Disease_Name",
                  " (",
                  "$$d.Severity_Level",
                  ")"
                ]
              }
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
              in: {
                $concat: [
                  "$$d.Disease_Name",
                  " (",
                  "$$d.Severity_Level",
                  ")"
                ]
              }
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
          First_Visit_Date: {
            $min: {
              $concatArrays: [
                {
                  $map: {
                    input: "$diagnosis",
                    as: "d",
                    in: "$$d.createdAt"
                  }
                },
                {
                  $map: {
                    input: "$prescriptions",
                    as: "p",
                    in: "$$p.Timestamp"
                  }
                }
              ]
            }
          },

          Last_Visit_Date: {
            $max: {
              $concatArrays: [
                {
                  $map: {
                    input: "$diagnosis",
                    as: "d",
                    in: "$$d.createdAt"
                  }
                },
                {
                  $map: {
                    input: "$prescriptions",
                    as: "p",
                    in: "$$p.Timestamp"
                  }
                }
              ]
            }
          }

        }
      }
    ];

    /* =====================================================
       FAMILY MEMBER PIPELINE
    ======================================================*/
    const familyPipeline = [
      /* 🔹 Prescriptions */
      {
        $lookup: {
          from: "prescriptions",
          let: { famId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$FamilyMember", "$$famId"] },
                    { $eq: ["$Institute", instituteObjectId] },
                    { $eq: ["$IsFamilyMember", true] }
                  ]
                }
              }
            }
          ],
          as: "prescriptions"
        }
      },

      /* 🔹 Diagnosis Records */
      {
        $lookup: {
          from: "diagnosisrecords",
          let: { famId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$FamilyMember", "$$famId"] },
                    { $eq: ["$Institute", instituteObjectId] },
                    { $eq: ["$IsFamilyMember", true] }
                  ]
                }
              }
            }
          ],
          as: "diagnosis"
        }
      },

      /* 🔹 Diseases */
      {
        $lookup: {
          from: "diseases",
          let: { famId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$FamilyMember_ID", "$$famId"] },
                    { $eq: ["$Institute_ID", instituteObjectId] },
                    { $eq: ["$IsFamilyMember", true] }
                  ]
                }
              }
            }
          ],
          as: "diseases"
        }
      },

      /* 🔹 Include ONLY if any record exists */
      {
        $match: {
          $expr: {
            $or: [
              { $gt: [{ $size: "$prescriptions" }, 0] },
              { $gt: [{ $size: "$diagnosis" }, 0] },
              { $gt: [{ $size: "$diseases" }, 0] }
            ]
          }
        }
      },

      /* 🔹 Join Employee (for name & district) */
      {
        $lookup: {
          from: "employees",
          localField: "Employee",
          foreignField: "_id",
          as: "emp"
        }
      },
      { $unwind: "$emp" },

      /* 🔹 Derived Fields */
      {
        $addFields: {
          Age: {
            $cond: [
              { $ifNull: ["$DOB", false] },
              {
                $dateDiff: {
                  startDate: "$DOB",
                  endDate: "$$NOW",
                  unit: "year"
                }
              },
              null
            ]
          }
        }
      },

      /* 🔹 Final Shape */
      {
        $project: {
          Role: { $literal: "Family" },
          Name: "$Name",
          Linked_Employee_Name: "$emp.Name",

          District: "$emp.Address.District",

          Age: 1,
          Gender: "$Gender",
          Blood_Group: "$Blood_Group",
          Height: "$Height",
          Weight: "$Weight",

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
              in: {
                $concat: [
                  "$$d.Disease_Name",
                  " (",
                  "$$d.Severity_Level",
                  ")"
                ]
              }
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
              in: {
                $concat: [
                  "$$d.Disease_Name",
                  " (",
                  "$$d.Severity_Level",
                  ")"
                ]
              }
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

          First_Visit_Date: {
            $min: {
              $concatArrays: [
                {
                  $map: {
                    input: "$diagnosis",
                    as: "d",
                    in: "$$d.createdAt"
                  }
                },
                {
                  $map: {
                    input: "$prescriptions",
                    as: "p",
                    in: "$$p.Timestamp"
                  }
                }
              ]
            }
          },

          Last_Visit_Date: {
            $max: {
              $concatArrays: [
                {
                  $map: {
                    input: "$diagnosis",
                    as: "d",
                    in: "$$d.createdAt"
                  }
                },
                {
                  $map: {
                    input: "$prescriptions",
                    as: "p",
                    in: "$$p.Timestamp"
                  }
                }
              ]
            }
          }

        }
      }
    ];

    /* =====================================================
       EXECUTE & RETURN
    ======================================================*/
    const employees = await Employee.aggregate(employeePipeline);
    const family = await FamilyMember.aggregate(familyPipeline);

    res.json([...employees, ...family]);
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: err.message });
  }
});


// Optional: Token verification endpoint
instituteApp.get("/verify-token", verifyToken, (req, res) => {
  res.status(200).json({
    message: "Token is valid",
    user: req.user
  });
});

module.exports = instituteApp;