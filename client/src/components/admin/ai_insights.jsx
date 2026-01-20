import React, { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const AIInsights2 = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'

  // Get institute ID from localStorage (adjust based on your auth system)
  const getInstituteId = () => {
    const instituteData = localStorage.getItem('institute');
    if (instituteData) {
      try {
        const parsed = JSON.parse(instituteData);
        return parsed._id || parsed.id;
      } catch (e) {
        console.error('Failed to parse institute data:', e);
      }
    }
    return null;
  };

  const handleQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const instituteId = getInstituteId();
      
      const response = await fetch('http://localhost:6100/ai-api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userQuery: query,
          instituteId: instituteId 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Query failed');
      }

      setResults(data);

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
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
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="form-control"
                  placeholder="e.g. List employees with blood group O+, Count low stock medicines"
                  disabled={loading}
                  style={{ height: "44px" }}
                />
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