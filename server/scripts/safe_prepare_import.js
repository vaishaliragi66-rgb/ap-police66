const fs = require('fs');
const inPath = 'server/imports/parsed_medicines_20260413003118.json';
const outPath = 'server/imports/import_for_bulk.json';
const raw = fs.readFileSync(inPath);
const txt = raw.toString('utf8').replace(/^\uFEFF/, '');
let arr = JSON.parse(txt);
arr = arr.filter(r => r && r.name && r.name.toString().trim().toUpperCase() !== 'MEDICINE');
const medicines = arr.map(r => ({
  name: (r.name||'').toString().trim(),
  medicineType: (r.medicineType||'').toString().trim(),
  dosageForm: (r.dosageForm||'').toString().trim(),
  strength: (r.strength||'').toString().trim()
})).filter(m => m.name);
fs.writeFileSync(outPath, JSON.stringify({medicines}, null, 2), 'utf8');
console.log('Wrote', medicines.length, 'medicines to', outPath);
