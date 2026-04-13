const mongoose = require('mongoose');
const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/ap-police';

(async () => {
  await mongoose.connect(MONGO);
  const names = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:');
  names.forEach(c => console.log(' -', c.name));
  await mongoose.connection.close();
})();
