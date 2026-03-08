const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const expressAsyncHandler = require("express-async-handler");

const Institute = require("../models/master_institute");
const InstitutionCredential = require("../models/InstituteCredential");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "institutesecret123";

const BCRYPT_HASH_PREFIX_REGEX = /^\$2[aby]\$\d{2}\$/;

const verifyPasswordWithLegacySupport = async (plainPassword, storedPassword) => {
  if (!storedPassword) {
    return { isMatch: false, shouldUpgradeHash: false };
  }

  if (BCRYPT_HASH_PREFIX_REGEX.test(storedPassword)) {
    const isMatch = await bcrypt.compare(plainPassword, storedPassword);
    return { isMatch, shouldUpgradeHash: false };
  }

  const isMatch = plainPassword === storedPassword;
  return { isMatch, shouldUpgradeHash: isMatch };
};


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

    const { isMatch, shouldUpgradeHash } = await verifyPasswordWithLegacySupport(
      password,
      institute.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    if (shouldUpgradeHash) {
      institute.password = await bcrypt.hash(password, 10);
      await institute.save();
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

    console.log("Found credential:", credential); // Debug log

    if (!credential) {
      return res.status(404).json({
        message: "Role not configured"
      });
    }

    const { isMatch, shouldUpgradeHash } = await verifyPasswordWithLegacySupport(
      password,
      credential.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    if (shouldUpgradeHash) {
      credential.password = await bcrypt.hash(password, 10);
      await credential.save();
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
  "/setup-role",
  verifyToken,
  expressAsyncHandler(async (req, res) => {
console.log("User making request:", req.body); // Debug log
    if (req.user.role !== "institute") {
      return res.status(403).json({
        message: "Only institute account can configure roles"
      });
    }

    const { role, password } = req.body;

    const allowedRoles = ["doctor", "pharmacist", "diagnosis", "xray", "front_desk"];

    if (!role || !password) {
      return res.status(400).json({
        message: "Role and password are required"
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role"
      });
    }

    const existing = await InstitutionCredential.findOne({
      instituteId: req.user.instituteId,
      role
    });

    if (existing) {
      return res.status(400).json({
        message: "Password already set for this role"
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    await InstitutionCredential.create({
      instituteId: req.user.instituteId,
      role,
      password: hashed
    });

    res.status(201).json({
      message: `${role} password configured successfully`
    });
  })
);

router.put(
  "/update-role-passwords",
  verifyToken,
  expressAsyncHandler(async (req, res) => {

    if (req.user.role !== "institute") {
      return res.status(403).json({
        message: "Only institute account can update role passwords"
      });
    }

    const { doctor, pharmacist, diagnosis, xray, frontdesk } = req.body;

    const roles = [
      { role: "doctor", password: doctor },
      { role: "pharmacist", password: pharmacist },
      { role: "diagnosis", password: diagnosis },
      { role: "xray", password: xray },
      { role: "front_desk", password: frontdesk }
    ];

    for (let r of roles) {

      if (!r.password) continue;

      const credential = await InstitutionCredential.findOne({
        instituteId: req.user.instituteId,
        role: r.role
      });

      if (!credential) {
        return res.status(404).json({
          message: `${r.role} not configured yet`
        });
      }

      const hashed = await bcrypt.hash(r.password, 10);

      credential.password = hashed;
      await credential.save();
    }

    res.status(200).json({
      message: "Role passwords updated successfully"
    });
  })
);

router.get(
  "/get-role-status",
  verifyToken,
  expressAsyncHandler(async (req, res) => {

    if (req.user.role !== "institute") {
      return res.status(403).json({
        message: "Only institute account can view roles"
      });
    }

    const credentials = await InstitutionCredential.find({
      instituteId: req.user.instituteId
    });

    const roleStatus = {
      doctor: false,
      pharmacist: false,
      diagnosis: false,
      xray: false,
      frontdesk: false
    };

    credentials.forEach((cred) => {
      if (cred.role === "front_desk") {
        roleStatus.frontdesk = true;
      } else {
        roleStatus[cred.role] = true;
      }
    });

    res.json(roleStatus);
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