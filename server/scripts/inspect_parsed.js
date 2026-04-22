const fs = require('fs');
const p = 'server/imports/parsed_medicines_20260413003118.json';
const b = fs.readFileSync(p);
console.log('bytes:', b.slice(0,4));
console.log('\n---start---\n' + b.slice(0,500).toString() + '\n---end---');
