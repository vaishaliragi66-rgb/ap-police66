import React, { useMemo } from 'react';

const DateRangeFilter = ({ fromDate, toDate, setFromDate, setToDate, onApply, disabled }) => {
  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const handleApply = () => {
    if (fromDate && toDate && fromDate > toDate) {
      alert('From date cannot be later than To date');
      return;
    }
    // ensure no future dates
    if ((fromDate && fromDate > today) || (toDate && toDate > today)) {
      alert('Future dates are not allowed');
      return;
    }
    onApply && onApply();
  };

  return (
    <div className="d-flex gap-2 align-items-end flex-wrap">
      <div>
        <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>From Date</label>
        <input
          type="date"
          max={today}
          className="form-control"
          value={fromDate || ''}
          onChange={(e) => setFromDate(e.target.value)}
          style={{
            minHeight: 44,
            borderRadius: 14,
            border: "1px solid rgba(191,219,254,0.75)",
            background: "rgba(248,250,252,0.96)",
            boxShadow: "0 10px 20px rgba(148,163,184,0.08)",
          }}
        />
      </div>

      <div>
        <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>To Date</label>
        <input
          type="date"
          max={today}
          className="form-control"
          value={toDate || ''}
          onChange={(e) => setToDate(e.target.value)}
          style={{
            minHeight: 44,
            borderRadius: 14,
            border: "1px solid rgba(191,219,254,0.75)",
            background: "rgba(248,250,252,0.96)",
            boxShadow: "0 10px 20px rgba(148,163,184,0.08)",
          }}
        />
      </div>

      <div>
        <button
          className="btn btn-sm"
          style={{
            height: 44,
            borderRadius: 14,
            padding: "0 18px",
            background: "linear-gradient(135deg, #2563EB, #38BDF8)",
            color: "#fff",
            fontWeight: 600,
            border: "none",
            boxShadow: "0 14px 24px rgba(96,165,250,0.24)",
            whiteSpace: "nowrap",
          }}
          disabled={disabled}
          onClick={handleApply}
        >
          Apply Filter
        </button>
      </div>
    </div>
  );
};

export default DateRangeFilter;
