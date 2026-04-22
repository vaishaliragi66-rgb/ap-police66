const fs = require('fs');
const path = require('path');
const infile = path.join(__dirname, '..', 'imports', 'parsed_medicines_20260413003118.json');
const outfile = path.join(__dirname, '..', 'imports', 'import_for_bulk.json');
const raw = fs.readFileSync(infile, 'utf8');
let arr = JSON.parse(raw);
arr = arr.filter(r => r && r.name && r.name.toString().trim().toLowerCase() !== 'medicine' && (r.dosageForm || '').toString().trim().toLowerCase() !== 'dosage form');
fs.writeFileSync(outfile, JSON.stringify({ medicines: arr }, null, 2), 'utf8');
console.log('WROTE', outfile, 'count=', arr.length);
