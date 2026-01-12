const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Groq = require('groq-sdk');
const { schemaDefinitions } = require('../utils/schemaExtractor');

// Initialize Groq (works with or without API key)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || undefined
});

console.log('🤖 Using Groq AI');
console.log('🔑 API Key:', process.env.GROQ_API_KEY ? 'Provided ✅' : 'Using free tier ✅');

// Validate query to ensure READ-ONLY operations
function validateQuery(query) {
  const queryStr = JSON.stringify(query).toLowerCase();
  
  // Block any write operations
  const dangerousOps = [
    'insert', 'update', 'delete', 'remove', 'drop',
    'save', 'create', 'replace', '$where', 'eval'
  ];
  
  for (const op of dangerousOps) {
    if (queryStr.includes(op)) {
      throw new Error(`Operation '${op}' is not allowed. Only READ operations permitted.`);
    }
  }
  
  return true;
}

// NEW: Preprocess casual queries into structured questions
async function preprocessQuery(userQuery) {
  console.log('🔄 Preprocessing casual query...');
  
  const preprocessPrompt = `You are a query translator. Convert casual questions into clear, structured database queries.

User's casual question: "${userQuery}"

Convert this into a clear, structured question that specifies:
- What data to retrieve (employees, patients, diseases, prescriptions, etc.)
- What filters to apply (blood group, age, disease name, etc.)
- What grouping or aggregation is needed (count, list, distribution, etc.)

Examples:
Casual: "which age group has high diabetes?"
Structured: "Show the count of diabetes patients grouped by age ranges (0-20, 20-40, 40-60, 60-80, 80+)"

Casual: "show me O+ blood people"
Structured: "List all employees with blood group O+"

Casual: "who has sugar problem"
Structured: "List all patients with diabetes disease"

Casual: "how many got BP medicine"
Structured: "Count prescriptions containing hypertension or blood pressure medicines"

Now convert this casual query into a structured one:
Casual: "${userQuery}"
Structured:`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a query translator. Respond with ONLY the structured query, nothing else."
        },
        {
          role: "user",
          content: preprocessPrompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 200,
    });

    const structuredQuery = chatCompletion.choices[0].message.content.trim();
    console.log('✅ Structured query:', structuredQuery);
    return structuredQuery;
    
  } catch (error) {
    console.warn('⚠️ Query preprocessing failed, using original query');
    return userQuery; // Fallback to original
  }
}
// Main query endpoint
router.post('/query', async (req, res) => {
  try {
const { userQuery, instituteId } = req.body;

if (!userQuery) {
  return res.status(400).json({ error: 'Query is required' });
}

console.log('📝 Received query:', userQuery);
console.log('🏥 Institute ID:', instituteId);

// Step 1: Create prompt
const prompt = `You are a MongoDB query generator...
Available Collections and Schemas:
${JSON.stringify(schemaDefinitions, null, 2)}

User Query: "${userQuery}"

IMPORTANT RULES:
1. Return ONLY valid JSON (no markdown, no explanations, no preamble)
2. Use MongoDB aggregate pipeline when joining collections
3. 3. For Institute-specific data, you MAY filter by Institute_ID: "${instituteId}" only if it makes sense for the query. For counting prescriptions by medicine name, you don't need Institute filtering.
4. Use ObjectId references correctly
5. Return in this exact format:
{
  "collection": "CollectionName",
  "operation": "find" or "aggregate",
  "query": {} or [],
  "projection": {},
  "chartType": "bar|line|pie|none",
  "chartConfig": {
    "xField": "field_for_x_axis",
    "yField": "field_for_y_axis",
    "title": "Chart Title"
  }
}

Examples:

Query: "List all employees with blood group O+"
Response:
{
  "collection": "Employee",
  "operation": "find",
  "query": { "Blood_Group": "O+" },
  "projection": { "Name": 1, "ABS_NO": 1, "Blood_Group": 1, "Designation": 1 },
  "chartType": "none"
}

Query: "Count prescriptions by medicine name"
Response:
{
  "collection": "Prescription",
  "operation": "aggregate",
  "query": [
    { "$unwind": "$Medicines" },
    { "$group": { 
        "_id": "$Medicines.Medicine_Name", 
        "count": { "$sum": 1 }
    }},
    { "$sort": { "count": -1 } },
    { "$limit": 10 }
  ],
  "projection": {},
  "chartType": "pie",
  "chartConfig": {
    "xField": "_id",
    "yField": "count",
    "title": "Prescriptions by Medicine Name"
  }
}

Query: "Show age distribution of diabetes patients"
Response:
{
  "collection": "Disease",
  "operation": "aggregate",
  "query": [
    { "$match": { "Disease_Name": { "$regex": "diabetes", "$options": "i" }, "Institute_ID": ObjectId("${instituteId}") } },
    { "$lookup": { "from": "employees", "localField": "Employee_ID", "foreignField": "_id", "as": "employee" } },
    { "$unwind": "$employee" },
    { "$project": { 
        "age": { "$subtract": [ { "$year": new Date() }, { "$year": "$employee.DOB" } ] },
        "name": "$employee.Name"
    }},
    { "$bucket": {
        "groupBy": "$age",
        "boundaries": [0, 20, 40, 60, 80, 100],
        "default": "Other",
        "output": { "count": { "$sum": 1 } }
    }}
  ],
  "projection": {},
  "chartType": "bar",
  "chartConfig": {
    "xField": "_id",
    "yField": "count",
    "title": "Age Distribution of Diabetes Patients"
  }
}

Now generate the query for: "${userQuery}"

Remember: Return ONLY the JSON object, no other text.`;

    // Step 2: Call Groq AI
    console.log('🤖 Calling Groq AI...');
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 2048,
    });

    let aiResponse = chatCompletion.choices[0].message.content;
    console.log('📥 AI Response:', aiResponse);

    // Clean up response (remove markdown if present)
// Clean up response (remove markdown and extra text)
// Clean up response (remove markdown and extra text)
aiResponse = aiResponse
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .replace(/^[^{]*/g, '') // Remove anything before first {
  .replace(/[^}]*$/g, '') // Remove anything after last }
  .trim();

console.log('🧹 Cleaned response:', aiResponse);

// Convert MongoDB shell syntax to valid JSON
aiResponse = aiResponse
  .replace(/ObjectId\("([^"]+)"\)/g, '"$1"') // ObjectId("xxx") -> "xxx"
  .replace(/new Date\(\)/g, '"$$NOW"') // new Date() -> "$$NOW" (MongoDB operator)
  .replace(/ISODate\("([^"]+)"\)/g, '"$1"'); // ISODate("xxx") -> "xxx"

console.log('🔧 Converted MongoDB syntax:', aiResponse);
    // Step 3: Parse the query
    let mongoQueryObject;
    // Step 3: Parse the query
try {
  mongoQueryObject = JSON.parse(aiResponse);
  console.log('✅ Parsed MongoDB Query:', JSON.stringify(mongoQueryObject, null, 2));
}catch (parseError) {
      console.error('❌ Failed to parse AI response:', aiResponse);
      return res.status(500).json({ 
        error: 'AI generated invalid query format',
        details: aiResponse 
      });
    }
    // Step 3.5: Convert string ObjectIds back to proper ObjectId objects
// Step 3.5: Convert string ObjectIds and handle nested structures
function convertObjectIds(obj) {
  // Handle strings - check if it's an ObjectId
  if (typeof obj === 'string') {
    if (/^[0-9a-fA-F]{24}$/.test(obj)) {
      return new mongoose.Types.ObjectId(obj);
    }
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectIds(item));
  }
  
  // Handle objects
  if (obj !== null && typeof obj === 'object') {
    // Check if it's already an ObjectId instance
    if (obj instanceof mongoose.Types.ObjectId) {
      return obj;
    }
    
    // Check if it's a {$oid: "..."} structure (from some conversions)
    if (obj.$oid && typeof obj.$oid === 'string') {
      return new mongoose.Types.ObjectId(obj.$oid);
    }
    
    // Check if it has _bsontype (already a proper ObjectId)
    if (obj._bsontype === 'ObjectId') {
      return obj;
    }
    
    // Recursively convert all properties
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      // Special handling for _id fields
      if (key === '_id' || key.endsWith('_ID') || key.endsWith('_id')) {
        if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
          converted[key] = new mongoose.Types.ObjectId(value);
        } else {
          converted[key] = convertObjectIds(value);
        }
      } else {
        converted[key] = convertObjectIds(value);
      }
    }
    return converted;
  }
  
  return obj;
}

