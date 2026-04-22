const axios = require('axios');
const fs = require('fs');
(async ()=>{
  try{
    const login = JSON.parse(fs.readFileSync('server/imports/login_response.json','utf8'));
    const token = login.token;
    const payload = JSON.parse(fs.readFileSync('server/imports/import_for_bulk.json','utf8'));
    const url = 'http://localhost:6100/master-data-api/medicines/bulk-replace?instituteId=69ddce87f953d4306791196f';
    const res = await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' } });
    fs.writeFileSync('server/imports/bulk_replace_response.json', JSON.stringify(res.data, null, 2),'utf8');
    console.log('bulk replace response saved');
    const after = await axios.get('http://localhost:6100/master-data-api/medicines-structure?instituteId=69ddce87f953d4306791196f');
    fs.writeFileSync('server/imports/after_bulk_medicines_69ddce87f953d4306791196f.json', JSON.stringify(after.data, null, 2),'utf8');
    console.log('after structure saved');
  }catch(e){
    console.error('error', e.response?.status, e.response?.data || e.message);
    try{ fs.writeFileSync('server/imports/bulk_replace_response.json', JSON.stringify({ error: e.message, data: e.response?.data || null }, null, 2),'utf8'); }catch(e2){}
  }
})();
