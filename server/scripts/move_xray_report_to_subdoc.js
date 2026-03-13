require('dotenv').config();
const mongoose = require('mongoose');

const XrayRecord = require('../models/XrayRecordSchema');

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error('Usage: node move_xray_report_to_subdoc.js <Record_ID> <filename> [xrayIndex]');
    process.exit(1);
  }
  const [recordId, filename, xrayIndexArg] = argv;

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/ap_police';
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  const record = await XrayRecord.findById(recordId);
  if (!record) {
    console.error('Record not found:', recordId);
    process.exit(1);
  }

  const report = (record.Reports || []).find(r => r.filename === filename || r.originalname === filename || r._id == filename);
  if (!report) {
    console.error('Report not found on record-level. Available reports:', (record.Reports || []).map(r => r.filename));
    process.exit(1);
  }

  let targetIndex = null;
  if (typeof xrayIndexArg !== 'undefined') {
    targetIndex = parseInt(xrayIndexArg, 10);
    if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= (record.Xrays || []).length) {
      console.error('Invalid xrayIndex:', xrayIndexArg);
      process.exit(1);
    }
  } else {
    // pick the Xray whose Timestamp is closest to report.uploadedAt
    const uploadedAt = report.uploadedAt ? new Date(report.uploadedAt) : null;
    if (!uploadedAt) {
      console.error('Report has no uploadedAt timestamp; please provide xrayIndex explicitly.');
      process.exit(1);
    }
    let best = { idx: -1, diff: Number.POSITIVE_INFINITY };
    (record.Xrays || []).forEach((x, idx) => {
      const t = x.Timestamp ? new Date(x.Timestamp) : null;
      if (!t) return;
      const diff = Math.abs(t - uploadedAt);
      if (diff < best.diff) {
        best = { idx, diff };
      }
    });
    if (best.idx === -1) {
      console.error('No Xray timestamps available; provide xrayIndex explicitly.');
      process.exit(1);
    }
    targetIndex = best.idx;
  }

  // Remove from record-level Reports
  record.Reports = (record.Reports || []).filter(r => !(r.filename === report.filename && String(r._id) === String(report._id)));

  // Ensure Reports array exists on the target Xray
  if (!record.Xrays[targetIndex].Reports) record.Xrays[targetIndex].Reports = [];
  record.Xrays[targetIndex].Reports.push(report);

  await record.save();
  console.log('Moved report', report.filename, 'to Xrays[', targetIndex, '] of record', recordId);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
