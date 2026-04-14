const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const ToBePrescribedSchema = new mongoose.Schema({}, { strict: false, collection: 'tobeprescribedmedicines' });
const ToBePrescribed = mongoose.model('ToBePrescribedTemp', ToBePrescribedSchema);

async function checkRecords() {
  try {
    await mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ MongoDB connected');

    const count = await ToBePrescribed.countDocuments();
    console.log(`\n📊 Total ToBePrescribedMedicine records: ${count}`);

    const recent = await ToBePrescribed.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (recent.length === 0) {
      console.log('\n⚠️  No records found');
    } else {
      console.log('\n🔍 Latest 5 records:');
      recent.forEach((doc, idx) => {
        console.log(`${idx + 1}. Medicine: ${doc.Medicine_Name}, Employee: ${doc.Employee}, Institute: ${doc.Institute}, Created: ${doc.createdAt}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkRecords();
