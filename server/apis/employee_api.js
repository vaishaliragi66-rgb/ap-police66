const express = require('express');
const Employee = require('../models/employee');
const router = express.Router();

// Employee registration endpoint
router.post('/register', async (req, res) => {
  try {
    const { ABS_NO, Name, Designation, DOB, Address, Blood_Group, Medical_History } = req.body;

    // Validate required fields
    if (!ABS_NO || !Name) {
      return res.status(400).json({ error: 'ABS_NO and Name are required fields.' });
    }

    // Create a new employee
    const newEmployee = new Employee({
      ABS_NO,
      Name,
      Designation,
      DOB,
      Address,
      Blood_Group,
      Medical_History
    });

    // Save to database
    await newEmployee.save();
    res.status(201).json({ message: 'Employee registered successfully', employee: newEmployee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while registering the employee.' });
  }
});

// Add family members for an employee
router.post('/:employeeId/add-family-members', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { familyMembers } = req.body;

    // Validate input
    if (!familyMembers || !Array.isArray(familyMembers)) {
      return res.status(400).json({ error: 'Invalid family members data.' });
    }

    // Add employeeId to each family member
    const familyMembersWithEmployeeId = familyMembers.map((member) => ({
      ...member,
      Employee_ABS_NO: employeeId,
    }));

    // Save family members to the database
    const FamilyMember = require('../models/family_member');
    const savedFamilyMembers = await FamilyMember.insertMany(familyMembersWithEmployeeId);
    res.status(201).json({ message: 'Family members added successfully.', familyMembers: savedFamilyMembers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while adding family members.' });
  }
});

module.exports = router;