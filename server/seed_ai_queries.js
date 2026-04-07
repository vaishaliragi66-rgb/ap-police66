/**
 * Seed Demo Data for AI Query Suggestions
 * Run this script to populate the AIQuery collection with sample queries
 * 
 * Usage: node seed_ai_queries.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ap-police';

console.log('🔌 Connecting to MongoDB...');
console.log('   URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    seedQueries();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Make sure MongoDB is running and the URI is correct');
    process.exit(1);
  });

// Define the schema (same as in models/AIQuery.js)
const aiQuerySchema = new mongoose.Schema(
  {
    queryText: { type: String, required: true, trim: true, index: true },
    count: { type: Number, default: 1, min: 1 },
    lastUsed: { type: Date, default: Date.now, index: true },
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: false },
    userId: { type: String, required: false }
  },
  { timestamps: true }
);

const AIQuery = mongoose.model('AIQuery', aiQuerySchema);

// Demo queries with realistic usage patterns
const demoQueries = [
  // Employee queries (high frequency)
  { queryText: 'list employees with blood group o+', count: 25, lastUsed: new Date(Date.now() - 1000 * 60 * 5) }, // 5 min ago
  { queryText: 'show all employees by designation', count: 18, lastUsed: new Date(Date.now() - 1000 * 60 * 30) }, // 30 min ago
  { queryText: 'count employees by blood group', count: 15, lastUsed: new Date(Date.now() - 1000 * 60 * 60) }, // 1 hour ago
  { queryText: 'list employees with blood group b+', count: 12, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 2) }, // 2 hours ago
  { queryText: 'show employees aged above 50', count: 8, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 3) }, // 3 hours ago
  
  // Disease/Patient queries (medium frequency)
  { queryText: 'show diabetes patients by age', count: 22, lastUsed: new Date(Date.now() - 1000 * 60 * 10) }, // 10 min ago
  { queryText: 'count patients with hypertension', count: 16, lastUsed: new Date(Date.now() - 1000 * 60 * 45) }, // 45 min ago
  { queryText: 'list all diabetes patients', count: 14, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 4) }, // 4 hours ago
  { queryText: 'show age distribution of diabetes patients', count: 11, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 5) },
  { queryText: 'family members with hypertension', count: 9, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 6) },
  { queryText: 'patients with heart disease', count: 7, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 8) },
  
  // Medicine/Inventory queries (medium-high frequency)
  { queryText: 'count medicines with low stock', count: 20, lastUsed: new Date(Date.now() - 1000 * 60 * 15) }, // 15 min ago
  { queryText: 'list medicines expiring soon', count: 17, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 1.5) },
  { queryText: 'show medicine inventory by name', count: 13, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 7) },
  { queryText: 'count prescriptions by medicine name', count: 10, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 10) },
  { queryText: 'medicines below minimum stock level', count: 6, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 12) },
  
  // Prescription queries (lower frequency)
  { queryText: 'show recent prescriptions', count: 8, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { queryText: 'count prescriptions by doctor', count: 5, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 14) },
  { queryText: 'list prescriptions for diabetes', count: 4, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 16) },
  
  // General/Stats queries (varied frequency)
  { queryText: 'total number of employees', count: 12, lastUsed: new Date(Date.now() - 1000 * 60 * 20) },
  { queryText: 'show daily visit statistics', count: 7, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 9) },
  { queryText: 'count total patients', count: 6, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 11) },
  { queryText: 'monthly prescription trends', count: 3, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 18) },
  
  // Recent but low frequency queries
  { queryText: 'employees with blood group ab+', count: 2, lastUsed: new Date(Date.now() - 1000 * 60 * 2) }, // 2 min ago
  { queryText: 'show employees by age group', count: 1, lastUsed: new Date(Date.now() - 1000 * 60 * 1) }, // 1 min ago
  { queryText: 'list all family members', count: 3, lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 24) }, // 1 day ago
];

async function seedQueries() {
  try {
    console.log('\n🌱 Starting to seed AI query suggestions...');
    
    // Auto-clear and insert
    console.log('🗑️  Clearing existing demo queries...');
    await AIQuery.deleteMany({});
    
    // Insert demo queries
    console.log(`📝 Inserting ${demoQueries.length} demo queries...`);
    
    let inserted = 0;
    for (const query of demoQueries) {
      await AIQuery.create({
        queryText: query.queryText,
        count: query.count,
        lastUsed: query.lastUsed
      });
      inserted++;
      process.stdout.write(`\r   Progress: ${inserted}/${demoQueries.length}`);
    }
    
    console.log('\n✅ Successfully seeded AI query suggestions!');
    
    // Show summary
    const total = await AIQuery.countDocuments();
    const topQueries = await AIQuery.find()
      .sort({ count: -1 })
      .limit(5)
      .select('queryText count');
    
    console.log('\n📈 Summary:');
    console.log(`   Total queries in database: ${total}`);
    console.log('\n🔥 Top 5 frequent queries:');
    topQueries.forEach((q, i) => {
      console.log(`   ${i + 1}. "${q.queryText}" (${q.count}x)`);
    });
    
    console.log('\n💡 You can now see these suggestions in your AI Insights search bar!');
    console.log('   Just click on the search input or start typing.');
    
  } catch (error) {
    console.error('\n❌ Error seeding queries:', error.message);
    console.error('   Details:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

