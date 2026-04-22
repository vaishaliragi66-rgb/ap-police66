const fs = require('fs');
function readJson(p){
  if(!fs.existsSync(p)) return null;
  const b = fs.readFileSync(p);
  let txt;
  if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) txt = b.toString('utf8');
  else if (b[0] === 0xFF && b[1] === 0xFE) txt = b.toString('utf16le');
  else if (b[0] === 0xFE && b[1] === 0xFF) txt = b.toString('utf16be');
  else txt = b.toString('utf8');
  txt = txt.replace(/\u0000/g,'').replace(/^\uFEFF/,'');
  try{ return JSON.parse(txt);}catch(e){ console.error('parse error', p, e.message); return null}
}
const files = {
  import: 'server/imports/import_for_bulk.json',
  backup: 'server/imports/backup_medicines_69ddce87f953d4306791196f_2026-04-17T12-00-00.json',
  after: 'server/imports/after_bulk_medicines_69ddce87f953d4306791196f.json'
};
for(const k of Object.keys(files)){
  const p = files[k];
  const j = readJson(p);
  console.log('\nFILE:', p);
  if(!j){ console.log('  missing or parse error'); continue; }
  if(k === 'import'){
    const meds = j.medicines || j.medications || j.data || [];
    const count = Array.isArray(meds) ? meds.length : (Array.isArray(j.medicines) ? j.medicines.length : 0);
    console.log('  import medicines count:', count);
  } else {
    // backup and after: look for data.medicines and data.medicineTypes
    const data = j.data || j;
    const meds = Array.isArray(data.medicines) ? data.medicines.length : (Array.isArray(data.masterValues) ? data.masterValues.length : 0);
    const types = Array.isArray(data.medicineTypes) ? data.medicineTypes.length : (Array.isArray(data.medicineTypeEntries) ? data.medicineTypeEntries.length : 0);
    console.log('  medicines:', meds);
    console.log('  medicineTypes:', types);
  }
}
console.log('\nDone');
