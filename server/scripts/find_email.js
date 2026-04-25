const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

(async () => {
  try {
    const email = process.argv[2];
    if (!email) {
      console.error('Usage: node find_email.js <email>');
      process.exit(1);
    }
    const uri = process.env.MONGO_URL;
    if (!uri) {
      console.error('MONGO_URL not set');
      process.exit(1);
    }
    const client = new MongoClient(uri);
    await client.connect();
    const dbName = uri.split('/').pop().split('?')[0] || 'test';
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    console.log('Scanning', collections.length, 'collections in', db.databaseName);
    const found = [];
    for (const coll of collections) {
      const name = coll.name;
      try {
        const col = db.collection(name);
        const query = { $or: [{ Email_ID: { $regex: `^${email}$`, $options: 'i' } }, { email: { $regex: `^${email}$`, $options: 'i' } }, { Email: { $regex: `^${email}$`, $options: 'i' } }, { EmailAddress: { $regex: `^${email}$`, $options: 'i' } }, { username: { $regex: `^${email}$`, $options: 'i' } }, { user: { $regex: `^${email}$`, $options: 'i' } }] };
        const doc = await col.findOne(query);
        if (doc) {
          found.push({ collection: name, doc });
        }
      } catch (e) {
        // ignore
      }
    }
    if (found.length === 0) {
      console.log('Email not found in any collection');
    } else {
      console.log('Found in collections:');
      for (const f of found) {
        console.log('-', f.collection, ' -> sample keys:', Object.keys(f.doc).slice(0,10));
      }
    }
    await client.close();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e && e.message);
    process.exit(1);
  }
})();