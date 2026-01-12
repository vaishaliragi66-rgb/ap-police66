import React, { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const AIInsights = () => {
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Insights</h1>
        </div>

        {/* Query Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., List employees with blood group O+, Show diabetes patients by age..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={handleQuery}
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Ask AI'}
            </button>
          </div>

          {/* Sample Queries */}
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Sample queries:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'List all employees with blood group O+',
                'Show age distribution of diabetes patients',
                'Count prescriptions by medicine name',
                'Show family members with hypertension'
              ].map(sample => (
                <button
                  key={sample}
                  onClick={() => setQuery(sample)}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Controls */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📊 Table View
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'chart' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={results.chartType === 'none'}
                >
                  📈 Chart View
                </button>
              </div>

              <div className="flex gap-2">
                <span className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm">
                  ✓ {results.metadata.count} results
                </span>
                <button
                  onClick={downloadPDF}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  📥 Download PDF
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="mt-4">
              {viewMode === 'table' ? renderTable() : renderChart()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsights;