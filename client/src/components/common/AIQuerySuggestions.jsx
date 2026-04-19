import React from 'react';

/**
 * AI Query Suggestions Dropdown Component
 * Displays recent and frequently asked questions
 */
const AIQuerySuggestions = ({
  suggestions = [],
  loading = false,
  selectedIndex = -1,
  onSelect,
  onClearHistory,
  showClearButton = true
}) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      className="absolute z-50 w-full mt-2 max-h-96 overflow-y-auto"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        zIndex: 2140,
        isolation: "isolate",
        overscrollBehavior: "contain",
        background: "rgba(255,255,255,0.86)",
        border: "1px solid rgba(255,255,255,0.92)",
        borderRadius: "20px",
        boxShadow: "0 24px 44px rgba(148,184,255,0.2)",
        backdropFilter: "blur(20px)",
        maxHeight: '24rem',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: "linear-gradient(135deg, rgba(239,246,255,0.92), rgba(255,255,255,0.82))",
          borderBottom: "1px solid rgba(191,219,254,0.7)",
        }}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "#2563EB" }}>
          {loading ? 'Loading...' : 'Recent & Frequent Queries'}
        </span>
        {showClearButton && onClearHistory && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearHistory();
            }}
            className="text-xs transition-colors"
            style={{ color: "#EF4444", fontWeight: 600 }}
          >
            Clear History
          </button>
        )}
      </div>

      {/* Suggestions List */}
      {loading ? (
        <div className="px-4 py-3 text-sm text-gray-500 text-center">
          Loading suggestions...
        </div>
      ) : (
        <ul className="py-2">
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.text}-${index}`}
              onClick={() => onSelect(suggestion.text)}
              className="px-4 py-3 cursor-pointer transition-all duration-300 flex items-center justify-between"
              style={{
                background:
                  selectedIndex === index
                    ? "linear-gradient(135deg, rgba(219,234,254,0.9), rgba(255,255,255,0.78))"
                    : "transparent",
                borderLeft:
                  selectedIndex === index
                    ? "4px solid #3B82F6"
                    : "4px solid transparent",
              }}
            >
              <div className="flex items-start flex-1 min-w-0">
                {/* Icon */}
                <span
                  className="mr-3 flex-shrink-0 mt-0.5"
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "999px",
                    background: "linear-gradient(135deg, #DBEAFE, #FFFFFF)",
                    color: "#2563EB",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    boxShadow: "0 10px 18px rgba(191,219,254,0.18)",
                  }}
                >
                  {/* {suggestion.count} */}
                  AI
                </span>
                
                {/* Query Text */}
                <span className="text-sm flex-1 truncate" style={{ color: "#0F172A" }}>
                  {suggestion.text}
                </span>
              </div>

              {/* Metadata */}
              <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                {suggestion.count > 1 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "linear-gradient(135deg, #DBEAFE, #EFF6FF)",
                      color: "#1D4ED8",
                      fontWeight: 600,
                    }}
                  >
                    {suggestion.count}x
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {formatRelativeTime(suggestion.lastUsed)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Footer Hint */}
      {/* <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <span className="flex items-center gap-2">
          <span>💡 Use</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">↑</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">↓</kbd>
          <span>to navigate,</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Enter</kbd>
          <span>to select</span>
        </span>
      </div> */}
    </div>
  );
};

/**
 * Format relative time (e.g., "2m ago", "1h ago")
 */
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

export default AIQuerySuggestions;
