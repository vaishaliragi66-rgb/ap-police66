const axios = require('axios');
const jwt = require('jsonwebtoken');

const BACKEND = process.env.BACKEND_URL || 'http://localhost:6100';
const JWT_SECRET = process.env.JWT_SECRET || 'institutesecret123';
const instituteId = process.env.INSTITUTE_ID || '69ddce87f953d4306791196f';

(async () => {
  try {
    const token = jwt.sign({ instituteId, role: 'institute' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await axios.get(`${BACKEND}/master-data-api/tests-structure`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    console.log('Categories:', res.data.categories.slice(0,20));
    const tests = res.data.testsByCategory['HEMATOLOGY'] || [];
    console.log('HEMATOLOGY tests sample:', tests.slice(-5));
  } catch (err) {
    console.error('Error fetching tests structure:', err.response?.data || err.message);
    process.exit(1);
  }
})();
