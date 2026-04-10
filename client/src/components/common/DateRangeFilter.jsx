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
    <div className="d-flex gap-2 align-items-end">
      <div>
        <label className="form-label" style={{ fontSize: 12 }}>From Date</label>
        <input type="date" max={today} className="form-control" value={fromDate || ''} onChange={(e) => setFromDate(e.target.value)} />
      </div>

      <div>
        <label className="form-label" style={{ fontSize: 12 }}>To Date</label>
        <input type="date" max={today} className="form-control" value={toDate || ''} onChange={(e) => setToDate(e.target.value)} />
      </div>

      <div>
        <button className="btn btn-sm btn-primary" style={{ height: 38 }} disabled={disabled} onClick={handleApply}>Apply Filter</button>
      </div>
    </div>
  );
};

export default DateRangeFilter;
