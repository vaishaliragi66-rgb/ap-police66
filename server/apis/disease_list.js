const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const MasterCategory = require('../models/master_category');
const MasterValue = require('../models/master_value');

const router = express.Router();

const DATA_FILE = path.join(__dirname, '..', 'data', 'diseases.json');

function sortUnique(arr) {
  if (!Array.isArray(arr)) return [];
  const uniq = Array.from(new Set(arr.map(s => (s || '').trim()))).filter(Boolean);
  return uniq.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

router.get('/static', async (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(404).json({ message: 'Disease data not found' });
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw || '{}');

    let comm = sortUnique(data.communicable || []);
    let non = sortUnique(data.nonCommunicable || []);

    const instituteId = String(req.query.instituteId || '').trim();
    if (mongoose.Types.ObjectId.isValid(instituteId)) {
      const diseasesCategory = await MasterCategory.findOne({
        Institute_ID: instituteId,
        normalized_name: 'diseases'
      }).select('_id');

      if (diseasesCategory) {
        const customDiseases = await MasterValue.find({
          Institute_ID: instituteId,
          category_id: diseasesCategory._id,
          status: 'Active',
          'meta.kind': 'disease'
        }).select('value_name meta');

        customDiseases.forEach((item) => {
          const group = String(item?.meta?.group || '').trim();
          if (group === 'Communicable') comm.push(item.value_name);
          if (group === 'Non-Communicable') non.push(item.value_name);
        });

        comm = sortUnique(comm);
        non = sortUnique(non);
      }
    }

    const all = sortUnique(data.all || [].concat(comm, non));

    return res.json({ communicable: comm, nonCommunicable: non, all });
  } catch (err) {
    console.error('Error reading disease data:', err);
    return res.status(500).json({ message: 'Failed to load disease data' });
  }
});

module.exports = router;
