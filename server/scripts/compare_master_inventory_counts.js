const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/../.env' });

const BACKEND = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 6100}`;
const INSTITUTE_ID = process.argv[2] || process.env.INSTITUTE_ID || '';

if (!INSTITUTE_ID) {
  console.error('Usage: node compare_master_inventory_counts.js <instituteId>');
  process.exit(1);
}

const normalize = (v) => String(v || '').trim().toLowerCase();

async function run() {
  try {
    const [mapRes, invRes] = await Promise.all([
      axios.get(`${BACKEND}/master-data-api/public-map`, { params: { instituteId: INSTITUTE_ID } }),
      axios.get(`${BACKEND}/institute-api/inventory/${INSTITUTE_ID}`)
    ]);

    const master = mapRes.data || {};
    const inventory = Array.isArray(invRes.data) ? invRes.data : [];

    const masterEntries = (master.Medicines || []).map((it) => ({
      value_name: String(it.value_name || '').trim(),
      medicineType: String(it.meta?.medicineType || it.meta?.medicine_type || '').trim()
    }));

    const byType = {};
    masterEntries.forEach((m) => {
      const t = String(m.medicineType || 'UNKNOWN').trim() || 'UNKNOWN';
      byType[t] = byType[t] || { master: new Set(), inventory: new Set(), invRawCount: 0 };
      byType[t].master.add(normalize(m.value_name));
    });

    // For inventory, dedupe by medicine name per type when matching master types
    inventory.forEach((it) => {
      const name = normalize(it.Medicine_Name);
      const type = normalize(it.Type || '');
      // find matching master types for this name
      // we'll try to find master medicines with same name
      const matched = masterEntries.filter(m => normalize(m.value_name) === name);
      if (matched.length) {
        matched.forEach(m => {
          const t = String(m.medicineType || 'UNKNOWN').trim() || 'UNKNOWN';
          byType[t] = byType[t] || { master: new Set(), inventory: new Set(), invRawCount: 0 };
          byType[t].inventory.add(name);
          byType[t].invRawCount += 1;
        });
      }
    });

    console.log('Type | masterUnique | inventoryUnique | inventoryRawCount');
    Object.keys(byType).sort().forEach((t) => {
      console.log(`${t} | ${byType[t].master.size} | ${byType[t].inventory.size} | ${byType[t].invRawCount}`);
    });

  } catch (err) {
    console.error('Error:', err.message || err);
  }
}

run();
