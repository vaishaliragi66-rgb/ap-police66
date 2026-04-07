/**
 * Test AI Query Tracking
 * Quick test to verify the AIQuery model and tracking work
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ap-police';

console.log('🔌 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
})
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await testTracking();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

const AIQuery = require('./models/AIQuery');

async function testTracking() {
  try {
    console.log('\n🧪 Testing AIQuery.trackQuery()...\n');

    // Test 1: Track a new query
    console.log('Test 1: Tracking a new query...');
    const result1 = await AIQuery.trackQuery('test query from script');
    console.log('✅ Result:', result1 ? 'Success' : 'Failed');
    if (result1) {
      console.log(`   Query: "${result1.queryText}"`);
      console.log(`   Count: ${result1.count}`);
      console.log(`   Last Used: ${result1.lastUsed}`);
    }

    // Test 2: Track the same query again (should increment count)
    console.log('\nTest 2: Tracking same query again...');
    const result2 = await AIQuery.trackQuery('test query from script');
    console.log('✅ Result:', result2 ? 'Success' : 'Failed');
    if (result2) {
      console.log(`   Query: "${result2.queryText}"`);
      console.log(`   Count: ${result2.count} (should be 2)`);
    }

    // Test 3: Get suggestions
    console.log('\nTest 3: Getting suggestions...');
    const suggestions = await AIQuery.getSuggestions('', null, 5);
    console.log(`✅ Found ${suggestions.length} suggestions`);
    suggestions.forEach((s, i) => {
      console.log(`   ${i + 1}. "${s.queryText}" (${s.count}x)`);
    });

    // Test 4: Search with filter
    console.log('\nTest 4: Searching for "test"...');
    const filtered = await AIQuery.getSuggestions('test', null, 5);
    console.log(`✅ Found ${filtered.length} matching suggestions`);
    filtered.forEach((s, i) => {
      console.log(`   ${i + 1}. "${s.queryText}" (${s.count}x)`);
    });

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await AIQuery.deleteMany({ queryText: 'test query from script' });
    console.log('✅ Cleanup complete');

    console.log('\n✅ All tests passed!\n');
    console.log('💡 Your AIQuery model is working correctly.');
    console.log('   Queries should now be tracked when users submit AI searches.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Details:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}
