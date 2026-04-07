# AI Query Suggestions Feature

This feature provides Google-style autocomplete suggestions for the AI Insights search bar, showing recent and frequently asked questions to improve user experience.

## 📁 Files Created/Modified

### Backend (Node.js + Express + MongoDB)

1. **`server/models/AIQuery.js`**
   - Mongoose schema for tracking queries
   - Fields: `queryText`, `count`, `lastUsed`, `instituteId`, `userId`
   - Static methods:
     - `trackQuery()` - Store/update query
     - `getSuggestions()` - Get suggestions based on search text
     - `cleanupOldQueries()` - Optional cleanup (top 1000)

2. **`server/apis/ai_query_suggestions_api.js`**
   - Routes for query suggestions
   - Endpoints:
     - `GET /api/ai-queries/suggestions?q=<text>&instituteId=<id>` - Get suggestions
     - `POST /api/ai-queries/track` - Track a query
     - `DELETE /api/ai-queries/clear` - Clear history
     - `GET /api/ai-queries/stats` - Get query statistics

3. **`server/apis/ai_query_api.js`** (Modified)
   - Added `AIQuery` import
   - Added query tracking after successful query execution

4. **`server/server.js`** (Modified)
   - Registered new API route: `/api/ai-queries`

### Frontend (React)

1. **`client/src/hooks/useAIQuerySuggestions.js`**
   - Custom React hook for suggestions
   - Features:
     - Debounced search (300ms)
     - Fetch suggestions
     - Track queries
     - Clear history
     - Keyboard navigation (↑/↓/Enter/Esc)

2. **`client/src/components/common/AIQuerySuggestions.jsx`**
   - Reusable dropdown component
   - Features:
     - Shows recent queries (🕐 icon)
     - Shows frequent queries (🔥 icon for count > 5)
     - Displays usage count and relative time
     - Keyboard navigation hints
     - Clear history button

3. **`client/src/components/institutes/AIInsights.jsx`** (Modified)
   - Integrated suggestions hook and component
   - Auto-fetch suggestions on focus/input
   - Auto-execute query when suggestion is clicked

4. **`client/src/components/admin/ai_insights.jsx`** (Modified)
   - Same integration as institutes version

## 🚀 How to Use

### Backend Setup

1. The schema and routes are already registered
2. Queries are automatically tracked when users submit them via the AI search
3. No additional setup required

### Frontend Usage

The suggestions will automatically appear when:
- User focuses on the search input
- User starts typing

**Keyboard Navigation:**
- `↑` / `↓` - Navigate through suggestions
- `Enter` - Select highlighted suggestion
- `Esc` - Close suggestions

**Clicking:**
- Click any suggestion to auto-fill and execute the query

## 📊 API Endpoints

### GET `/api/ai-queries/suggestions`
Get query suggestions

**Query Parameters:**
- `q` (optional) - Search text
- `instituteId` (optional) - Filter by institute
- `limit` (default: 10) - Max results

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "text": "list employees with blood group O+",
      "count": 15,
      "lastUsed": "2026-04-07T07:00:00.000Z"
    }
  ]
}
```

### POST `/api/ai-queries/track`
Track a query (auto-called after successful query)

**Body:**
```json
{
  "queryText": "list employees with blood group O+",
  "instituteId": "60d5ec49f1b2c72b8c8e4f1a",
  "userId": "optional-user-id"
}
```

### DELETE `/api/ai-queries/clear`
Clear query history

**Query Parameters:**
- `instituteId` (optional) - Clear only for specific institute

### GET `/api/ai-queries/stats`
Get query statistics

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalQueries": 150,
    "uniqueQueries": 45,
    "topQueries": [...]
  }
}
```

## 🎨 UI Features

1. **Dropdown Appearance:**
   - Appears below search input
   - Clean white background with shadow
   - Scrollable (max height: 96px)

2. **Suggestion Items:**
   - Icon indicating recent (🕐) or frequent (🔥)
   - Query text (truncated if long)
   - Usage count badge (e.g., "15x")
   - Relative time (e.g., "2m ago", "1h ago")

3. **Hover/Selection:**
   - Blue highlight on hover
   - Blue left border for keyboard-selected item
   - Smooth transitions

4. **Clear History:**
   - Button in dropdown header
   - Confirmation dialog before clearing

## 🔧 Customization

### Change Debounce Time
Edit `client/src/hooks/useAIQuerySuggestions.js`:
```javascript
debounceTimer.current = setTimeout(() => {
  fetchSuggestions(searchText);
}, 300); // Change to desired milliseconds
```

### Change Max Stored Queries
Edit `server/models/AIQuery.js`:
```javascript
const queries = await this.find()
  .sort({ count: -1, lastUsed: -1 })
  .limit(1000) // Change to desired limit
  .select('count');
```

### Change Suggestion Limit
Edit API call in frontend:
```javascript
params.append('limit', '10'); // Change to desired limit
```

## 🧪 Testing

### Test Suggestions API
```bash
# Get suggestions
curl http://localhost:5200/api/ai-queries/suggestions

# Get suggestions with search
curl "http://localhost:5200/api/ai-queries/suggestions?q=blood"

# Track a query
curl -X POST http://localhost:5200/api/ai-queries/track \
  -H "Content-Type: application/json" \
  -d '{"queryText":"list employees with blood group O+"}'

# Get stats
curl http://localhost:5200/api/ai-queries/stats
```

### Test Frontend
1. Open AI Insights page
2. Click on the search input - suggestions should appear
3. Type a query - suggestions should filter
4. Use arrow keys to navigate
5. Press Enter or click to select

## 📝 Notes

- Queries are normalized to lowercase for better matching
- Suggestions combine recent (by `lastUsed`) and frequent (by `count`)
- Duplicate suggestions are removed
- Institute-specific filtering is supported
- Queries are tracked asynchronously (doesn't block main query)

## 🐛 Troubleshooting

**Suggestions not appearing?**
- Check browser console for errors
- Verify backend is running and `/api/ai-queries/suggestions` endpoint is accessible
- Check if there are any tracked queries in the database

**Queries not being tracked?**
- Check server logs for tracking errors
- Verify MongoDB connection is active
- Ensure `AIQuery` model is properly imported

**Keyboard navigation not working?**
- Ensure `handleKeyDown` is properly called in `onKeyDown` handler
- Check if `suggestions` array has items
