import React from 'react';

const DateRangeFilter = ({ fromDate, toDate, setFromDate, setToDate, onApply, disabled }) => {
  return (
    <div className="d-flex gap-2 align-items-end">
      <div>
        <label className="form-label" style={{ fontSize: 12 }}>From Date</label>
        <input type="date" className="form-control" value={fromDate || ''} onChange={(e) => setFromDate(e.target.value)} />
      </div>

      <div>
        <label className="form-label" style={{ fontSize: 12 }}>To Date</label>
        <input type="date" className="form-control" value={toDate || ''} onChange={(e) => setToDate(e.target.value)} />
      </div>

      <div>
        <button className="btn btn-sm btn-primary" style={{ height: 38 }} disabled={disabled} onClick={onApply}>Apply Filter</button>
      </div>
    </div>
  );
};

export default DateRangeFilter;
