const axios = require('axios');
const fs = require('fs');

// Usage: node cleanup_antibiotics.js --email <email> --password <password> --instituteId <id>

const argv = require('minimist')(process.argv.slice(2));
const email = argv.email || argv.Email_ID || argv.e;
const password = argv.password || argv.p;
const instituteId = argv.instituteId || argv.institute || argv.i;
const BACKEND = argv.backend || 'http://localhost:6100';

if (!email || !password || !instituteId) {
  console.error('Usage: node cleanup_antibiotics.js --email <email> --password <password> --instituteId <id> [--backend http://localhost:6100]');
  process.exit(1);
}

const normalize = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Allowed antibiotic entries (dosageForm + medicine name exactly as UI shows)
const allowed = [
  ['capsule','amoxicillin 250mg'],
  ['tablet','amoxicillin 250mg'],
  ['syrup','amoxicillin 250mg'],
  ['capsule','amoxicillin 500mg'],
  ['tablet','amoxicillin 500mg'],
  ['syrup','amoxicillin 500mg'],
  ['tablet','amoxicillin + clavulanate 250mg'],
  ['syrup','amoxicillin + clavulanate 250mg'],
  ['tablet','amoxicillin + clavulanate 500mg'],
  ['syrup','amoxicillin + clavulanate 500mg'],
  ['capsule','ampicillin 250mg'],
  ['syrup','ampicillin 250mg'],
  ['capsule','ampicillin 500mg'],
  ['syrup','ampicillin 500mg'],
  ['capsule','cloxacillin 250mg'],
  ['syrup','cloxacillin 250mg'],
  ['capsule','cloxacillin 500mg'],
  ['syrup','cloxacillin 500mg'],
  ['capsule','cephalexin 250mg'],
  ['syrup','cephalexin 250mg'],
  ['capsule','cephalexin 500mg'],
  ['syrup','cephalexin 500mg'],
  ['tablet','cefuroxime 250mg'],
  ['syrup','cefuroxime 250mg'],
  ['tablet','cefuroxime 500mg'],
  ['syrup','cefuroxime 500mg'],
  ['tablet','cefixime 200mg'],
  ['syrup','cefixime 200mg'],
  ['tablet','cefixime 400mg'],
  ['syrup','cefixime 400mg'],
  ['tablet','cefpodoxime 200mg'],
  ['syrup','cefpodoxime 200mg'],
  ['tablet','cefpodoxime 400mg'],
  ['syrup','cefpodoxime 400mg'],
  ['capsule','doxycycline 100mg'],
  ['tablet','doxycycline 100mg'],
  ['tablet','ciprofloxacin 250mg'],
  ['tablet','ciprofloxacin 500mg'],
  ['tablet','ofloxacin 200mg'],
  ['tablet','ofloxacin 400mg'],
  ['tablet','levofloxacin 250mg'],
  ['tablet','levofloxacin 500mg'],
  ['tablet','azithromycin 250mg'],
  ['syrup','azithromycin 250mg'],
  ['tablet','azithromycin 500mg'],
  ['syrup','azithromycin 500mg'],
  ['tablet','clarithromycin 250mg'],
  ['tablet','clarithromycin 500mg'],
  ['tablet','erythromycin 250mg'],
  ['syrup','erythromycin 250mg'],
  ['tablet','erythromycin 500mg'],
  ['syrup','erythromycin 500mg'],
  ['tablet','metronidazole 200mg'],
  ['syrup','metronidazole 200mg'],
  ['tablet','metronidazole 400mg'],
  ['syrup','metronidazole 400mg'],
  ['tablet','tinidazole 300mg'],
  ['tablet','tinidazole 500mg'],
  ['tablet','cotrimoxazole 480mg'],
  ['syrup','cotrimoxazole 480mg'],
  ['tablet','cotrimoxazole 960mg'],
  ['syrup','cotrimoxazole 960mg'],
  ['tablet','nitrofurantoin 100mg'],
  ['tablet','linezolid 600mg'],
  ['injection','vancomycin 500mg'],
  ['injection','vancomycin 1000mg'],
  ['injection','gentamicin 40mg/ml'],
  ['injection','amikacin 250mg/ml'],
  ['injection','amikacin 500mg/ml'],
  ['injection','ceftriaxone 500mg'],
  ['injection','ceftriaxone 1000mg'],
  ['injection','cefotaxime 500mg'],
  ['injection','cefotaxime 1000mg'],
  ['injection','cefepime 500mg'],
  ['injection','cefepime 1000mg'],
  ['injection','meropenem 500mg'],
  ['injection','meropenem 1000mg'],
  ['injection','imipenem + cilastatin 500mg'],
  ['injection','imipenem + cilastatin 1000mg'],
  ['injection','piperacillin + tazobactam 2.25g'],
  ['injection','piperacillin + tazobactam 4.5g'],
  ['injection','aztreonam 500mg'],
  ['injection','aztreonam 1000mg'],
  ['injection','colistin 1mu'],
  ['injection','colistin 2mu'],
  ['injection','sulbactam 500mg'],
  ['injection','sulbactam 1000mg'],
  ['injection','tazobactam 500mg'],
  ['injection','tazobactam 1000mg'],
  ['capsule','clindamycin 150mg'],
  ['injection','clindamycin 150mg'],
  ['capsule','clindamycin 300mg'],
  ['injection','clindamycin 300mg'],
  ['injection','teicoplanin 200mg'],
  ['injection','teicoplanin 400mg'],
  ['injection','tigecycline 50mg'],
  ['injection','polymyxin b 5000u/ml'],
  ['capsule','rifampicin 150mg'],
  ['capsule','rifampicin 300mg'],
  ['tablet','isoniazid 100mg'],
  ['tablet','isoniazid 300mg'],
  ['tablet','pyrazinamide 500mg'],
  ['tablet','ethambutol 400mg'],
  ['injection','streptomycin 1g']
];

const allowedSet = new Set(allowed.map(([form,name]) => `${normalize(form)}::${normalize(name)}`));

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post(`${BACKEND}/institute-auth/login`, { Email_ID: email, password });
    const token = loginRes.data.token;
    console.log('Login successful, token length:', String(token || '').length);

    // fetch medicines structure
    console.log('Fetching medicines-structure for', instituteId);
    const res = await axios.get(`${BACKEND}/master-data-api/medicines-structure`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { instituteId }
    });

    const data = (res.data && res.data.data) ? res.data.data : (res.data || {});
    const medicines = Array.isArray(data.medicines) ? data.medicines : [];
    console.log('Total medicines returned:', medicines.length);

    const toDelete = [];
    medicines.forEach((m) => {
      const medTypeNorm = normalize(m.medicineType || '');
      if (!medTypeNorm.includes('antibiot')) return; // not antibiotics
      const key = `${normalize(m.dosageForm||'') }::${normalize(m.value_name||'')}`;
      if (!allowedSet.has(key)) {
        if (m._id && /^[a-f\d]{24}$/i.test(String(m._id))) {
          toDelete.push({ id: m._id, name: m.value_name, dosageForm: m.dosageForm, strength: m.strength });
        }
      }
    });

    console.log('Antibiotic medicines to delete (persisted ids):', toDelete.length);
    fs.writeFileSync('server/imports/cleanup_antibiotics_candidates.json', JSON.stringify({ instituteId, candidates: toDelete }, null, 2));

    // confirm automatic deletion (no interactive prompt in this script)
    for (let i = 0; i < toDelete.length; i++) {
      const it = toDelete[i];
      try {
        console.log(`Deleting (${i+1}/${toDelete.length}) ${it.name} [${it.dosageForm}] id=${it.id}`);
        await axios.delete(`${BACKEND}/master-data-api/medicines/${it.id}`, { headers: { Authorization: `Bearer ${token}` } });
        await delay(200);
      } catch (err) {
        console.error('Delete error for id', it.id, err.response?.status, err.response?.data || err.message);
      }
    }

    // fetch after structure and save
    try {
      const after = await axios.get(`${BACKEND}/master-data-api/medicines-structure`, { headers: { Authorization: `Bearer ${token}` }, params: { instituteId } });
      const afterData = (after.data && after.data.data) ? after.data.data : (after.data || {});
      fs.writeFileSync(`server/imports/medicines_structure_after_cleanup_${instituteId}.json`, JSON.stringify(afterData, null, 2));
      console.log('Saved after-structure');
    } catch (e) {
      console.error('Failed to fetch after-structure', e.message);
    }

    console.log('Done. Candidates list saved to server/imports/cleanup_antibiotics_candidates.json');
  } catch (err) {
    console.error('Script error:', err.response?.status, err.response?.data || err.message);
  }
})();
