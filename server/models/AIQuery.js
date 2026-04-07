const mongoose = require('mongoose');

const normalizeInstituteId = (instituteId) => {
  if (!instituteId) {
    return null;
  }

  if (instituteId instanceof mongoose.Types.ObjectId) {
    return instituteId;
  }

  if (typeof instituteId === 'string' && mongoose.Types.ObjectId.isValid(instituteId)) {
    return new mongoose.Types.ObjectId(instituteId);
  }

  return null;
};

const aiQuerySchema = new mongoose.Schema(
  {
    queryText: {
      type: String,
      required: true,
      trim: true,
      index: true // Index for faster searches
    },
    count: {
      type: Number,
      default: 1,
      min: 1
    },
    lastUsed: {
      type: Date,
      default: Date.now,
      index: true // Index for sorting by recency
    },
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: false // Optional - some queries might be global
    },
    userId: {
      type: String,
      required: false // Optional - track user if needed
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt automatically
  }
);

// Compound index for efficient queries
aiQuerySchema.index({ queryText: 1, instituteId: 1 });
aiQuerySchema.index({ count: -1 }); // For frequent queries
aiQuerySchema.index({ lastUsed: -1 }); // For recent queries

// Static method to track/update query
aiQuerySchema.statics.trackQuery = async function(queryText, instituteId = null, userId = null) {
  try {
    const normalizedQuery = queryText.trim().toLowerCase();
    const normalizedInstituteId = normalizeInstituteId(instituteId);
    
    if (!normalizedQuery) {
      return null;
    }

    // Build filter - match both query text and instituteId
    const filter = { 
      queryText: normalizedQuery,
      instituteId: normalizedInstituteId
    };

    // Update existing or create new
    const result = await this.findOneAndUpdate(
      filter,
      {
        $inc: { count: 1 },
        $set: { 
          lastUsed: new Date(),
          ...(userId && { userId })
        },
        $setOnInsert: {
          queryText: normalizedQuery,
          instituteId: normalizedInstituteId
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return result;
  } catch (error) {
    console.error('Error tracking query:', {
      queryText,
      instituteId,
      error: error.message
    });
    return null;
  }
};

// Static method to get suggestions
aiQuerySchema.statics.getSuggestions = async function(searchText = '', instituteId = null, limit = 10) {
  try {
    const filter = {};
    const normalizedInstituteId = normalizeInstituteId(instituteId);
    
    // Add instituteId filter if provided
    if (normalizedInstituteId) {
      filter.$or = [
        { instituteId: normalizedInstituteId },
        { instituteId: null } // Include global queries
      ];
    }

    // If search text provided, filter by regex
    if (searchText && searchText.trim()) {
      filter.queryText = { 
        $regex: searchText.trim(), 
        $options: 'i' 
      };
      
      // Return matching queries sorted by relevance (count * recency)
      const results = await this.find(filter)
        .select('queryText count lastUsed')
        .sort({ count: -1, lastUsed: -1 })
        .limit(limit)
        .lean();
      
      return results;
    }

    // No search text - return recent and frequent queries
    const [recent, frequent] = await Promise.all([
      // Top 5 most recent queries
      this.find(filter)
        .select('queryText count lastUsed')
        .sort({ lastUsed: -1 })
        .limit(5)
        .lean(),
      
      // Top 5 most frequent queries
      this.find(filter)
        .select('queryText count lastUsed')
        .sort({ count: -1, lastUsed: -1 })
        .limit(5)
        .lean()
    ]);

    // Combine and deduplicate
    const seen = new Set();
    const combined = [];
    
    [...recent, ...frequent].forEach(query => {
      if (!seen.has(query.queryText)) {
        seen.add(query.queryText);
        combined.push(query);
      }
    });

    return combined.slice(0, limit);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
};

// Optional: Clean up old/unused queries (keep only top 1000)
aiQuerySchema.statics.cleanupOldQueries = async function() {
  try {
    // Get the 1000th most popular query's count
    const queries = await this.find()
      .sort({ count: -1, lastUsed: -1 })
      .limit(1000)
      .select('count');
    
    if (queries.length === 1000) {
      const minCount = queries[999].count;
      
      // Delete queries with lower count
      await this.deleteMany({
        count: { $lt: minCount }
      });
      
      console.log('✅ Cleaned up old AI queries');
    }
  } catch (error) {
    console.error('Error cleaning up queries:', error);
  }
};

const AIQuery = mongoose.model('AIQuery', aiQuerySchema);

module.exports = AIQuery;
