import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for AI query suggestions
 * Provides debounced search, fetching, and keyboard navigation
 */
export const useAIQuerySuggestions = (backendUrl, instituteId = null) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceTimer = useRef(null);

  /**
   * Fetch suggestions from backend
   */
  const fetchSuggestions = useCallback(async (searchText = '') => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchText) params.append('q', searchText);
      if (instituteId) params.append('instituteId', instituteId);
      params.append('limit', '10');

      const response = await fetch(
        `${backendUrl}/api/ai-queries/suggestions?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, instituteId]);

  /**
   * Debounced search
   */
  const debouncedFetch = useCallback((searchText) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(searchText);
    }, 300); // 300ms debounce
  }, [fetchSuggestions]);

  /**
   * Track query when user submits
   */
  const trackQuery = useCallback(async (queryText) => {
    try {
      const response = await fetch(`${backendUrl}/api/ai-queries/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryText,
          instituteId
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false || data.tracked === false) {
        throw new Error(data.error || 'Failed to track query');
      }

      await fetchSuggestions(queryText);
      return data;
    } catch (error) {
      console.error('Error tracking query:', error);
      return null;
    }
  }, [backendUrl, instituteId, fetchSuggestions]);

  /**
   * Clear history
   */
  const clearHistory = useCallback(async () => {
    try {
      const params = instituteId ? `?instituteId=${instituteId}` : '';
      await fetch(`${backendUrl}/api/ai-queries/clear${params}`, {
        method: 'DELETE'
      });
      setSuggestions([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }, [backendUrl, instituteId]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((e, currentValue, onSelect) => {
    if (suggestions.length === 0) return false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        return true;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        return true;
      
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          onSelect(suggestions[selectedIndex].text);
          setSuggestions([]);
          setSelectedIndex(-1);
          return true;
        }
        break;
      
      case 'Escape':
        setSuggestions([]);
        setSelectedIndex(-1);
        return true;
      
      default:
        break;
    }
    
    return false;
  }, [suggestions, selectedIndex]);

  /**
   * Reset selected index when suggestions change
   */
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  /**
   * Cleanup debounce timer
   */
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    suggestions,
    loading,
    selectedIndex,
    fetchSuggestions,
    debouncedFetch,
    trackQuery,
    clearHistory,
    handleKeyDown,
    setSuggestions
  };
};
