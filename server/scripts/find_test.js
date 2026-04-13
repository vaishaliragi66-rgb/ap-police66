const axios = require('axios');
const jwt = require('jsonwebtoken');

const BACKEND = process.env.BACKEND_URL || 'http://localhost:6100';
const JWT_SECRET = process.env.JWT_SECRET || 'institutesecret123';
const instituteId = process.env.INSTITUTE_ID || '69ddce87f953d4306791196f';
const TEST_NAME = process.env.TEST_NAME || 'Automated Test - My New Test';

(async () => {
  try {
    const token = jwt.sign({ instituteId, role: 'institute' }, JWT_SECRET, { expiresIn: '1h' });

    const [catsRes, tsRes] = await Promise.all([
      axios.get(`${BACKEND}/master-data-api/categories`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${BACKEND}/master-data-api/tests-structure`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const categories = catsRes.data || [];
    const testsStructure = tsRes.data || { categories: [], testsByCategory: {} };

    const testsFound = [];
    for (const [cat, rows] of Object.entries(testsStructure.testsByCategory || {})) {
      for (const r of (rows || [])) {
        if (String(r.name || "").toLowerCase() === String(TEST_NAME).toLowerCase()) {
          testsFound.push({ category: cat, row: r });
        }
      }
    }

    console.log('Tests structure categories count:', (testsStructure.categories || []).length);
    if (testsFound.length === 0) {
      console.log('Test not found in tests-structure');
    } else {
      console.log('Test found in tests-structure:', testsFound);
    }

    const testsCat = categories.find(c => String(c.category_name || '').trim().toLowerCase() === 'tests');
    if (!testsCat) {
      console.log('Top-level Tests category not found in categories API');
      return;
    }

    const valuesRes = await axios.get(`${BACKEND}/master-data-api/values`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { categoryId: testsCat._id }
    });

    const masterValues = Array.isArray(valuesRes.data) ? valuesRes.data : [];
    const mvMatches = masterValues.filter(mv => String(mv.value_name || '').toLowerCase() === String(TEST_NAME).toLowerCase() || String(mv.meta?.category || '').toLowerCase() === 'hematology');

    console.log('MasterValues under Tests count:', masterValues.length);
    if (mvMatches.length === 0) {
      console.log('No matching mastervalue found for test name or hematology category (sample of first 10):', masterValues.slice(0,10));
    } else {
      console.log('Matching mastervalues:', mvMatches);
    }
  } catch (err) {
    console.error('Error in find_test:', err.response?.data || err.message);
    process.exit(1);
  }
})();
