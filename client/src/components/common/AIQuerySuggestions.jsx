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
      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
      style={{ top: '100%' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-600 uppercase">
          {loading ? 'Loading...' : 'Recent & Frequent Queries'}
        </span>
        {showClearButton && onClearHistory && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearHistory();
            }}
            className="text-xs text-red-500 hover:text-red-700 transition-colors"
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
        <ul className="py-1">
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.text}-${index}`}
              onClick={() => onSelect(suggestion.text)}
              className={`
                px-4 py-2.5 cursor-pointer transition-colors
                flex items-center justify-between
                ${
                  selectedIndex === index
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                }
              `}
            >
              <div className="flex items-start flex-1 min-w-0">
                {/* Icon */}
                <span className="mr-3 text-gray-400 flex-shrink-0 mt-0.5">
                  {/* {suggestion.count} */}
                </span>
                
                {/* Query Text */}
                <span className="text-sm text-gray-800 flex-1 truncate">
                  {suggestion.text}
                </span>
              </div>

              {/* Metadata */}
              <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                {suggestion.count > 1 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
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