// Convert ObjectIds in the query
if (mongoQueryObject.query) {
  mongoQueryObject.query = convertObjectIds(mongoQueryObject.query);
}

console.log('✅ Final MongoDB Query:', JSON.stringify(mongoQueryObject, null, 2));

// Convert ObjectIds in the query
if (mongoQueryObject.query) {
  mongoQueryObject.query = convertObjectIds(mongoQueryObject.query);
}

console.log('✅ Final MongoDB Query with ObjectIds:', JSON.stringify(mongoQueryObject, null, 2));

    // Step 4: Validate query
    validateQuery(mongoQueryObject);

    // Step 5: Execute query on MongoDB
    const { collection, operation, query, projection, chartType, chartConfig } = mongoQueryObject;

    console.log('🔍 Executing on collection:', collection);

    const Collection = mongoose.connection.collection(collection.toLowerCase() + 's');

let results;
try {
  if (operation === 'aggregate') {
    console.log('📊 Running aggregation pipeline...');
    results = await Collection.aggregate(query).toArray();
  } else {
    console.log('🔍 Running find query...');
    results = await Collection.find(query, { projection }).toArray();
  }
} catch (dbError) {
  console.error('❌ MongoDB execution error:', dbError);
  return res.status(500).json({
    error: 'Database query execution failed',
    details: dbError.message,
    query: mongoQueryObject
  });
}

    console.log('✅ Query executed successfully. Results count:', results.length);

    // Step 6: Return results
    res.json({
      success: true,
      results,
      chartType: chartType || 'none',
      chartConfig: chartConfig || null,
      metadata: {
        count: results.length,
        collection,
        operation
      }
    });

  } catch (error) {
    console.error('❌ AI Query Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process query',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'AI Query API is running with Groq' });
});

module.exports = router;