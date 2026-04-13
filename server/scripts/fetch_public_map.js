const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BACKEND = process.env.BACKEND_URL || 'http://localhost:6100';
const INSTITUTE_ID = process.argv[2] || '';

async function main() {
  if (!INSTITUTE_ID) {
    console.error('Usage: node fetch_public_map.js <instituteId>');
    process.exit(2);
  }

  try {
    const res = await axios.get(`${BACKEND}/master-data-api/public-map`, { params: { instituteId: INSTITUTE_ID }, timeout: 60000 });
    const data = res.data || {};
    const meds = Array.isArray(data.Medicines) ? data.Medicines : [];
    console.log('Medicines length:', meds.length);
    console.log('First 20 medicines:');
    meds.slice(0, 20).forEach((m, i) => {
      console.log(i + 1, '-', m.value_name, '| meta:', JSON.stringify(m.meta || {}));
    });
  } catch (err) {
    console.error('Request failed:', err.message || err);
    if (err.response) console.error('Status:', err.response.status);
  }
}

main();
