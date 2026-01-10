import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

/* ---------- DATE FORMAT ---------- */
const formatDateDMY = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return "—";
  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${d.getFullYear()}`;
};

/* ---------- DAYS FROM TODAY ---------- */
const daysFromToday = (value) => {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(value);
  d.setHours(0, 0, 0, 0);

  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
};

function InstituteInventory() {
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;
  const [inventory, setInventory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [instituteName, setInstituteName] = useState("");

  /* ---------- FILTER STATES ---------- */
  const [searchMedicine, setSearchMedicine] = useState("");
  const [quantityFilter, setQuantityFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [thresholdFilter, setThresholdFilter] = useState("");

  /* ---------- FETCH INSTITUTE & INVENTORY ---------- */
  useEffect(() => {
    const fetchInstituteAndInventory = async () => {
      try {
        const storedInstitute = localStorage.getItem("institute");
        if (!storedInstitute) return;

        const institute = JSON.parse(storedInstitute);
        const instituteId = institute._id;
        
        setInstituteName(institute.Institute_Name || "Institute");

        const token = localStorage.getItem("token");

const res = await axios.get(
  `http://localhost:${BACKEND_PORT_NO}/institute-api/inventory/${instituteId}`,
 
);




setInventory(res.data || []);

        
      } catch (error) {
        console.error("Error fetching data:", error);
        setInventory([]);
      }
    };

    fetchInstituteAndInventory();
  }, [BACKEND_PORT_NO]);

  /* ---------- CHECK IF ANY FILTER IS ACTIVE ---------- */
  const hasActiveFilters = () => {
    return searchMedicine || quantityFilter !== "" || expiryFilter || statusFilter || thresholdFilter;
  };

  /* ---------- CLEAR ALL FILTERS ---------- */
  const clearAllFilters = () => {
    setSearchMedicine("");
    setQuantityFilter("");
    setExpiryFilter("");
    setStatusFilter("");
    setThresholdFilter("");
    setCurrentPage(1);
  };

  /* ---------- PRINT FUNCTION ---------- */
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const printDate = new Date().toLocaleDateString('en-GB');
    const activeFilters = getActiveFilters();
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${instituteName} - Inventory Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .success { background-color: #d4edda; color: #155724; }
            .danger { background-color: #f8d7da; color: #721c24; }
            .warning { background-color: #fff3cd; color: #856404; }
            .summary { margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>${instituteName} - Inventory Report</h1>
          <p><strong>Generated on:</strong> ${printDate}</p>
          ${activeFilters.length > 0 ? `<p><strong>Filters Applied:</strong> ${activeFilters.join(", ")}</p>` : ''}
          <hr>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Medicine Name</th>
                <th>Code</th>
                <th>Quantity</th>
                <th>Threshold</th>
                <th>Expiry Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${sortedInventory.map((row, index) => {
                const daysLeft = daysFromToday(row.Expiry_Date);
                let status = "Normal";
                let statusClass = "success";
                let statusIcon = "✅";
                const threshold = row.Threshold_Qty || 0;
                const currentStock = row.Quantity || 0;

                if (daysLeft !== null && daysLeft < 0) {
                  status = "Expired";
                  statusClass = "danger";
                  statusIcon = "⛔";
                } else if (daysLeft !== null && daysLeft <= 5) {
                  status = "Near Expiry";
                  statusClass = "warning";
                  statusIcon = "⏰";
                } else if (currentStock < threshold) {
                  status = "Low Stock";
                  statusClass = "warning";
                  statusIcon = "⚠️";
                }

                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${row.Medicine_Name || '—'}</td>
                    <td>${row.Medicine_Code || '—'}</td>
                    <td>${currentStock}</td>
                    <td>${threshold}</td>
                    <td>${row.Expiry_Date ? formatDateDMY(row.Expiry_Date) : "—"}</td>
                    <td><span class="badge ${statusClass}">${statusIcon} ${status}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <h3>Summary</h3>
            <p><strong>Total Medicines:</strong> ${sortedInventory.length}</p>
            <p><strong>Expired Items:</strong> ${sortedInventory.filter(item => daysFromToday(item.Expiry_Date) < 0).length}</p>
            <p><strong>Near Expiry (≤5 days):</strong> ${sortedInventory.filter(item => {
              const days = daysFromToday(item.Expiry_Date);
              return days >= 0 && days <= 5;
            }).length}</p>
            <p><strong>Low Stock Items:</strong> ${sortedInventory.filter(item => item.Quantity < (item.Threshold_Qty || 0)).length}</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  /* ---------- GET ACTIVE FILTERS ---------- */
  const getActiveFilters = () => {
    const filters = [];
    if (searchMedicine) filters.push(`Search: "${searchMedicine}"`);
    if (quantityFilter !== "") filters.push(`Qty ≤ ${quantityFilter}`);
    if (expiryFilter) filters.push(`Expiry ≤ ${expiryFilter}`);
    if (statusFilter) {
      const statusLabels = {
        "EXPIRED": "Expired",
        "NEAR_EXPIRY": "Near Expiry", 
        "NORMAL": "Normal",
        "LOW_STOCK": "Low Stock"
      };
      filters.push(`Status: ${statusLabels[statusFilter] || statusFilter}`);
    }
    if (thresholdFilter) {
      const thresholdLabels = {
        "BELOW_THRESHOLD": "Below Threshold",
        "AT_THRESHOLD": "At Threshold",
        "ABOVE_THRESHOLD": "Above Threshold",
        "VERY_LOW": "Very Low (<25%)",
        "CRITICAL": "Critical (<10%)"
      };
      filters.push(`Threshold: ${thresholdLabels[thresholdFilter] || thresholdFilter}`);
    }
    return filters;
  };

  /* ---------- FILTER LOGIC ---------- */
  const filteredInventory = inventory.filter((item) => {
    const daysLeft = daysFromToday(item.Expiry_Date);

    if (searchMedicine &&
        !item.Medicine_Name?.toLowerCase().includes(searchMedicine.toLowerCase())) {
      return false;
    }

    if (quantityFilter !== "") {
      const limit = Number(quantityFilter);
      if (!Number.isFinite(limit)) return true;
      if (Number(item.Quantity) > limit) return false;
    }

    if (expiryFilter) {
      const limitDate = new Date(expiryFilter);
      limitDate.setHours(23, 59, 59, 999);
      if (new Date(item.Expiry_Date) > limitDate) return false;
    }

    if (statusFilter) {
      if (statusFilter === "EXPIRED" && !(daysLeft < 0)) return false;
      if (statusFilter === "NEAR_EXPIRY" && !(daysLeft >= 0 && daysLeft <= 5)) return false;
      if (statusFilter === "LOW_STOCK" && !(item.Quantity < (item.Threshold_Qty || 0))) return false;
      
      if (statusFilter === "NORMAL") {
        const isNormal = daysLeft >= 0 && 
                        daysLeft > 5 && 
                        item.Quantity >= (item.Threshold_Qty || 0);
        if (!isNormal) return false;
      }
    }

    if (thresholdFilter) {
      const threshold = item.Threshold_Qty || 0;
      const currentStock = item.Quantity || 0;
      
      switch (thresholdFilter) {
        case "BELOW_THRESHOLD":
          if (currentStock >= threshold) return false;
          break;
        case "AT_THRESHOLD":
          if (currentStock !== threshold) return false;
          break;
        case "ABOVE_THRESHOLD":
          if (currentStock <= threshold) return false;
          break;
        case "VERY_LOW":
          if (currentStock >= (threshold * 0.25)) return false;
          break;
        case "CRITICAL":
          if (currentStock >= (threshold * 0.10)) return false;
          break;
        default:
          break;
      }
    }

    return true;
  });

  /* ---------- SORT ---------- */
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    const daysA = daysFromToday(a.Expiry_Date) || 9999;
    const daysB = daysFromToday(b.Expiry_Date) || 9999;
    return daysA - daysB;
  });

  /* ---------- PAGINATION ---------- */
  const indexOfLastRow = currentPage * rowsPerPage;
  const currentInventory = sortedInventory.slice(
    indexOfLastRow - rowsPerPage,
    indexOfLastRow
  );
  const totalPages = Math.ceil(sortedInventory.length / rowsPerPage);

  /* ---------- GET STATUS SUMMARY ---------- */
  const getStatusSummary = () => {
    const summary = {
      total: inventory.length,
      expired: 0,
      nearExpiry: 0,
      lowStock: 0,
      normal: 0
    };

    inventory.forEach(item => {
      const daysLeft = daysFromToday(item.Expiry_Date);
      
      if (daysLeft < 0) {
        summary.expired++;
      } else if (daysLeft <= 5) {
        summary.nearExpiry++;
      } else if (item.Quantity < (item.Threshold_Qty || 0)) {
        summary.lowStock++;
      } else {
        summary.normal++;
      }
    });

    return summary;
  };

  const statusSummary = getStatusSummary();

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Institute Inventory</h2>
        
        <div className="d-flex gap-2">
          {/* PRINT BUTTON */}
          <button 
            className="btn btn-outline-dark d-flex align-items-center gap-2"
            onClick={handlePrint}
            disabled={sortedInventory.length === 0}
          >
            <i className="bi bi-printer"></i> Print
          </button>
        </div>
      </div>

      {/* FILTERS SUMMARY WITH CLEAR BUTTON */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="flex-grow-1">
          {hasActiveFilters() && (
            <div className="alert alert-info mb-0">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Active Filters:</strong> {getActiveFilters().join(", ")}
                </div>
                <small className="ms-3">
                  Showing {sortedInventory.length} of {inventory.length} medicines
                </small>
              </div>
            </div>
          )}
        </div>
        
        {/* SEPARATE CLEAR FILTERS BUTTON - ALWAYS VISIBLE */}
        <div className="ms-3">
          <button 
            className="btn btn-outline-secondary d-flex align-items-center gap-2"
            onClick={clearAllFilters}
            disabled={!hasActiveFilters()}
            title={hasActiveFilters() ? "Clear all filters" : "No filters to clear"}
          >
            <i className="bi bi-x-circle"></i> Clear Filters
          </button>
        </div>
      </div>

      {/* STATUS SUMMARY CARDS */}
      <div className="row mb-4">
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-primary">
            <div className="card-body text-center">
              <h5 className="card-title text-primary">{statusSummary.total}</h5>
              <p className="card-text text-muted">Total Medicines</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-danger">
            <div className="card-body text-center">
              <h5 className="card-title text-danger">{statusSummary.expired}</h5>
              <p className="card-text text-muted">Expired</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-warning">
            <div className="card-body text-center">
              <h5 className="card-title text-warning">{statusSummary.nearExpiry}</h5>
              <p className="card-text text-muted">Near Expiry</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-success">
            <div className="card-body text-center">
              <h5 className="card-title text-success">{statusSummary.normal}</h5>
              <p className="card-text text-muted">Normal</p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= FILTERS ================= */}
      <div className="card mb-4">
        <div className="card-body">
          <h6 className="card-title mb-3">Filters</h6>
          <div className="row g-3">
            <div className="col-md-3 col-sm-6">
              <label className="form-label">Search Medicine</label>
              <input
                type="text"
                className="form-control"
                placeholder="Medicine name..."
                value={searchMedicine}
                onChange={(e) => {
                  setSearchMedicine(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            
            <div className="col-md-2 col-sm-6">
              <label className="form-label">Quantity ≤</label>
              <input
                type="number"
                className="form-control"
                placeholder="Max quantity"
                value={quantityFilter}
                onChange={(e) => {
                  setQuantityFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            
            <div className="col-md-2 col-sm-6">
              <label className="form-label">Expiry ≤</label>
              <input
                type="date"
                className="form-control"
                value={expiryFilter}
                onChange={(e) => {
                  setExpiryFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            
            <div className="col-md-2 col-sm-6">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Status</option>
                <option value="EXPIRED">❌ Expired</option>
                <option value="NEAR_EXPIRY">⏰ Near Expiry</option>
                <option value="NORMAL">✔ Normal</option>
                <option value="LOW_STOCK">⚠️ Low Stock</option>
              </select>
            </div>
            
            <div className="col-md-3 col-sm-6">
              <label className="form-label">Threshold Status</label>
              <select
                className="form-select"
                value={thresholdFilter}
                onChange={(e) => {
                  setThresholdFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Threshold Status</option>
                <option value="BELOW_THRESHOLD">⚠️ Below Threshold</option>
                <option value="AT_THRESHOLD">⚖️ At Threshold</option>
                <option value="ABOVE_THRESHOLD">✅ Above Threshold</option>
                <option value="VERY_LOW">🔴 Very Low (&lt;25%)</option>
                <option value="CRITICAL">💀 Critical (&lt;10%)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="card">
        <div className="card-body">
          {sortedInventory.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">
                {hasActiveFilters() 
                  ? "No medicines found matching the filters" 
                  : "No medicines found in inventory"}
              </p>
              {hasActiveFilters() && (
                <button className="btn btn-link" onClick={clearAllFilters}>
                  Clear filters to see all medicines
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover table-bordered">
                  <thead className="table-dark">
                    <tr>
                      <th>#</th>
                      <th>Medicine Name</th>
                      <th>Code</th>
                      <th>Quantity</th>
                      <th>Threshold</th>
                      <th>Expiry Date</th>
                      <th>Days Left</th>
                      <th>Status</th>
                      <th>Store</th>

                    </tr>
                  </thead>
                  <tbody>
                    {currentInventory.map((row, index) => {
                      const daysLeft = daysFromToday(row.Expiry_Date);
                      let status = "Normal";
                      let statusClass = "badge bg-success";
                      let statusIcon = "✅";
                      const threshold = row.Threshold_Qty || 0;
                      const currentStock = row.Quantity || 0;

                      if (daysLeft !== null && daysLeft < 0) {
                        status = "Expired";
                        statusClass = "badge bg-danger";
                        statusIcon = "⛔";
                      } else if (daysLeft !== null && daysLeft <= 5) {
                        status = "Near Expiry";
                        statusClass = "badge bg-warning text-dark";
                        statusIcon = "⏰";
                      } else if (currentStock < threshold) {
                        status = "Low Stock";
                        statusClass = "badge bg-warning";
                        statusIcon = "⚠️";
                        
                        if (currentStock < (threshold * 0.25)) {
                          status = "Very Low";
                          statusClass = "badge bg-danger";
                          statusIcon = "🔴";
                        }
                        if (currentStock < (threshold * 0.10)) {
                          status = "Critical";
                          statusClass = "badge bg-dark";
                          statusIcon = "💀";
                        }
                      }

                      return (
                        <tr key={index}>
                          <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                          <td>{row.Medicine_Name}</td>
                          <td>{row.Medicine_Code}</td>
                          <td>{currentStock}</td>
                          <td>{threshold}</td>
                          <td>{row.Expiry_Date ? formatDateDMY(row.Expiry_Date) : "—"}</td>
                          <td>
                            {daysLeft !== null ? (
                              <span className={daysLeft < 0 ? "text-danger" : daysLeft <= 5 ? "text-warning" : "text-success"}>
                                {daysLeft} days
                              </span>
                            ) : "—"}
                          </td>
                          <td>
                            <span className={`${statusClass} d-flex align-items-center gap-1`}>
                              <span>{statusIcon}</span>
                              <span>{status}</span>
                            </span>
                          </td>
                          <td>
  <span
    className={`badge ${
      row.Store_Type === "MAIN_STORE"
        ? "bg-primary"
        : "bg-secondary"
    }`}
  >
    {row.Store_Type === "MAIN_STORE"
      ? "Main Store"
      : "Sub Store"}
  </span>
</td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div>
                  <select
                    className="form-select form-select-sm w-auto"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
                
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted">
                    Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, sortedInventory.length)} of {sortedInventory.length} items
                  </span>
                  
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(1)}>
                          « First
                        </button>
                      </li>
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                          ‹ Prev
                        </button>
                      </li>
                      
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return pageNum <= totalPages ? (
                          <li key={i} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(pageNum)}>
                              {pageNum}
                            </button>
                          </li>
                        ) : null;
                      })}
                      
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                          Next ›
                        </button>
                      </li>
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(totalPages)}>
                          Last »
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstituteInventory;