const express = require('express');
const router = express.Router();
const AIQuery = require('../models/AIQuery');

/**
 * GET /api/ai-queries/suggestions
 * Get query suggestions based on search text
 * Query params:
 *   - q: search text (optional)
 *   - instituteId: filter by institute (optional)
 *   - limit: max results (default: 10)
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q = '', instituteId, limit = 10 } = req.query;
    
    const suggestions = await AIQuery.getSuggestions(
      q,
      instituteId,
      parseInt(limit)
    );

    res.json({
      success: true,
      suggestions: suggestions.map(s => ({
        text: s.queryText,
        count: s.count,
        lastUsed: s.lastUsed
      }))
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suggestions',
      message: error.message
    });
  }
});

/**
 * POST /api/ai-queries/track
 * Track a query (increment count, update lastUsed)
 * Body: { queryText, instituteId?, userId? }
 */
router.post('/track', async (req, res) => {
  try {
    const { queryText, instituteId, userId } = req.body;

    if (!queryText || !queryText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'queryText is required'
      });
    }

    const result = await AIQuery.trackQuery(queryText, instituteId, userId);

    if (!result) {
      return res.status(500).json({
        success: false,
        error: 'Failed to persist query'
      });
    }

    res.json({
      success: true,
      tracked: true,
      query: {
        text: result.queryText,
        count: result.count,
        lastUsed: result.lastUsed,
        instituteId: result.instituteId || null
      }
    });
  } catch (error) {
    console.error('Error tracking query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track query',
      message: error.message
    });
  }
});

/**
 * DELETE /api/ai-queries/clear
 * Clear query history (optional - for user privacy)
 * Query params: instituteId (optional - clear only for specific institute)
 */
router.delete('/clear', async (req, res) => {
  try {
    const { instituteId } = req.query;

    const filter = instituteId ? { instituteId } : {};
    const result = await AIQuery.deleteMany(filter);

    res.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing queries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear queries',
      message: error.message
    });
  }
});

/**
 * GET /api/ai-queries/stats
 * Get statistics about queries
 */
router.get('/stats', async (req, res) => {
  try {
    const { instituteId } = req.query;
    const filter = instituteId ? { instituteId } : {};

    const [totalQueries, uniqueQueries, topQueries] = await Promise.all([
      AIQuery.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ]),
      AIQuery.countDocuments(filter),
      AIQuery.find(filter)
        .select('queryText count lastUsed')
        .sort({ count: -1 })
        .limit(10)
        .lean()
    ]);

    res.json({
      success: true,
      stats: {
        totalQueries: totalQueries[0]?.total || 0,
        uniqueQueries,
        topQueries: topQueries.map(q => ({
          text: q.queryText,
          count: q.count,
          lastUsed: q.lastUsed
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

module.exports = router;
