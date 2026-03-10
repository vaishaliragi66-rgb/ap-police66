import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const LedgerStore = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const instituteId = localStorage.getItem("instituteId");

  // Store type state
  const [storeType, setStoreType] = useState("MAIN");

  // Ledger data state
  const [mainStoreLedger, setMainStoreLedger] = useState([]); // Only OUT transactions
  const [subStoreLedger, setSubStoreLedger] = useState([]); // All transactions
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [summaryPage, setSummaryPage] = useState(1);
  const SUMMARY_ROWS = 5;


  // Filters
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [medicineFilter, setMedicineFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [expiryDateFilter, setExpiryDateFilter] = useState(""); // New expiry date filter
  const [directionFilter, setDirectionFilter] = useState("ALL"); // Only for Sub Store

  const formatDateDMY = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatExpiryDate = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}-${year}`;
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";
    return date.toLocaleString('en-IN');
  };

  const formatTime = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculate days until expiry
  const calculateDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Fetch all data
  useEffect(() => {
  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch COMPLETE ledger (no type filter)
      const ledgerRes = await axios.get(
          `http://localhost:${BACKEND_PORT}/ledger-api/institute/${instituteId}`
        );

      const fullLedger = ledgerRes.data.ledger || [];
      const mainLedger = fullLedger.filter((l) => {
          return (
            l.Transaction_Type === "MAINSTORE_ADD" ||
            (l.Transaction_Type === "SUBSTORE_ADD" && l.Direction === "OUT")||
            l.Transaction_Type === "STORE_TRANSFER"
          );
        });

        const subLedger = fullLedger.filter((l) => {
          return (
            (l.Transaction_Type === "SUBSTORE_ADD" && l.Direction === "IN") ||
            l.Transaction_Type === "PRESCRIPTION_ISSUE"
          );
        });

      setMainStoreLedger(mainLedger);
      setSubStoreLedger(subLedger);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchAllData();
}, [instituteId]);

  // Get current store ledger based on selection
  const currentStoreLedger = storeType === "MAIN" ? mainStoreLedger : subStoreLedger;

  // Filtered data - different logic for Main vs Sub Store
  const filteredLedger = useMemo(() => {
    return currentStoreLedger.filter((l) => {
      const txDate = new Date(l.Timestamp);
      if (typeFilter !== "ALL" && l.Transaction_Type !== typeFilter) {
        // Sub Store uses normal filtering
        return false;
      }

      // Direction filter only for Sub Store
      if (storeType === "SUB" && directionFilter !== "ALL" && l.Direction !== directionFilter)
        return false;

      if (
        medicineFilter &&
        !l.Medicine_Name.toLowerCase().includes(medicineFilter.toLowerCase())
      )
        return false;

      // Date filter (combined date and time)
      if (fromDate || toDate || fromTime || toTime) {
        const txDateTime = new Date(l.Timestamp);
        
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          if (fromTime) {
            const [hours, minutes] = fromTime.split(':').map(Number);
            from.setHours(hours || 0, minutes || 0, 0, 0);
          }
          if (txDateTime < from) return false;
        }
        
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          if (toTime) {
            const [hours, minutes] = toTime.split(':').map(Number);
            to.setHours(hours || 23, minutes || 59, 59, 999);
          }
          if (txDateTime > to) return false;
        }
      }

      // Expiry date filter - Show medicines expiring ON OR BEFORE the selected date
      if (expiryDateFilter && l.Expiry_Date) {
        const expiry = new Date(l.Expiry_Date);
        expiry.setHours(0, 0, 0, 0); // Set to start of day for comparison
        const filterDate = new Date(expiryDateFilter);
        filterDate.setHours(23, 59, 59, 999); // Set to end of day
        
        // Show medicines that expire ON OR BEFORE the filter date
        if (expiry > filterDate) return false;
      }

      return true;
    });
  }, [currentStoreLedger, storeType, typeFilter, directionFilter, medicineFilter, fromDate, toDate, fromTime, toTime, expiryDateFilter]);

  // Sort filtered ledger by expiry date (ascending - soonest to expire first)
  const sortedLedger = useMemo(() => {
  return [...filteredLedger].sort(
    (a, b) => new Date(b.Timestamp) - new Date(a.Timestamp)
  );
}, [filteredLedger]);

  // Calculate stock summary - different for Main vs Sub Store
  const stockSummary = useMemo(() => {
  const summary = {};

  currentStoreLedger.forEach((item) => {
    const medicineName = item.Medicine_Name;

    if (!summary[medicineName]) {
      summary[medicineName] = {
        totalIN: 0,
        totalOUT: 0,
        totalTransactions: 0,
        lastTransaction: item.Timestamp,
        expiryDate: item.Expiry_Date
      };
    }

    if (item.Direction === "IN") {
      summary[medicineName].totalIN += Math.abs(item.Quantity);
    }

    if (item.Direction === "OUT") {
      summary[medicineName].totalOUT += Math.abs(item.Quantity);
    }

    summary[medicineName].totalTransactions += 1;

    if (
      new Date(item.Timestamp) >
      new Date(summary[medicineName].lastTransaction)
    ) {
      summary[medicineName].lastTransaction = item.Timestamp;
    }
  });

  return summary;
}, [currentStoreLedger]);

  // -------- STOCK SUMMARY PAGINATION (ONLY FOR SUMMARY) --------
