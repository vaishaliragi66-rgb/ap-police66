const express = require('express');
const mongoose = require('mongoose');
const { listMasterDiseases } = require('../utils/instituteMasterData');

const router = express.Router();

function sortUnique(arr) {
  if (!Array.isArray(arr)) return [];
  const uniq = Array.from(new Set(arr.map(s => (s || '').trim()))).filter(Boolean);
  return uniq.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

router.get('/static', async (req, res) => {
  try {
    const instituteId = String(req.query.instituteId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ message: 'Valid instituteId is required' });
    }

    const { communicable, nonCommunicable } = await listMasterDiseases(instituteId);
    const comm = sortUnique(communicable);
    const non = sortUnique(nonCommunicable);
    const all = sortUnique([].concat(comm, non));

    return res.json({ communicable: comm, nonCommunicable: non, all });
  } catch (err) {
    console.error('Error reading disease data:', err);
    return res.status(500).json({ message: 'Failed to load disease data' });
  }
});

module.exports = router;
