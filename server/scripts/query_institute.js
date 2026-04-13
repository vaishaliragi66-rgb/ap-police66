const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const dns = require('dns');
const Institute = require('../models/master_institute');

const getResolver = () => {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);
  return resolver;
};

const buildFallbackMongoUri = async (mongoSrvUri) => {
  const uri = new URL(mongoSrvUri);
  const host = uri.hostname;
  const dbName = uri.pathname && uri.pathname !== '/' ? uri.pathname.slice(1) : 'test';
  const username = decodeURIComponent(uri.username || '');
  const password = decodeURIComponent(uri.password || '');

  const resolver = getResolver();

  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  if (!srvRecords || srvRecords.length === 0) {
    throw new Error('No SRV records found for MongoDB host');
  }

  const hosts = srvRecords
    .sort((a, b) => a.priority - b.priority)
    .map((record) => `${record.name.replace(/\.$/, '')}:${record.port}`)
    .join(',');

  let txtParams = '';
  try {
    const txtRecords = await resolver.resolveTxt(host);
    txtParams = txtRecords.flat().join('');
  } catch (err) {
    txtParams = '';
  }

  const params = new URLSearchParams(uri.search || '');
  if (txtParams) {
    const txtSearchParams = new URLSearchParams(txtParams);
    for (const [key, value] of txtSearchParams.entries()) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }
  }

  if (!params.has('tls')) params.set('tls', 'true');
  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  if (!params.has('w')) params.set('w', 'majority');

  const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';

  return `mongodb://${authPart}${hosts}/${dbName}?${params.toString()}`;
};

async function connectWithFallback(uri) {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
    return;
  } catch (err) {
    const isSrvDnsIssue =
      uri?.startsWith('mongodb+srv://') &&
      (err?.message?.includes('querySrv ECONNREFUSED') || err?.code === 'ECONNREFUSED');

    if (!isSrvDnsIssue) {
      throw err;
    }

    console.warn('Mongo SRV DNS lookup failed. Retrying with DNS fallback...');
    const fallbackUri = await buildFallbackMongoUri(uri);
    await mongoose.connect(fallbackUri);
    console.log('MongoDB connected (DNS fallback)');
  }
}

async function run() {
  const uri = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGO;
  if (!uri) {
    console.error('No Mongo URI found in .env');
    process.exit(1);
  }

  await connectWithFallback(uri);

  const email = process.argv[2] || 'neelima@gmail.com';
  const showPassword = process.env.SHOW_PASSWORD === 'true' || process.argv.includes('--show-password');
  console.log(`Searching for institute with email: ${email}`);
  const inst = await Institute.findOne({ Email_ID: { $regex: `^${email.trim()}$`, $options: 'i' } }).lean();
  if (!inst) {
    console.log('No institute found');
  } else {
    if (!showPassword && inst.password) inst.password = '[HIDDEN]';
    console.log('Found institute:');
    console.log(JSON.stringify(inst, null, 2));
    if (!showPassword) {
      console.log('Tip: re-run with SHOW_PASSWORD=true or --show-password to reveal stored password (careful).');
    }
  }

  // Support setting a new password via --set-password <pwd>
  const setIndex = process.argv.indexOf('--set-password');
  if (setIndex !== -1 && process.argv.length > setIndex + 1) {
    const newPass = process.argv[setIndex + 1];
    if (!newPass) {
      console.error('No password provided after --set-password');
      await mongoose.disconnect();
      process.exit(1);
    }

    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(newPass, 10);
    const updated = await Institute.findOneAndUpdate({ Email_ID: { $regex: `^${email.trim()}$`, $options: 'i' } }, { password: hashed }, { new: true }).lean();
    console.log('Password updated for institute. Re-run login with the new password.');
    if (updated) {
      if (!showPassword) updated.password = '[HIDDEN]';
      console.log(JSON.stringify(updated, null, 2));
    }
  }

  // Support setting the raw password hash directly (for restoring previous hashes)
  const setHashIndex = process.argv.indexOf('--set-hash');
  if (setHashIndex !== -1 && process.argv.length > setHashIndex + 1) {
    const rawHash = process.argv[setHashIndex + 1];
    if (!rawHash) {
      console.error('No hash provided after --set-hash');
      await mongoose.disconnect();
      process.exit(1);
    }

    const updated = await Institute.findOneAndUpdate(
      { Email_ID: { $regex: `^${email.trim()}$`, $options: 'i' } },
      { password: rawHash },
      { new: true }
    ).lean();

    console.log('Raw hash updated for institute.');
    if (updated) {
      if (!showPassword) updated.password = '[HIDDEN]';
      console.log(JSON.stringify(updated, null, 2));
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Error querying institute:', err);
  process.exit(1);
});
