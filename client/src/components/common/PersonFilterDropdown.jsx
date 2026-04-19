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
      <label className="form-label fw-semibold mb-1" style={{ color: "#475569", fontSize: 12 }}>
        Filter by Person
      </label>
      <div className="d-flex align-items-center gap-2">
        <select
          className="form-select"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={loading}
          style={{
            minHeight: 44,
            borderRadius: 14,
            border: "1px solid rgba(191,219,254,0.75)",
            background: "rgba(248,250,252,0.96)",
            boxShadow: "0 10px 20px rgba(148,163,184,0.08)",
          }}
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
