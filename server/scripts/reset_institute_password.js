const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
const { URL, URLSearchParams } = require('url');
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
      if (!params.has(key)) params.set(key, value);
    }
  }

  if (!params.has('tls')) params.set('tls', 'true');
  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  if (!params.has('w')) params.set('w', 'majority');

  const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';

  return `mongodb://${authPart}${hosts}/${dbName}?${params.toString()}`;
};

(async () => {
  try {
    const email = (process.argv[2] || '').trim();
    const newPass = process.argv[3] || '';

    if (!email || !newPass) {
      console.error('Usage: node server/scripts/reset_institute_password.js <email> <new-password>');
      process.exit(1);
    }

    const mongoUri = process.env.MONGO_URL;
    if (!mongoUri) {
      console.error('MONGO_URL is not configured');
      process.exit(1);
    }

    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to Mongo (SRV)');
    } catch (err) {
      console.warn('SRV connect failed, attempting fallback...');
      const fallback = await buildFallbackMongoUri(mongoUri);
      await mongoose.connect(fallback);
      console.log('Connected to Mongo (fallback)');
    }

    const inst = await Institute.findOne({ Email_ID: { $regex: `^${email.trim()}$`, $options: 'i' } });
    if (!inst) {
      console.error('Institute not found');
      process.exit(1);
    }

    const hashed = await bcrypt.hash(newPass, 10);
    inst.password = hashed;
    await inst.save();
    console.log('Password updated for', inst.Email_ID);
    process.exit(0);
  } catch (e) {
    console.error('ERR', e && e.message);
    process.exit(1);
  }
})();
