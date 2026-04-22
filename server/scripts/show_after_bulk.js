const fs = require('fs');
const p = 'server/imports/after_bulk_medicines_69ddce87f953d4306791196f.json';
const b = fs.readFileSync(p);
console.log('first bytes:', b.slice(0,20));
let txt;
if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) txt = b.toString('utf8');
else if (b[0] === 0xFF && b[1] === 0xFE) txt = b.toString('utf16le');
else if (b[0] === 0xFE && b[1] === 0xFF) txt = b.toString('utf16be');
else txt = b.toString('utf8');
console.log('first char codes:', Array.from({length:10}, (_,i)=>txt.charCodeAt(i)));
try{
  const cleaned = txt.replace(/\u0000/g, '').replace(/^\uFEFF/, '');
  const j = JSON.parse(cleaned);
  console.log('parsed JSON keys:', Object.keys(j));
  if (j.data){
    console.log('data keys:', Object.keys(j.data));
    if (Array.isArray(j.data.medicines)) console.log('medicines count:', j.data.medicines.length);
    if (Array.isArray(j.data.medicineTypes)) console.log('medicineTypes count:', j.data.medicineTypes.length);
  }
  console.log('\n-- snippet --\n', txt.slice(0,200));
}catch(e){
  console.error('JSON parse error:', e.message);
  console.log('\n-- raw head --\n', txt.slice(0,200));
}
