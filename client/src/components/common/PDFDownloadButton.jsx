import React, { useState } from 'react';

const PDFDownloadButton = ({ modulePath, params = {}, filenamePrefix = 'report', label = 'Download PDF' }) => {
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5200}`;

  const handleDownload = async () => {
    try {
      setLoading(true);
      const url = new URL(`${BACKEND_URL}/${modulePath}/download-pdf`);
      Object.keys(params || {}).forEach(k => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') url.searchParams.append(k, params[k]);
      });

      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Download failed');
      }

      const blob = await res.blob();
      const dlUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `${filenamePrefix}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(dlUrl);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="btn btn-sm btn-outline-primary"
      onClick={handleDownload}
      disabled={loading}
      style={{ height: 38, whiteSpace: 'nowrap' }}
    >
      {label}
    </button>
  );
};

export default PDFDownloadButton;
