const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const expressAsyncHandler = require("express-async-handler");

const Institute = require("../models/master_institute");
const InstitutionCredential = require("../models/InstituteCredential");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "institutesecret123";


/* ============================================================
   VERIFY TOKEN MIDDLEWARE
============================================================ */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Access denied. No token provided."
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};


/* ============================================================
   ROLE CHECK MIDDLEWARE (INSIDE INSTITUTE)
============================================================ */
const allowInstituteRoles = (...roles) => {
  return (req, res, next) => {

    // Main institute account has full access
    if (req.user.role === "institute") {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied for this role"
      });
    }

    next();
  };
};


/* ============================================================
   INSTITUTE MAIN LOGIN
   POST /institute-auth/login
============================================================ */
router.post(
  "/login",
  expressAsyncHandler(async (req, res) => {

    const { Email_ID, password } = req.body;

    if (!Email_ID || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const institute = await Institute.findOne({
  Email_ID: { $regex: `^${Email_ID.trim()}$`, $options: "i" }
});

if (!institute) {
  return res.status(401).json({
    message: "Invalid credentials"
  });
}

    const isMatch = await bcrypt.compare(password, institute.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      {
        instituteId: institute._id,
        role: "institute"
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
  instituteId: institute._id,
  instituteName: institute.Institute_Name
    });
  })
);


/* ============================================================
   ROLE LOGIN (Doctor / Pharmacist / Diagnosis / Xray)
   POST /institute-auth/role-login
============================================================ */
router.post(
  "/role-login",
  expressAsyncHandler(async (req, res) => {

    const { Email_ID, role, password } = req.body;

    if (!Email_ID || !role || !password) {
      return res.status(400).json({
        message: "Email, role and password are required"
      });
    }

    const institute = await Institute.findOne({
  Email_ID: { $regex: `^${Email_ID.trim()}$`, $options: "i" }
});

    if (!institute) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const credential = await InstitutionCredential.findOne({
      instituteId: institute._id,
      role
    });

    if (!credential) {
      return res.status(404).json({
        message: "Role not configured"
      });
    }

    const isMatch = await bcrypt.compare(password, credential.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      {
        instituteId: institute._id,
        role: role
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
  instituteId: institute._id,
  instituteName: institute.Institute_Name
    });
  })
);


/* ============================================================
   SETUP ROLE PASSWORDS (Only institute main login allowed)
   POST /institute-auth/setup-roles
============================================================ */
router.post(
  "/setup-roles",
  verifyToken,
  expressAsyncHandler(async (req, res) => {

    if (req.user.role !== "institute") {
      return res.status(403).json({
        message: "Only institute account can configure roles"
      });
    }

    const { doctor, pharmacist, diagnosis, xray } = req.body;

    const roles = [
      { role: "doctor", password: doctor },
      { role: "pharmacist", password: pharmacist },
      { role: "diagnosis", password: diagnosis },
      { role: "xray", password: xray }
    ];

    for (let r of roles) {

      if (!r.password) continue;

      const hashed = await bcrypt.hash(r.password, 10);

      await InstitutionCredential.findOneAndUpdate(
        {
          instituteId: req.user.instituteId,
          role: r.role
        },
        { password: hashed },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      message: "Roles configured successfully"
    });
  })
);


/* ============================================================
   EXPORTS
============================================================ */
module.exports = {
  router,
  verifyToken,
  allowInstituteRoles
};