const summaryEntries = Object.entries(stockSummary);

const summaryStartIndex = (summaryPage - 1) * SUMMARY_ROWS;
const summaryEndIndex = summaryStartIndex + SUMMARY_ROWS;

const paginatedSummary = summaryEntries.slice(
  summaryStartIndex,
  summaryEndIndex
);

const summaryTotalPages = Math.ceil(summaryEntries.length / SUMMARY_ROWS);


  // Pagination calculations
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentLedger = sortedLedger.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedLedger.length / rowsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, directionFilter, medicineFilter, fromDate, toDate, fromTime, toTime, expiryDateFilter, storeType]);

  // Export functions
  const handlePrint = () => window.print();

const downloadCSV = () => {
  if (storeType === "MAIN") {
    // Main Store CSV - Removed Reference ID
    const headers = [
      "Date & Time",
      "Transaction Type",
      "Medicine",
      "Expiry Date",
      "Days Until Expiry",
      "Quantity OUT",
      "Balance After",
      "Destination",  // Removed Reference ID
      "Remarks"
    ];

    const rows = sortedLedger.map((l) => [
      formatDateTime(l.Timestamp),
      l.Transaction_Type,
      l.Medicine_Name,
      l.Expiry_Date ? formatExpiryDate(new Date(l.Expiry_Date)) : "-",
      l.Expiry_Date ? calculateDaysUntilExpiry(l.Expiry_Date) : "-",
      Math.abs(l.Quantity),
      Math.abs(l.Balance_After),
      "Sub Store",  // Removed Reference ID
      l.Remarks || "-"
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${x ?? ""}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `MAIN_Store_Transfer_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } else {
    // Sub Store CSV - Removed Reference ID
    const headers = [
      "Date & Time",
      "Transaction Type",
      "Direction",
      "Medicine",
      "Expiry Date",
      "Days Until Expiry",
      "Quantity",
      "Balance After",
      "Issued To",  // Removed Reference ID
      "Remarks"
    ];

    const rows = sortedLedger.map((l) => [
      formatDateTime(l.Timestamp),
      l.Transaction_Type,
      l.Direction,
      l.Medicine_Name,
      l.Expiry_Date ? formatExpiryDate(new Date(l.Expiry_Date)) : "-",
      l.Expiry_Date ? calculateDaysUntilExpiry(l.Expiry_Date) : "-",
      Math.abs(l.Quantity),
      Math.abs(l.Balance_After),
      l.Direction === "IN" ? "From Main Store" : getEmployeeInfoFromRef(l.Reference_ID).name,  // Removed Reference ID
      l.Remarks || "-"
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${x ?? ""}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `SUB_Store_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <strong className="ms-2">Loading ledger data...</strong>
      </div>
    );
  }

  return (
    <div className="container mt-4 ledger-page">
      {/* Store Type Selection */}
      <div className="card shadow mb-4">
        <div className="card-body text-center">
          <h5 className="mb-3">Store Management</h5>
          <div className="d-flex justify-content-center gap-3 mb-3">
            <button
              className={`btn ${storeType === "MAIN" ? "btn-dark" : "btn-outline-dark"} btn-lg`}
              onClick={() => {
                setStoreType("MAIN");
                setSummaryPage(1);
              }}

            >
              📦 Main Store
            </button>
            <button
              className={`btn ${storeType === "SUB" ? "btn-dark" : "btn-outline-dark"} btn-lg`}
              onClick={() => {
                setStoreType("SUB");
                setSummaryPage(1);
              }}
            >
              🏪 Sub Store
            </button>
          </div>
          <div className="text-center">
            <h6 className="mb-2">
              Currently viewing: <strong className="text-primary">{storeType} STORE</strong>
            </h6>
            <div className="d-flex justify-content-center gap-2 flex-wrap">

              <span className="badge bg-info">
                Total Medicines: {Object.keys(stockSummary).length}
              </span>

              <span className="badge bg-success">
                Total IN Transactions: {
                  currentStoreLedger.filter(l => l.Direction === "IN").length
                }
              </span>

              <span className="badge bg-danger">
                Total OUT Transactions: {
                  currentStoreLedger.filter(l => l.Direction === "OUT").length
                }
              </span>

              <span className="badge bg-secondary">
                Total Transactions: {currentStoreLedger.length}
              </span>

            </div>

          </div>
        </div>
      </div>

      {/* Stock Summary Card - Different for Main vs Sub */}
      <div className="card shadow mb-4">
        <div className="card-header bg-info text-white">
          <h6 className="mb-0">
            {storeType === "MAIN" 
              ? "📊 Main Store Stock Summary" 
              : "📊 Sub Store Stock Summary"}
          </h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Current Quantity</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Status</th>
                  <th>Last Transaction</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSummary.map(([medicine, data]) => {
                  const netQty = data.totalIN - data.totalOUT;
                  const daysLeft = calculateDaysUntilExpiry(data.expiryDate);

                  let status = "In Stock";
                  let statusClass = "bg-success";

                  if (netQty <= 0) {
                    status = "Out of Stock";
                    statusClass = "bg-danger";
                  }

                  if (daysLeft !== null && daysLeft < 0) {
                    status = "Expired";
                    statusClass = "bg-danger";
                  } else if (daysLeft !== null && daysLeft <= 7) {
                    status = "Near Expiry";
                    statusClass = "bg-warning";
                  }

                  return (
                    <tr key={medicine}>
                      <td><strong>{medicine}</strong></td>

                      <td>
                        <span className={`badge ${netQty > 0 ? "bg-primary" : "bg-danger"}`}>
                          {netQty} units
                        </span>
                      </td>

                      <td>
                        {data.expiryDate ? (
                          <span className="badge bg-info">
                            {formatExpiryDate(data.expiryDate)}
                          </span>
                        ) : "—"}
                      </td>

                      <td>
                        {data.expiryDate && daysLeft !== null ? (
                          <span className={`badge ${
                            daysLeft < 0
                              ? "bg-danger"
                              : daysLeft <= 7
                              ? "bg-warning"
                              : "bg-success"
                          }`}>
                            {daysLeft < 0
                              ? `${Math.abs(daysLeft)} days expired`
                              : `${daysLeft} days left`}
                          </span>
                        ) : "—"}
                      </td>

                      <td>
                        <span className={`badge ${statusClass}`}>
                          {status}
                        </span>
                      </td>

                      <td>{formatDateTime(data.lastTransaction)}</td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        </div>
      {/* Stock Summary Pagination */}
<div className="d-flex justify-content-center mt-1 mb-3">
  <button
    className="btn btn-sm btn-outline-dark me-2"
    disabled={summaryPage === 1}
    onClick={() => setSummaryPage(prev => prev - 1)}
  >
    Previous
  </button>

  <span className="align-self-center">
    Page {summaryPage} of {summaryTotalPages || 1}
  </span>

  <button
    className="btn btn-sm btn-outline-dark ms-2"
    disabled={
      summaryPage === summaryTotalPages || summaryTotalPages === 0
    }
    onClick={() => setSummaryPage(prev => prev + 1)}
  >
    Next
  </button>
</div>
      </div>

      {/* Ledger Card */}
      <div className="card shadow">
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              {storeType === "MAIN" 
                ? "📋 Main Store Ledger" 
                : "📋 Sub Store Ledger"}
            </h5>
            <small className="text-light">
              Institute ID: {instituteId} | 
              Showing {sortedLedger.length} of {currentStoreLedger.length} transactions
              {expiryDateFilter && ` | Expiring by: ${formatExpiryDate(expiryDateFilter)}`}
            </small>
          </div>
          <div>
            <button className="btn btn-light btn-sm me-2" onClick={handlePrint}>
              🖨 Print
            </button>
            <button className="btn btn-light btn-sm" onClick={downloadCSV}>
              ⬇ Export CSV
            </button>
          </div>
        </div>

        <div className="card-body">
          {/* FILTERS - Different for Main vs Sub */}
          <div className="row g-2 mb-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label mb-1">Transaction Type</label>
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">All Transactions</option>
                {storeType === "MAIN" ? (
                  <option value="STORE_TRANSFER">Store Transfer</option>
                ) : (
                  <>
                    <option value="MAINSTORE_ADD">Main Store Add</option>
                    <option value="STORE_TRANSFER">Store Transfer</option>
                    <option value="PRESCRIPTION_ISSUE">Prescription Issue</option>
                    <option value="SUBSTORE_ADD">Sub Store Add</option>
                  </>
                )}
              </select>
            </div>

            {storeType === "SUB" && (
              <div className="col-md-2">
                <label className="form-label mb-1">Direction</label>
                <select
                  className="form-select"
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value)}
                >
                  <option value="ALL">All (IN/OUT)</option>
                  <option value="IN">IN Only</option>
                  <option value="OUT">OUT Only</option>
                </select>
              </div>
            )}

            <div className="col-md-2">
              <label className="form-label mb-1">Medicine Name</label>
              <input
                className="form-control"
                placeholder="Search medicine"
                value={medicineFilter}
                onChange={(e) => setMedicineFilter(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label mb-1">Expiry By Date</label>
              <div className="input-group">
                <input
                  type="month"
                  className="form-control"
                  value={expiryDateFilter}
                  onChange={(e) => {
                    // Convert month format (YYYY-MM) to date format with day 1
                    if (e.target.value) {
                      setExpiryDateFilter(e.target.value + "-01");
                    } else {
                      setExpiryDateFilter("");
                    }
                  }}
                  title="Show medicines expiring ON OR BEFORE this month"
                />
              </div>
              {expiryDateFilter && (
                <button
                  className="btn btn-outline-secondary btn-sm mt-1"
                  type="button"
                  onClick={() => setExpiryDateFilter("")}
                  title="Clear expiry filter"
                >
                  Clear
                </button>
              )}
              <small className="text-muted d-block mt-1">Shows medicines expiring by end of this month</small>
            </div>
          </div>

          {/* Date and Time Filters */}
          <div className="row g-2 mb-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label mb-1">From Date</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label mb-1">From Time</label>
              <input
                type="time"
                className="form-control"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label mb-1">To Date</label>
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label mb-1">To Time</label>
              <input
                type="time"
                className="form-control"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label mb-1">&nbsp;</label>
              <button 
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => {
                  setTypeFilter("ALL");
                  setDirectionFilter("ALL");
                  setMedicineFilter("");
                  setFromDate("");
                  setToDate("");
                  setFromTime("");
                  setToTime("");
                  setExpiryDateFilter("");
                }}
              >
                🔄 Clear All
              </button>
            </div>
          </div>

          {/* Rows per page selector */}
          <div className="d-flex justify-content-between mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold text-muted">Rows per page:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: "80px" }}
                value={rowsPerPage}
                onChange={handleRowsChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold text-muted">
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>
          </div>

          {/* TABLE - Different columns for Main vs Sub Store */}
<div className="table-responsive">
  <table className="table table-bordered table-hover align-middle">
    <thead className="table-dark">
      <tr>
        <th>S.No</th>
        <th>Date & Time</th>
        <th>Transaction Type</th>
        <th>Direction</th>
        <th>Medicine</th>
        <th>Expiry Date</th>
        <th>Days Left</th>
        <th>Quantity</th>
        <th>Balance After</th>
        <th>
          {storeType === "MAIN" 
            ? "Destination" 
            : storeType === "SUB" ? "Issued To" : ""}
        </th>
        <th>Remarks</th> {/* Removed Reference ID column */}
      </tr>
    </thead>
    <tbody>
      {sortedLedger.length === 0 ? (
        <tr>
          <td colSpan={storeType === "MAIN" ? "11" : "12"} className="text-center py-4">
            {/* Updated colspan */}
            <div className="text-muted">
              {storeType === "MAIN" 
                ? "📭 No STORE_TRANSFER transactions found for Main Store" 
                : "📭 No transactions found for Sub Store"}
              {(medicineFilter || fromDate || toDate || expiryDateFilter) ? " with current filters" : ""}
            </div>
          </td>
        </tr>
      ) : (
        currentLedger.map((l, i) => {
          
          const daysLeft = calculateDaysUntilExpiry(l.Expiry_Date);
          const isExpired = daysLeft !== null && daysLeft < 0;
          const isNearExpiry = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0;
          
          return (
            <tr key={i}>
              <td>{indexOfFirstRow + i + 1}</td>
              <td>
                <div>{formatDateTime(l.Timestamp)}</div>
                <small className="text-muted">{formatTime(l.Timestamp)}</small>
              </td>
              <td>
                <span className={`badge ${
                  l.Transaction_Type === 'STORE_TRANSFER' ? 'bg-warning' :
                  l.Transaction_Type === 'PRESCRIPTION_ISSUE' ? 'bg-danger' :
                  'bg-info'
                }`}>
                  {l.Transaction_Type}
                </span>
              </td>
              
              <td>
                <span
                  className={`badge ${
                    l.Direction === "IN"
                      ? "bg-success"
                      : l.Direction === "OUT"
                      ? "bg-danger"
                      : "bg-secondary"
                  }`}
                >
                  {l.Direction || "—"}
                </span>
              </td>
              <td><strong>{l.Medicine_Name}</strong></td>
              <td>
                {l.Expiry_Date ? (
                  <div>
                    <span className={`badge ${
                      isExpired ? 'bg-danger' :
                      isNearExpiry ? 'bg-warning' : 'bg-success'
                    }`}>
                      {formatExpiryDate(l.Expiry_Date)}
                    </span>
                  </div>
                ) : "—"}
              </td>
              <td>
                {l.Expiry_Date && daysLeft !== null ? (
                  <span className={`badge ${
                    isExpired ? 'bg-danger' :
                    isNearExpiry ? 'bg-warning' : 'bg-success'
                  }`}>
                    {isExpired 
                      ? `Expired ${Math.abs(daysLeft)} days ago`
                      : `${daysLeft} days left`}
                  </span>
                ) : "—"}
              </td>
              <td>
                <span className={`badge ${
                  l.Direction === 'OUT' || storeType === 'MAIN' ? 'bg-danger' : 'bg-success'
                }`}>
                  {Math.abs(l.Quantity)} units
                </span>
              </td>
              <td>
                <span className={`badge ${
                  l.Balance_After >= 0 ? 'bg-primary' : 'bg-warning'
                }`}>
                  {Math.abs(l.Balance_After)} units
                </span>
              </td>
              <td>
                {storeType === "MAIN" ? (
                  <span className="badge bg-info">
                    {l.Transaction_Type === "MAINSTORE_ADD"
                      ? "Main Store"
                      : l.Direction === "OUT"
                      ? "Sub Store"
                      : "—"}
                  </span>
                ) : storeType === "SUB" && l.Direction === "IN" ? (
                  <span className="badge bg-success">
                    From Main Store
                  </span>
                ) : (
                      <span className="badge bg-secondary">
                        Issued
                      </span>
                    )
                    }
              </td>
              {/* Removed Reference ID cell */}
              <td>
                <small className="text-muted">{l.Remarks || "—"}</small>
              </td>
            </tr>
          );
        })
      )}
    </tbody>
  </table>
</div>
          {/* Pagination */}
          <div className="d-flex justify-content-center align-items-center gap-2 py-4">
            <button
              className="btn btn-outline-dark btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Previous
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                className={`btn btn-sm ${
                  currentPage === i + 1 ? "btn-dark" : "btn-outline-dark"
                }`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            <button
              className="btn btn-outline-dark btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LedgerStore;