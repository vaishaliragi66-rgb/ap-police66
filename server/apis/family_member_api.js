const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const FamilyMember = require("../models/family_member");
const Employee = require("../models/employee");
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const FamilyApp = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "family-pics");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `family_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, or WebP images are allowed"));
    }
  },
});

// Register Family Member
FamilyApp.post(
  "/register",
  upload.single("Photo"),
  expressAsyncHandler(async (req, res) => {
    let savedMember = null;
    try {
      const {
        Name,
        Gender,
        Relationship,
        DOB,
        Blood_Group,
        Height,
        Weight,
        Phone_No,
        Address,
        Medical_History,
        EmployeeId
      } = req.body;

      if (!Name || !Gender || !Relationship || !EmployeeId) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: "Name, Gender, Relationship, and EmployeeId are required",
        });
      }

      // Check Employee Exists
      const employee = await Employee.findById(EmployeeId);
      if (!employee) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "Employee not found" });
      }

      // Parse Address if sent as JSON string (FormData)
      let parsedAddress = Address;
      if (typeof Address === "string") {
        try { parsedAddress = JSON.parse(Address); } catch { parsedAddress = {}; }
      }

      const memberData = {
        Employee: EmployeeId,
        Name,
        Gender,
        Relationship,
        DOB,
        Blood_Group,
        Height,
        Weight,
        Phone_No,
        Address: parsedAddress,
        Medical_History,
      };

      if (req.file) {
        memberData.Photo = `/uploads/family-pics/${req.file.filename}`;
      }

      const member = new FamilyMember(memberData);
      savedMember = await member.save();

      // Link the family member without re-validating the whole employee record.
      await Employee.findByIdAndUpdate(
        EmployeeId,
        { $push: { FamilyMembers: savedMember._id } },
        { new: true }
      );

      res.status(201).json({ message: "Family member registered", payload: savedMember });
    } catch (err) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (savedMember?._id) {
        await FamilyMember.findByIdAndDelete(savedMember._id).catch(() => null);
      }

      if (err.name === "ValidationError") {
        const errors = Object.values(err.errors || {}).map((error) => error.message);
        return res.status(400).json({
          message: errors[0] || "Family member validation failed",
          errors,
        });
      }

      return res.status(500).json({
        message: "Failed to register family member",
        error: err.message,
      });
    }
  })
);

// Fetch Family Members by Employee
// GET FAMILY MEMBERS FOR AN EMPLOYEE
FamilyApp.get("/family/:employeeId", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId)
      .populate("FamilyMembers");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee.FamilyMembers); // ✅ matched by _id
  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

FamilyApp.get(
  "/family-report/:id",
  expressAsyncHandler(async (req, res) => {
    const fam = await FamilyMember.findById(req.params.id).populate({
      path: "Medical_History.Disease",
      select: "Disease_Name Category Severity_Level",
    });

    if (!fam)
      return res.status(404).json({ message: "Family member not found" });

    res.json(fam);
  })
);

FamilyApp.put("/update/:id", expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedMember = await FamilyMember.findByIdAndUpdate(
      id,
      {
        Name: updateData.Name,
        Gender: updateData.Gender,
        Relationship: updateData.Relationship,
        DOB: updateData.DOB,
        Blood_Group: updateData.Blood_Group,
        Height: updateData.Height,
        Weight: updateData.Weight,
        Phone_No: updateData.Phone_No,
        Address: updateData.Address,
        Medical_History: updateData.Medical_History
      },
      { new: true }
    );

    if (!updatedMember) {
      return res.status(404).json({ message: "Family member not found" });
    }

    res.status(200).json({
      message: "Family member updated successfully",
      member: updatedMember
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update family member",
      error: err.message
    });
  }
}));

module.exports = FamilyApp;
