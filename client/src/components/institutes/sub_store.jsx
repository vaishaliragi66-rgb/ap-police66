import React, { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

export default function SubStore() {

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------- FILTERS ----------
  const [medicineFilter, setMedicineFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // ---------- SORT ----------
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc"
  });

  const formatDateDMY = (dateValue) => {
    if (!dateValue) return "—";
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "—";
    return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  // ---------- FETCH SUB-STORE STOCK ----------
 useEffect(() => {
  const storedInstitute = localStorage.getItem("institute");
  if (!storedInstitute) return;

  const institute = JSON.parse(storedInstitute);
  const instituteId = institute._id;

  axios
    .get(`http://localhost:${BACKEND_PORT}/medicine-api/substore/${instituteId}`)
    .then(res => {
      setRows(res.data || []);
      setLoading(false);
    })
    .catch(err => {
      console.error("Sub-store load error", err);
      setRows([]);
      setLoading(false);
    });
}, []);


  // ---------- UNIQUE DROPDOWN VALUES ----------
  const uniqueMedicines = [...new Set(rows.map(r => r.Medicine_Name).filter(Boolean))];
  const uniqueTypes = [...new Set(rows.map(r => r.Type).filter(Boolean))];
  const uniqueCategories = [...new Set(rows.map(r => r.Category).filter(Boolean))];

  // ---------- FILTER ----------
  const filteredRows = rows.filter(r => {

    const search = searchFilter.toLowerCase();

    const searchMatch =
      search === "" ||
      r.Medicine_Code?.toLowerCase().includes(search) ||
      r.Medicine_Name?.toLowerCase().includes(search) ||
      r.Type?.toLowerCase().includes(search) ||
      r.Category?.toLowerCase().includes(search);

    const medicineMatch =
      medicineFilter === "" || r.Medicine_Name === medicineFilter;

    const typeMatch =
      typeFilter === "" || r.Type === typeFilter;

    const categoryMatch =
      categoryFilter === "" || r.Category === categoryFilter;

    return searchMatch && medicineMatch && typeMatch && categoryMatch;
  });

  // ---------- SORT ----------
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const x = a[sortConfig.key];
    const y = b[sortConfig.key];

    const isDate = sortConfig.key === "Expiry_Date";

    const valX = isDate ? new Date(x) : (x ?? "").toString().toLowerCase();
    const valY = isDate ? new Date(y) : (y ?? "").toString().toLowerCase();

    if (valX < valY) return sortConfig.direction === "asc" ? -1 : 1;
    if (valX > valY) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // ---------- PAGINATION ----------
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = sortedRows.slice(indexOfFirst, indexOfLast);

  const totalPages = Math.ceil(sortedRows.length / rowsPerPage);

  const goToPage = (p) => { if (p >= 1 && p <= totalPages) setCurrentPage(p); };

  if (loading) {
    return <div className="text-center mt-5"><strong>Loading sub-store stock...</strong></div>;
  }

  return (
    <div className="mt-4 print-area">
      <div className="card shadow">

        {/* ---------- HEADER ---------- */}
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Sub-Store Medicine Stock</h5>

          <div className="d-flex gap-2">

            <select className="form-select" style={{ width:"200px" }}
              value={medicineFilter}
              onChange={e => { setMedicineFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Medicines</option>
              {uniqueMedicines.map((m,i) => <option key={i} value={m}>{m}</option>)}
            </select>

            <select className="form-select" style={{ width:"180px" }}
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Types</option>
              {uniqueTypes.map((t,i) => <option key={i} value={t}>{t}</option>)}
            </select>

            <select className="form-select" style={{ width:"180px" }}
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((c,i) => <option key={i} value={c}>{c}</option>)}
            </select>

            <input
              className="form-control"
              style={{ width:"260px" }}
              placeholder="Search Medicine / Code / Type / Category..."
              value={searchFilter}
              onChange={e => { setSearchFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* ---------- TABLE ---------- */}
        <div className="card-body">

          {/* Rows per page */}
          <div className="d-flex justify-content-end mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold text-muted">Rows per page:</span>
              <select
                className="form-select form-select-sm"
                style={{ width:"80px" }}
                value={rowsPerPage}
                onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th onClick={() => handleSort("Medicine_Code")} style={{cursor:"pointer"}}>Code {sortIcon("Medicine_Code")}</th>
                  <th onClick={() => handleSort("Medicine_Name")} style={{cursor:"pointer"}}>Medicine {sortIcon("Medicine_Name")}</th>
                  <th onClick={() => handleSort("Type")} style={{cursor:"pointer"}}>Type {sortIcon("Type")}</th>
                  <th onClick={() => handleSort("Category")} style={{cursor:"pointer"}}>Category {sortIcon("Category")}</th>
                  <th onClick={() => handleSort("Quantity")} style={{cursor:"pointer"}}>Qty {sortIcon("Quantity")}</th>
                  <th onClick={() => handleSort("Threshold_Qty")} style={{cursor:"pointer"}}>Threshold {sortIcon("Threshold_Qty")}</th>
                  <th onClick={() => handleSort("Expiry_Date")} style={{cursor:"pointer"}}>Expiry {sortIcon("Expiry_Date")}</th>
                </tr>
              </thead>

              <tbody>
                {currentRows.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center">No matching records</td>
                  </tr>
                )}

                {currentRows.map((r,i) => (
                  <tr key={i}>
                    <td>{r.Medicine_Code}</td>
                    <td>{r.Medicine_Name}</td>
                    <td>{r.Type || "-"}</td>
                    <td>{r.Category || "-"}</td>
                    <td className={r.Quantity <= r.Threshold_Qty ? "text-danger fw-bold" : ""}>
                      {r.Quantity}
                    </td>
                    <td>{r.Threshold_Qty}</td>
                    <td>{r.Expiry_Date ? formatDateDMY(r.Expiry_Date) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------- PAGINATION ---------- */}
          <div className="d-flex justify-content-center align-items-center gap-2 mt-4">
            <button className="btn btn-outline-dark btn-sm"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >Previous</button>

            {[...Array(totalPages)].map((_,i) => (
              <button key={i}
                className={`btn btn-sm ${currentPage === i+1 ? "btn-dark" : "btn-outline-dark"}`}
                onClick={() => goToPage(i+1)}
              >{i+1}</button>
            ))}

            <button className="btn btn-outline-dark btn-sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => goToPage(currentPage + 1)}
            >Next</button>
          </div>

        </div>
      </div>

      {/* ---------- PRINT STYLES ---------- */}
      <style>
      {`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position:absolute; left:0; top:0; width:100%; }
          button, select, input { display:none !important; }
        }
      `}
      </style>
    </div>
  );
}