const axios = require('axios');
const jwt = require('jsonwebtoken');

const BACKEND = process.env.BACKEND_URL || 'http://localhost:6100';
const JWT_SECRET = process.env.JWT_SECRET || 'institutesecret123';
const instituteId = process.env.INSTITUTE_ID || '69ddce87f953d4306791196f';

(async () => {
  try {
    const token = jwt.sign({ instituteId, role: 'institute' }, JWT_SECRET, { expiresIn: '1h' });
    console.log('Using token:', token);

    const payload = {
      category: 'HEMATOLOGY',
      testName: 'Automated Test - My New Test',
      referenceRange: '1-5',
      unit: 'mg'
    };

    const res = await axios.post(`${BACKEND}/master-data-api/tests`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('Response status:', res.status);
    console.log('Response data:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', JSON.stringify(err.response.data));
    } else {
      console.error('Request error:', err.message);
    }
    process.exit(1);
  }
})();
