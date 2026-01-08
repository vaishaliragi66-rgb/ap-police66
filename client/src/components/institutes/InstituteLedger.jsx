import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const LedgerStore = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const instituteId = localStorage.getItem("instituteId");

  // Store type state
  const [storeType, setStoreType] = useState("MAIN");

  // Ledger data state
  const [mainStoreLedger, setMainStoreLedger] = useState([]);
  const [subStoreLedger, setSubStoreLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [medicineFilter, setMedicineFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const formatDateDMY = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";
    return date.toLocaleString('en-IN');
  };

  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Fetch ledger data for both stores
  useEffect(() => {
    const fetchLedgers = async () => {
      try {
        // Fetch main store data (OUT transactions only)
        const mainRes = await axios.get(
          `http://localhost:${BACKEND_PORT}/ledger-api/institute/${instituteId}?storeType=MAIN&direction=OUT`
        );
        setMainStoreLedger(mainRes.data.ledger || []);

        // Fetch sub store data (IN transactions only)
        const subRes = await axios.get(
          `http://localhost:${BACKEND_PORT}/ledger-api/institute/${instituteId}?storeType=SUB&direction=IN`
        );
        setSubStoreLedger(subRes.data.ledger || []);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching ledgers:", error);
        setLoading(false);
      }
    };

    fetchLedgers();
  }, [instituteId]);

  // Get current store ledger based on selection
  const currentStoreLedger = storeType === "MAIN" ? mainStoreLedger : subStoreLedger;

  // Filtered data
  const filteredLedger = useMemo(() => {
    return currentStoreLedger.filter((l) => {
      const txDate = new Date(l.Timestamp);

      if (typeFilter !== "ALL" && l.Transaction_Type !== typeFilter)
        return false;

      if (
        medicineFilter &&
        !l.Medicine_Name.toLowerCase().includes(medicineFilter.toLowerCase())
      )
        return false;

      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (txDate < from) return false;
      }

      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (txDate > to) return false;
      }

      return true;
    });
  }, [currentStoreLedger, typeFilter, medicineFilter, fromDate, toDate]);

  // Calculate stock summary based on OUT transactions for Main Store and IN transactions for Sub Store
  const stockSummary = useMemo(() => {
    const summary = {};
    
    currentStoreLedger.forEach((item) => {
      const medicineName = item.Medicine_Name;
      if (!summary[medicineName]) {
        summary[medicineName] = {
          totalQuantity: 0,
          lastTransaction: item.Timestamp,
          manufacturer: item.Manufacturer_Name,
          totalTransactions: 0
        };
      }
      
      // For Main Store: Count OUT quantities
      // For Sub Store: Count IN quantities
      summary[medicineName].totalQuantity += item.Quantity;
      summary[medicineName].totalTransactions += 1;
      
      if (new Date(item.Timestamp) > new Date(summary[medicineName].lastTransaction)) {
        summary[medicineName].lastTransaction = item.Timestamp;
      }
    });
    
    return summary;
  }, [currentStoreLedger]);

  // Pagination calculations
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentLedger = filteredLedger.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredLedger.length / rowsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, medicineFilter, fromDate, toDate, storeType]);

  // Export functions
  const handlePrint = () => window.print();

  const downloadCSV = () => {
    const headers = storeType === "MAIN" ? [
      "Date & Time",
      "Transaction Type",
      "Medicine",
      "Manufacturer",
      "Expiry Date",
      "Quantity OUT",
      "Balance After",
      "Reference ID",
      "Destination",
      "Remarks"
    ] : [
      "Date & Time",
      "Transaction Type",
      "Medicine",
      "Manufacturer",
      "Expiry Date",
      "Quantity IN",
      "Balance After",
      "Reference ID",
      "Source",
      "Remarks"
    ];

    const rows = filteredLedger.map((l) => [
      formatDateTime(l.Timestamp),
      l.Transaction_Type,
      l.Medicine_Name,
      l.Manufacturer_Name,
      l.Expiry_Date ? formatDateDMY(new Date(l.Expiry_Date)) : "-",
      l.Quantity,
      l.Balance_After,
      l.Reference_ID || "-",
      storeType === "MAIN" ? (l.Destination || "Sub Store") : (l.Source || "Main Store"),
      l.Remarks || "-"
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${x ?? ""}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${storeType}_Store_${storeType === "MAIN" ? "OUT" : "IN"}_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
              onClick={() => setStoreType("MAIN")}
            >
              📦 Main Store
            </button>
            <button
              className={`btn ${storeType === "SUB" ? "btn-dark" : "btn-outline-dark"} btn-lg`}
              onClick={() => setStoreType("SUB")}
            >
              🏪 Sub Store
            </button>
          </div>
          <div className="text-center">
            <h6 className="mb-2">
              Currently viewing: <strong className="text-primary">{storeType} STORE</strong>
            </h6>
            <div className="d-flex justify-content-center gap-2">
              <span className="badge bg-info">
                Total Medicines: {Object.keys(stockSummary).length}
              </span>
              <span className="badge bg-success">
                Total {storeType === "MAIN" ? "OUT" : "IN"} Transactions: {currentStoreLedger.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Summary Card */}
      <div className="card shadow mb-4">
        <div className="card-header bg-info text-white">
          <h6 className="mb-0">
            📊 {storeType} Store {storeType === "MAIN" ? "OUT" : "IN"} Summary
          </h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Manufacturer</th>
                  <th>Total {storeType === "MAIN" ? "OUT" : "IN"} Quantity</th>
                  <th>Total Transactions</th>
                  <th>Last Transaction</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stockSummary).map(([medicine, data]) => (
                  <tr key={medicine}>
                    <td><strong>{medicine}</strong></td>
                    <td>{data.manufacturer}</td>
                    <td>
                      <span className={`badge ${
                        storeType === "MAIN" ? "bg-danger" : "bg-success"
                      }`}>
                        {data.totalQuantity} units
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-secondary">
                        {data.totalTransactions}
                      </span>
                    </td>
                    <td>{formatDateTime(data.lastTransaction)}</td>
                    <td>
                      {storeType === "MAIN" 
                        ? "📤 Transferred to Sub Store" 
                        : "📥 Received from Main Store"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ledger Card */}
      <div className="card shadow">
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              📋 {storeType} Store {storeType === "MAIN" ? "OUT" : "IN"} Ledger
            </h5>
            <small className="text-light">
              Institute ID: {instituteId} | 
              Showing {filteredLedger.length} of {currentStoreLedger.length} {storeType === "MAIN" ? "OUT" : "IN"} transactions
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
          {/* FILTERS */}
          <div className="row g-2 mb-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label mb-1">Transaction Type</label>
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">All Transactions</option>
                <option value="STORE_TRANSFER">Store Transfer</option>
                {storeType === "MAIN" ? (
                  <>
                    <option value="RETURN_TO_MAIN">Return to Main Store</option>
                    <option value="DAMAGED_WRITE_OFF">Damaged/Write-off</option>
                  </>
                ) : (
                  <>
                    <option value="RECEIVED_FROM_MAIN">Received from Main Store</option>
                    <option value="PRESCRIPTION_ISSUE">Prescription Issue</option>
                  </>
                )}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label mb-1">Medicine Name</label>
              <input
                className="form-control"
                placeholder="Search medicine"
                value={medicineFilter}
                onChange={(e) => setMedicineFilter(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label mb-1">From Date</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
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
          </div>

          {/* Clear Filters Button */}
          <div className="d-flex justify-content-end mb-3">
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                setTypeFilter("ALL");
                setMedicineFilter("");
                setFromDate("");
                setToDate("");
              }}
            >
              🔄 Clear Filters
            </button>
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
                  <th>Medicine</th>
                  <th>Manufacturer</th>
                  <th>Expiry Date</th>
                  {storeType === "MAIN" ? (
                    <>
                      <th>Quantity OUT</th>
                      <th>Balance After</th>
                      <th>Destination</th>
                    </>
                  ) : (
                    <>
                      <th>Quantity IN</th>
                      <th>Balance After</th>
                      <th>Source</th>
                    </>
                  )}
                  <th>Reference ID</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={storeType === "MAIN" ? "11" : "11"} className="text-center py-4">
                      <div className="text-muted">
                        {storeType === "MAIN" 
                          ? "📭 No OUT transactions found for Main Store" 
                          : "📭 No IN transactions found for Sub Store"}
                        {(medicineFilter || fromDate || toDate) ? " with current filters" : ""}
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentLedger.map((l, i) => (
                    <tr key={i}>
                      <td>{indexOfFirstRow + i + 1}</td>
                      <td>{formatDateTime(l.Timestamp)}</td>
                      <td>
                        <span className={`badge ${
                          l.Transaction_Type === 'STORE_TRANSFER' ? 'bg-warning' :
                          l.Transaction_Type === 'PRESCRIPTION_ISSUE' ? 'bg-danger' :
                          'bg-info'
                        }`}>
                          {l.Transaction_Type}
                        </span>
                      </td>
                      <td><strong>{l.Medicine_Name}</strong></td>
                      <td>{l.Manufacturer_Name}</td>
                      <td>
                        {l.Expiry_Date ? (
                          <span className={`badge ${
                            new Date(l.Expiry_Date) > new Date() ? 'bg-success' : 'bg-danger'
                          }`}>
                            {formatDateDMY(new Date(l.Expiry_Date))}
                          </span>
                        ) : "-"}
                      </td>
                      <td>
                        <span className={`fw-bold ${
                          storeType === "MAIN" ? "text-danger" : "text-success"
                        }`}>
                          {storeType === "MAIN" ? "-" : "+"}{l.Quantity}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {l.Balance_After}
                        </span>
                      </td>
                      <td>
                        {storeType === "MAIN" 
                          ? <span className="badge bg-primary">Sub Store</span>
                          : <span className="badge bg-primary">Main Store</span>}
                      </td>
                      <td>
                        <small className="text-muted">{l.Reference_ID?.slice(-6) || "-"}</small>
                      </td>
                      <td>
                        <small className="text-muted">{l.Remarks || "-"}</small>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {filteredLedger.length > 0 && (
            <div className="d-flex justify-content-center align-items-center gap-2 mt-4">
              <button
                className="btn btn-outline-dark btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ← Previous
              </button>

              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    className={`btn btn-sm ${
                      currentPage === pageNum ? "btn-dark" : "btn-outline-dark"
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                className="btn btn-outline-dark btn-sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Print styles */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .ledger-page, .ledger-page * { visibility: visible; }
            .ledger-page { position: absolute; left: 0; top: 0; width: 100%; }
            button, .modal, .badge { display: none !important; }
            .card-header { background-color: #000 !important; color: #fff !important; }
            table { font-size: 11px !important; }
            .text-danger, .text-success { color: #000 !important; }
          }
        `}
      </style>
    </div>
  );
};

export default LedgerStore;