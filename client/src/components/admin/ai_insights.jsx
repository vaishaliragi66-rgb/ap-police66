import React, { useState, useRef, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAIQuerySuggestions } from '../../hooks/useAIQuerySuggestions';
import AIQuerySuggestions from '../common/AIQuerySuggestions';
// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const AIInsights2 = () => {
  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL ||
    `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5200}`;
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredDemoSuggestions, setFilteredDemoSuggestions] = useState([]);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Get institute ID from localStorage (adjust based on your auth system)
  const getInstituteId = () => {
    const instituteData = localStorage.getItem('institute');
    if (instituteData) {
      try {
        const parsed = JSON.parse(instituteData);
        return parsed._id || parsed.id || localStorage.getItem('instituteId');
      } catch (e) {
        console.error('Failed to parse institute data:', e);
      }
    }
    return localStorage.getItem('instituteId');
  };

  // Fallback demo suggestions (shown when backend has no data)
  const [demoSuggestions] = useState([
    { text: 'list employees with blood group o+', count: 25, lastUsed: new Date() },
    { text: 'show diabetes patients by age', count: 22, lastUsed: new Date() },
    { text: 'count medicines with low stock', count: 20, lastUsed: new Date() },
    { text: 'show all employees by designation', count: 18, lastUsed: new Date() },
    { text: 'list medicines expiring soon', count: 17, lastUsed: new Date() },
    { text: 'count patients with hypertension', count: 16, lastUsed: new Date() },
    { text: 'count employees by blood group', count: 15, lastUsed: new Date() },
    { text: 'list all diabetes patients', count: 14, lastUsed: new Date() },
    { text: 'show medicine inventory by name', count: 13, lastUsed: new Date() },
    { text: 'total number of employees', count: 12, lastUsed: new Date() },
  ]);

  // Initialize AI query suggestions hook
  const instituteId = getInstituteId();
  const {
    suggestions: backendSuggestions,
    loading: suggestionsLoading,
    selectedIndex,
    fetchSuggestions,
    debouncedFetch,
    clearHistory,
    handleKeyDown,
    setSuggestions
  } = useAIQuerySuggestions(BACKEND_URL, instituteId);

  // Use backend suggestions if available, otherwise use demo suggestions (filtered)
  const suggestions = backendSuggestions.length > 0 
    ? backendSuggestions 
    : (filteredDemoSuggestions.length > 0 ? filteredDemoSuggestions : demoSuggestions);

  // Load initial suggestions on mount
  useEffect(() => {
    fetchSuggestions('');
  }, [fetchSuggestions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const instituteId = getInstituteId();
      
      const response = await fetch(`${BACKEND_URL}/ai-api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userQuery: query,
          instituteId: instituteId 
        })
      });

      const raw = await response.text();
      let data = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || 'Server returned an invalid response' };
      }

      if (!response.ok) {
        throw new Error(data.error || 'Query failed');
      }

      setResults(data);
      fetchSuggestions(query);

      // Auto-select view mode
      if (data.chartType && data.chartType !== 'none') {
        setViewMode('chart');
      } else {
        setViewMode('table');
      }

    } catch (err) {
      setError(err.message);
      console.error('Query error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    // Handle keyboard navigation in suggestions
    const navigationHandled = handleKeyDown(e, query, handleSuggestionSelect);
    
    if (!navigationHandled && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Show suggestions
    setShowSuggestions(true);
    
    // Filter demo suggestions in real-time for instant feedback
    if (value.trim()) {
      const filtered = demoSuggestions.filter(s => 
        s.text.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredDemoSuggestions(filtered);
    } else {
      setFilteredDemoSuggestions([]);
    }
    
    // Also fetch from backend (debounced)
    debouncedFetch(value);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
    setFilteredDemoSuggestions([]);
    if (backendSuggestions.length === 0) {
      fetchSuggestions('');
    }
  };

  const handleSuggestionSelect = (suggestionText) => {
    setQuery(suggestionText);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Auto-execute the query
    setTimeout(() => {
      inputRef.current?.blur();
      // Trigger query with the selected suggestion
      const executeQuery = async () => {
        setLoading(true);
        setError(null);

        try {
          const instituteId = getInstituteId();
          
          const response = await fetch(`${BACKEND_URL}/ai-api/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userQuery: suggestionText,
              instituteId: instituteId 
            })
          });

          const raw = await response.text();
          let data = {};

          try {
            data = raw ? JSON.parse(raw) : {};
          } catch {
            data = { error: raw || 'Server returned an invalid response' };
          }

          if (!response.ok) {
            throw new Error(data.error || 'Query failed');
          }

          setResults(data);
          fetchSuggestions(suggestionText);

          if (data.chartType && data.chartType !== 'none') {
            setViewMode('chart');
          } else {
            setViewMode('table');
          }

        } catch (err) {
          setError(err.message);
          console.error('Query error:', err);
        } finally {
          setLoading(false);
        }
      };
      
      executeQuery();
    }, 100);
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear your query history?')) {
      await clearHistory();
      setShowSuggestions(false);
    }
  };

  const downloadPDF = () => {
    if (!results || !results.results) return;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('AI Insights Report', 14, 20);
    
    // Query
    doc.setFontSize(12);
    doc.text(`Query: ${query}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);
    doc.text(`Results: ${results.metadata.count} records`, 14, 44);

    // Table
    if (results.results.length > 0) {
      const columns = Object.keys(results.results[0]).map(key => ({
        header: key,
        dataKey: key
      }));

      const rows = results.results.map(row => {
        const formatted = {};
        Object.keys(row).forEach(key => {
          formatted[key] = String(row[key]);
        });
        return formatted;
      });

      autoTable(doc, {
        startY: 50,
        columns,
        body: rows,
        headStyles: { fillColor: [66, 139, 202] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { top: 50 }
      });
    }

    doc.save(`insights_${Date.now()}.pdf`);
  };

  const renderChart = () => {
    if (!results || !results.chartConfig || results.chartType === 'none') {
      return <div className="text-gray-500 text-center py-8">No chart available for this query</div>;
    }

    const { xField, yField, title } = results.chartConfig;
    
    const chartData = {
      labels: results.results.map(item => String(item[xField] || item._id)),
      datasets: [{
        label: yField,
        data: results.results.map(item => item[yField] || item.count || 0),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      }]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: title || 'Data Visualization' }
      }
    };

    switch (results.chartType) {
      case 'bar':
        return <Bar data={chartData} options={options} />;
      case 'line':
        return <Line data={chartData} options={options} />;
      case 'pie':
        return <Pie data={chartData} options={options} />;
      default:
        return <Bar data={chartData} options={options} />;
    }
  };

  const renderTable = () => {
    if (!results || !results.results || results.results.length === 0) {
      return <div className="text-gray-500 text-center py-8">No data found</div>;
    }

    const columns = Object.keys(results.results[0]);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-700">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.results.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col} className="px-4 py-2 border-b text-sm text-gray-600">
                    {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        padding: "30px 0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="container">
  
        {/* HEADER */}
        <div
          className="card border-0 mb-4"
          style={{
            borderRadius: "14px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
          }}
        >
          <div className="card-body">
            <h3 className="fw-bold mb-1 text-dark">AI Insights</h3>
            <p className="text-muted mb-0">
              Ask questions and visualize medical & inventory data
            </p>
          </div>
        </div>
  
        {/* QUERY INPUT */}
        <div
          className="card border-0 mb-4"
          style={{
            borderRadius: "14px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
          }}
        >
          <div className="card-body">
            <div className="row g-2 align-items-center">
              <div className="col-md-9">
                <div className="position-relative" ref={wrapperRef}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyPress}
                    className="form-control"
                    placeholder="e.g. List employees with blood group O+, Count low stock medicines"
                    disabled={loading}
                    style={{ height: "44px" }}
                  />
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <AIQuerySuggestions
                      suggestions={suggestions}
                      loading={suggestionsLoading}
                      selectedIndex={selectedIndex}
                      onSelect={handleSuggestionSelect}
                      onClearHistory={handleClearHistory}
                      showClearButton={true}
                    />
                  )}
                </div>
              </div>
  
              <div className="col-md-3 d-grid">
                <button
                  className="btn"
                  onClick={handleQuery}
                  disabled={loading || !query.trim()}
                  style={{
                    height: "44px",
                    backgroundColor: "#4A70A9",
                    color: "#fff",
                    fontWeight: 500,
                  }}
                >
                  {loading ? "Processing..." : "Ask AI"}
                </button>
              </div>
            </div>
  
            {/* SAMPLE QUERIES */}
            <div className="mt-3">
              <small className="text-muted">Quick examples:</small>
              <div className="d-flex flex-wrap gap-2 mt-2">
                {[
                  "List employees with blood group O+",
                  "Show diabetes patients by age",
                  "Count medicines with low stock",
                  "Family members with hypertension",
                ].map((q) => (
                  <button
                    key={q}
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setQuery(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
  
        {/* ERROR */}
        {error && (
          <div className="alert alert-danger">
            ❌ {error}
          </div>
        )}
  
        {/* RESULTS */}
        {results && (
          <div
            className="card border-0"
            style={{
              borderRadius: "14px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
            }}
          >
            <div className="card-body">
  
              {/* CONTROLS */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="btn-group">
                  <button
                    className={`btn ${
                      viewMode === "table"
                        ? "btn-primary"
                        : "btn-outline-primary"
                    }`}
                    onClick={() => setViewMode("table")}
                  >
                    Table View
                  </button>
  
                  <button
                    className={`btn ${
                      viewMode === "chart"
                        ? "btn-primary"
                        : "btn-outline-primary"
                    }`}
                    disabled={results.chartType === "none"}
                    onClick={() => setViewMode("chart")}
                  >
                    Chart View
                  </button>
                </div>
  
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-success">
                    {results.metadata.count} Records
                  </span>
  
                  <button
                    className="btn btn-outline-success btn-sm"
                    onClick={downloadPDF}
                  >
                    Download PDF
                  </button>
                </div>
              </div>
  
              {/* CONTENT */}
              <div className="mt-3">
                {viewMode === "table" ? renderTable() : renderChart()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
};

export default AIInsights2;
