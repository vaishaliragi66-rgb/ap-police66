import React from "react";

const PersonFilterDropdown = ({
  options = [],
  value = "self",
  onChange,
  loading = false,
  className = "",
}) => {
  return (
    <div className={className}>
      <label className="form-label fw-semibold mb-1">Filter by Person</label>
      <div className="d-flex align-items-center gap-2">
        <select
          className="form-select"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={loading}
        >
          {options.map((opt) => (
            <option key={opt.id} value={opt.id} disabled={Boolean(opt.disabled)}>
              {opt.label}
            </option>
          ))}
        </select>
        {loading && <div className="spinner-border spinner-border-sm text-secondary" role="status" />}
      </div>
    </div>
  );
};

export default PersonFilterDropdown;
