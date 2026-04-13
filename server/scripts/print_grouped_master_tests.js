const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const { listMasterTests } = require('../utils/instituteMasterData');
const dns = require('dns');
const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';
const getResolver = () => { const r = new dns.promises.Resolver(); r.setServers(['8.8.8.8','1.1.1.1']); return r; };
const buildFallbackMongoUri = async (mongoSrvUri) => {
  const uri = new URL(mongoSrvUri);
  const host = uri.hostname; const dbName = uri.pathname && uri.pathname !== '/' ? uri.pathname.slice(1) : 'test';
  const username = decodeURIComponent(uri.username||''); const password = decodeURIComponent(uri.password||'');
  const resolver = getResolver();
  const srv = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  const hosts = srv.map(s=>`${s.name.replace(/\.$/,'')}:${s.port}`).join(',');
  let txt = '';
  try { txt = (await resolver.resolveTxt(host)).flat().join(''); } catch(e) {}
  const params = new URLSearchParams(uri.search||'');
  if (txt) { const t = new URLSearchParams(txt); for(const [k,v] of t.entries()) if(!params.has(k)) params.set(k,v); }
  if(!params.has('tls')) params.set('tls','true'); if(!params.has('retryWrites')) params.set('retryWrites','true'); if(!params.has('w')) params.set('w','majority');
  const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  return `mongodb://${auth}${hosts}/${dbName}?${params.toString()}`;
};
const connect = async () => { try{ await mongoose.connect(MONGO); } catch(err){ if(MONGO.startsWith('mongodb+srv://')){ const fb = await buildFallbackMongoUri(MONGO); await mongoose.connect(fb); } else throw err; } };

const normalize = (value) => String(value || '').trim().toLowerCase();

(async () => {
  await connect();
  const Institute = mongoose.connection.db.collection('institutes');
  const ARG_ID = process.argv[2] || process.env.INSTITUTE_ID || '';
  let instituteId = ARG_ID;
  if (!ARG_ID) {
    const inst = await Institute.findOne({});
    if (!inst) { console.log('No institute found'); process.exit(0); }
    instituteId = inst._id ? inst._id.toString() : inst._id.toString();
  } else {
    // validate existence
    const inst = await Institute.findOne({ _id: new mongoose.Types.ObjectId(instituteId) });
    if (!inst) { console.log('Institute not found for id:', instituteId); process.exit(1); }
  }
  console.log('Using institute:', instituteId);

  const masterTests = await listMasterTests(instituteId, { includeInactive: true });

  const TEST_GROUPS = {
    HEMATOLOGY: ['hemoglobin','rbc','wbc','platelet','hematocrit','mcv','mch','mchc','esr','neutrophil','lymphocyte','eosinophil','monocyte','basophil','rdw'],
    'DIABETES & GLUCOSE': ['fasting blood sugar','postprandial','ppbs','hba1c','random blood sugar','rbs','insulin','c-peptide'],
    'LIPID PROFILE': ['total cholesterol','ldl','hdl','triglyceride','vldl','non-hdl','ldl/hdl','ldl ratio'],
    'LIVER FUNCTION TESTS (LFT)': ['bilirubin','alt','ast','alkaline phosphatase','ggt','total protein','albumin','globulin','a/g ratio'],
    'KIDNEY FUNCTION TESTS (KFT)': ['creatinine','blood urea nitrogen','bun','urea','uric acid','egfr','cystatin'],
    'THYROID PROFILE': ['tsh','free t4','free t3','total t4','total t3','anti-tpo'],
    ELECTROLYTES: ['sodium','potassium','chloride','calcium','magnesium','phosphate','bicarbonate'],
    URINALYSIS: ['urine pH','urine specific gravity','urine protein','urine glucose','urine ketones','urine rbc','urine wbc','urine nitrite','urine bilirubin','microalbuminuria'],
    'CARDIAC MARKERS': ['troponin','ck-mb','bnp','hs-crp','homocysteine','lipoprotein'],
    'VITAMINS & MINERALS': ['vitamin d','vitamin b12','folate','serum iron','ferritin','tibc','zinc','vitamin b1'],
    'COAGULATION STUDIES': ['prothrombin time','inr','aptt','fibrinogen','d-dimer','bleeding time'],
    'INFECTIOUS DISEASE PANEL': ['hbsag','anti-hcv','hiv','vdrl','dengue','malaria','widal'],
    'TUMOR MARKERS': ['psa','cea','afp','ca-125','ca 19-9'],
    'HORMONAL PROFILE': ['testosterone','fsh','lh','prolactin','cortisol','dhea-s'],
    'BONE HEALTH': ['pth','alkaline phosphatase (bone)','calcium (serum)','phosphorus'],
    IMMUNOLOGY: ['ige','ana','rheumatoid factor','crp']
  };

  const grouped = {};
  masterTests.forEach((test) => {
    const name = normalize(test.Test_Name || '');
    const group = normalize(test.Group || '');
    let assigned = 'Uncategorized';

    // If group exactly matches a known group key, use it
    if (Object.keys(TEST_GROUPS).some(k => normalize(k) === group)) assigned = Object.keys(TEST_GROUPS).find(k => normalize(k) === group);

    // else try to match by test name or group text
    if (assigned === 'Uncategorized') {
      for (const [cat, terms] of Object.entries(TEST_GROUPS)) {
        for (const term of terms) {
          const t = normalize(term);
          if (name.includes(t) || group.includes(t)) { assigned = cat; break; }
        }
        if (assigned !== 'Uncategorized') break;
      }
    }

    if (!grouped[assigned]) grouped[assigned] = [];
    grouped[assigned].push({ name: test.Test_Name, reference: test.Reference_Range || '', unit: test.Units || '' });
  });

  Object.keys(grouped).forEach(k => {
    console.log('\n==', k, '== (', grouped[k].length, 'tests )');
    grouped[k].slice(0, 200).forEach((t, i) => console.log(i+1, t.name, t.reference, t.unit));
  });

  await mongoose.connection.close();
})();