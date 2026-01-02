import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const InstituteLedger = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const instituteId = localStorage.getItem("instituteId");

  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1); // reset page
  };


  // Filters
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
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

  return `${day}-${month}-${year}`; // ✅ DD-MM-YYYY
};

  useEffect(() => {
    axios
      .get(
        `http://localhost:${BACKEND_PORT}/ledger-api/institute/${instituteId}`
      )
      .then((res) => {
        setLedger(res.data.ledger || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [instituteId]);

  // ---------------- FILTERED DATA (FIXED DATE LOGIC) ----------------
  const filteredLedger = useMemo(() => {
    return ledger.filter((l) => {
      const txDate = new Date(l.Timestamp);

      if (typeFilter !== "ALL" && l.Transaction_Type !== typeFilter)
        return false;

      if (directionFilter !== "ALL" && l.Direction !== directionFilter)
        return false;

      if (
        medicineFilter &&
        !l.Medicine_Name.toLowerCase().includes(
          medicineFilter.toLowerCase()
        )
      )
        return false;

      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0); // start of day
        if (txDate < from) return false;
      }

      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999); // end of day
        if (txDate > to) return false;
      }

      return true;
    });
  }, [
    ledger,
    typeFilter,
    directionFilter,
    medicineFilter,
    fromDate,
    toDate
  ]);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

  const currentLedger = filteredLedger.slice(
    indexOfFirstRow,
    indexOfLastRow
  );

  const totalPages = Math.ceil(filteredLedger.length / rowsPerPage);


  const handlePrint = () => window.print();

  const downloadCSV = () => {
    const headers = [
      "Date",
      "Transaction",
      "Medicine",
      "Manufacturer",
      "Expiry",
      "IN/OUT",
      "Quantity",
      "Balance",
      "Reference"
    ];

    const rows = filteredLedger.map((l) => [
      new Date(l.Timestamp).toLocaleString(),
      l.Transaction_Type,
      l.Medicine_Name,
      l.Manufacturer_Name,
      l.Expiry_Date
        ? formatDateDMY(new Date(l.Expiry_Date))
        : "",
      l.Direction,
      l.Quantity,
      l.Balance_After,
      l.Reference_ID
    ]);

    const csv =
      [headers, ...rows]
        .map((r) => r.map((x) => `"${x ?? ""}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "Institute_Ledger.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, directionFilter, medicineFilter, fromDate, toDate]);
  if (loading) {
    return (
      <div className="text-center mt-5">
        <strong>Loading ledger...</strong>
      </div>
    );
  }

  return (
    <div className="container mt-4 ledger-page">
      <div className="card shadow">
        <div className="card-header bg-dark text-white d-flex justify-content-between">
          <h5 className="mb-0">Institute Medicine Ledger</h5>
          <div>
            <button className="btn btn-light btn-sm me-2" onClick={handlePrint}>
              🖨 Print
            </button>
            <button className="btn btn-light btn-sm" onClick={downloadCSV}>
              ⬇ Download
            </button>
          </div>
        </div>

        <div className="card-body">
          {/* FILTERS */}
          <div className="row g-2 mb-3 align-items-end">

            <div className="col-md-2">
              <label className="form-label mb-1">Transaction</label>
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">All Transactions</option>
                <option value="ORDER_DELIVERY">Order Delivery</option>
                <option value="PRESCRIPTION_ISSUE">Prescription</option>
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label mb-1">IN / OUT</label>
              <select
                className="form-select"
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
              >
                <option value="ALL">IN & OUT</option>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label mb-1">Medicine</label>
              <input
                className="form-control"
                placeholder="Search medicine"
                value={medicineFilter}
                onChange={(e) => setMedicineFilter(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label mb-1">From Date</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label mb-1">To Date</label>
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

          </div>
          <div className="d-flex justify-content-end mb-3">
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
              </select>
            </div>
          </div>

          {/* TABLE */}
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>S.No</th>
                  <th>Date & Time</th>
                  <th>Transaction</th>
                  <th>Medicine</th>
                  <th>Manufacturer</th>
                  <th>Expiry</th>
                  <th>IN / OUT</th>
                  <th>Qty</th>
                  <th>Balance</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center">
                      No records found
                    </td>
                  </tr>
                )}

                {currentLedger.map((l, i) => (
                  <tr key={i}>
                    <td>{indexOfFirstRow + i + 1}</td>
                    <td>{new Date(l.Timestamp).toLocaleString()}</td>
                    <td>{l.Transaction_Type}</td>
                    <td>{l.Medicine_Name}</td>
                    <td>{l.Manufacturer_Name}</td>
                    <td>
                      {l.Expiry_Date
                        ? formatDateDMY(new Date(l.Expiry_Date))
                        : "-"}
                    </td>
                    <td
                      style={{
                        color:
                          l.Direction === "IN" ? "green" : "red",
                        fontWeight: "bold"
                      }}
                    >
                      {l.Direction}
                    </td>
                    <td>{l.Quantity}</td>
                    <td>{l.Balance_After}</td>
                    <td>{l.Reference_ID.slice(-6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="d-flex justify-content-center align-items-center gap-2 mt-4">
              <button
                className="btn btn-outline-dark btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  className={`btn btn-sm ${
                    currentPage === i + 1
                      ? "btn-dark"
                      : "btn-outline-dark"
                  }`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}

              <button
                className="btn btn-outline-dark btn-sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .ledger-page, .ledger-page * { visibility: visible; }
            .ledger-page { position: absolute; left: 0; top: 0; width: 100%; }
            button { display: none !important; }
          }
        `}
      </style>
    </div>
  );
};

export default InstituteLedger;
