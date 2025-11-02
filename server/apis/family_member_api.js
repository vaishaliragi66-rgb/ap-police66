const express = require('express');
const FamilyMember = require('../models/family_member');
const router = express.Router();

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
      EmployeeId: employeeId,
    }));

    // Save family members to the database
    const savedFamilyMembers = await FamilyMember.insertMany(familyMembersWithEmployeeId);
    res.status(201).json({ message: 'Family members added successfully.', familyMembers: savedFamilyMembers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while adding family members.' });
  }
});

module.exports = router;