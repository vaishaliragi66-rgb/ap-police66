const express = require('express');
const path = require('path');
const fs = require('fs');

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

    const comm = sortUnique(data.communicable || []);
    const non = sortUnique(data.nonCommunicable || []);
    const all = sortUnique(data.all || [].concat(comm, non));

    return res.json({ communicable: comm, nonCommunicable: non, all });
  } catch (err) {
    console.error('Error reading disease data:', err);
    return res.status(500).json({ message: 'Failed to load disease data' });
  }
});

module.exports = router;
