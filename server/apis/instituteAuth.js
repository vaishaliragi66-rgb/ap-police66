const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Institute = require("../models/Institute"); // your existing schema
const InstitutionCredential = require("../models/InstitutionCredential");

const JWT_SECRET = "YOUR_SECRET_KEY"; // move to .env in production

router.post("/setup-roles", async (req, res) => {
  try {
    const { instituteId, doctor, pharmacist, diagnosis, xray } = req.body;

    const roles = [
      { role: "doctor", password: doctor },
      { role: "pharmacist", password: pharmacist },
      { role: "diagnosis", password: diagnosis },
      { role: "xray", password: xray },
    ];

    for (let r of roles) {
      const hashedPassword = await bcrypt.hash(r.password, 10);

      await InstitutionCredential.findOneAndUpdate(
        { instituteId, role: r.role },
        { password: hashedPassword },
        { upsert: true, new: true }
      );
    }

    res.json({ message: "Role passwords set successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error setting role passwords" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, role, password } = req.body;

    const institute = await Institute.findOne({ Email_ID: email });
    if (!institute)
      return res.status(404).json({ message: "Institute not found" });

    if (role === "admin") {
      const isMatch = await bcrypt.compare(password, institute.Password);
      if (!isMatch)
        return res.status(401).json({ message: "Invalid password" });

      const token = jwt.sign(
        { instituteId: institute._id, role: "admin" },
        JWT_SECRET,
        { expiresIn: "8h" }
      );

      return res.json({
        token,
        role: "admin",
        instituteId: institute._id,
        instituteName: institute.Institute_Name,
      });
    }

    // Other roles
    const credential = await InstitutionCredential.findOne({
      instituteId: institute._id,
      role,
    });

    if (!credential)
      return res.status(404).json({ message: "Role not configured" });

    const isMatch = await bcrypt.compare(password, credential.password);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { instituteId: institute._id, role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      role,
      instituteId: institute._id,
      instituteName: institute.Institute_Name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login error" });
  }
});