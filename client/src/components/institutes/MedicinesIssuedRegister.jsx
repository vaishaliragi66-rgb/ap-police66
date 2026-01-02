import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MedicinesIssuedRegister = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const instituteId = localStorage.getItem("instituteId");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------- FILTER STATES ----------
  const [medicineFilter, setMedicineFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Smart search bar
  const [searchFilter, setSearchFilter] = useState("");

  // ---------- SORT STATE ----------
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc"
  });

  const formatDateDMY = (dateValue) => {
  if (!dateValue) return "—";

  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`; // DD-MM-YYYY
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

  // ---------- FETCH DATA ----------
  useEffect(() => {
    if (!instituteId) return;

    axios
      .get(
        `http://localhost:${BACKEND_PORT}/prescription-api/institute/${instituteId}`
      )
      .then((res) => {
        const flattened = [];

        res.data.forEach((p) => {
          const timestamp = p.Timestamp;

          p.Medicines.forEach((m) => {
            flattened.push({
              timestamp,

              employeeABS: p.Employee?.ABS_NO || "-",
              employeeName: p.Employee?.Name || "-",

              issuedTo: p.IsFamilyMember
                ? `${p.FamilyMember?.Name} (${p.FamilyMember?.Relationship})`
                : p.Employee?.Name,

              medicineId: m.Medicine_ID?.Medicine_Code || "-",
              medicineName: m.Medicine_ID?.Medicine_Name || "-",
              medicineType: m.Medicine_ID?.Type || "-",
              medicineCategory: m.Medicine_ID?.Category || "-",

              expiry: m.Medicine_ID?.Expiry_Date || null,
              quantity: m.Quantity,

              prescriptionId: p._id
            });
          });
        });

        setRows(flattened);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [instituteId]);

  // ---------- UNIQUE DROPDOWN VALUES ----------
  const uniqueMedicines = [...new Set(rows.map(r => r.medicineName).filter(Boolean))];
  const uniqueTypes = [...new Set(rows.map(r => r.medicineType).filter(Boolean))];
  const uniqueCategories = [...new Set(rows.map(r => r.medicineCategory).filter(Boolean))];

  // ---------- APPLY FILTERS ----------
  const filteredRows = rows.filter((r) => {
    const search = searchFilter.toLowerCase();

    const searchMatch =
      search === "" ||
      r.employeeABS?.toString().toLowerCase().includes(search) ||
      r.employeeName?.toLowerCase().includes(search) ||
      r.issuedTo?.toLowerCase().includes(search) ||
      r.prescriptionId?.slice(-6).toLowerCase().includes(search) ||
      r.medicineId?.toLowerCase().includes(search) ||
      r.medicineName?.toLowerCase().includes(search);

    const medicineMatch =
      medicineFilter === "" || r.medicineName === medicineFilter;

    const typeMatch =
      typeFilter === "" || r.medicineType === typeFilter;

    const categoryMatch =
      categoryFilter === "" || r.medicineCategory === categoryFilter;

    return searchMatch && medicineMatch && typeMatch && categoryMatch;
  });

  // ---------- SORT ----------
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const x = a[sortConfig.key];
    const y = b[sortConfig.key];

    const isDate =
      sortConfig.key === "timestamp" || sortConfig.key === "expiry";

    const valX = isDate ? new Date(x) : (x ?? "").toString().toLowerCase();
    const valY = isDate ? new Date(y) : (y ?? "").toString().toLowerCase();

    if (valX < valY) return sortConfig.direction === "asc" ? -1 : 1;
    if (valX > valY) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // ---------- PAGINATION ----------
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

  const currentRows = sortedRows.slice(indexOfFirstRow, indexOfLastRow);

  const totalPages = Math.ceil(sortedRows.length / rowsPerPage);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // ---------- PRINT ----------
  const handlePrint = () => {
    window.print();
  };

  // ---------- DOWNLOAD CSV ----------
  const handleDownloadCSV = () => {
    const headers = [
      "Date & Time",
      "ABS No",
      "Employee Name",
      "Issued To",
      "Medicine ID",
      "Medicine",
      "Type",
      "Category",
      "Expiry",
      "Quantity",
      "Prescription Ref"
    ];

    const rows = sortedRows.map(r => [
      r.timestamp ? new Date(r.timestamp).toLocaleString() : "-",
      r.employeeABS,
      r.employeeName,
      r.issuedTo,
      r.medicineId,
      r.medicineName,
      r.medicineType,
      r.medicineCategory,
      r.expiry ? formatDateDMY(new Date(r.expiry)) : "-",
      r.quantity,
      r.prescriptionId.slice(-6)
    ]);

    const csv =
      [headers, ...rows]
        .map(row => row.map(x => `"${x ?? ""}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "Medicines_Issued_Register.csv";
    a.click();

    window.URL.revokeObjectURL(url);
  };

  // ---------- RECEIPT GENERATOR ----------
  const downloadReceipt = (row) => {
    const doc = new jsPDF();

    const billDate = row.timestamp
      ? new Date(row.timestamp).toLocaleString()
      : "-";

    doc.setFontSize(14);
    doc.text("OUT-PATIENT PHARMACY", 105, 15, { align: "center" });
    doc.text("PHARMACY ISSUE RECEIPT", 105, 22, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Receipt No: ${row.prescriptionId.slice(-6)}`, 14, 35);
    doc.text(`Bill Date: ${billDate}`, 14, 42);

    doc.text("Institute: AP Police Health Institute", 14, 52);
    doc.text(`Issued To: ${row.issuedTo}`, 14, 59);
    doc.text(`Employee ABS No: ${row.employeeABS}`, 14, 66);

    autoTable(doc, {
      startY: 75,
      head: [["Medicine ID","Medicine","Type","Category","Quantity","Expiry","Status"]],
      body: [[
        row.medicineId,
        row.medicineName,
        row.medicineType,
        row.medicineCategory,
        row.quantity,
        row.expiry ? formatDateDMY(new Date(row.expiry)) : "-",
        "ISSUED"
      ]]
    });

    doc.text(
      "System Generated Receipt",
      105,
      doc.lastAutoTable.finalY + 15,
      { align: "center" }
    );

    doc.save(
      `Medicine_Issue_Receipt_${row.prescriptionId.slice(-6)}.pdf`
    );
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <strong>Loading issued medicines...</strong>
      </div>
    );
  }

  return (
    <div className=" mt-4 print-area">
      <div className="card shadow">

        {/* ---------- HEADER ---------- */}
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Medicines Issued</h5>

          <div className="d-flex gap-2">

            {/* Filters */}
            <select className="form-select" style={{ width: "200px" }}
              value={medicineFilter}
              onChange={(e) => { setMedicineFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Medicines</option>
              {uniqueMedicines.map((m, i) => <option key={i} value={m}>{m}</option>)}
            </select>

            <select className="form-select" style={{ width: "180px" }}
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Types</option>
              {uniqueTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
            </select>

            <select className="form-select" style={{ width: "180px" }}
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>

            <input
              type="text"
              className="form-control"
              style={{ width: "260px" }}
              placeholder="Search ABS / Name / Issued To / Ref / Medicine ID..."
              value={searchFilter}
              onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
            />

            {/* Download + Print Buttons */}
            <button className="btn btn-light btn-sm" onClick={handleDownloadCSV}>⬇ Download</button>
            <button className="btn btn-light btn-sm" onClick={handlePrint}>🖨 Print</button>

          </div>
        </div>

        {/* ---------- TABLE ---------- */}
        <div className="card-body">
          {/* ---------- ROWS PER PAGE (TOP RIGHT – CONSISTENT) ---------- */}
          <div className="d-flex justify-content-end mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold text-muted">Rows per page:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: "80px" }}
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
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
                  <th onClick={() => handleSort("timestamp")} style={{ cursor: "pointer" }}>Date & Time {sortIcon("timestamp")}</th>
                  <th onClick={() => handleSort("employeeABS")} style={{ cursor: "pointer" }}>ABS No {sortIcon("employeeABS")}</th>
                  <th onClick={() => handleSort("employeeName")} style={{ cursor: "pointer" }}>Employee Name {sortIcon("employeeName")}</th>
                  <th onClick={() => handleSort("issuedTo")} style={{ cursor: "pointer" }}>Issued To {sortIcon("issuedTo")}</th>
                  <th onClick={() => handleSort("medicineId")} style={{ cursor: "pointer" }}>Medicine ID {sortIcon("medicineId")}</th>
                  <th onClick={() => handleSort("medicineName")} style={{ cursor: "pointer" }}>Medicine {sortIcon("medicineName")}</th>
                  <th onClick={() => handleSort("medicineType")} style={{ cursor: "pointer" }}>Type {sortIcon("medicineType")}</th>
                  <th onClick={() => handleSort("medicineCategory")} style={{ cursor: "pointer" }}>Category {sortIcon("medicineCategory")}</th>
                  <th onClick={() => handleSort("expiry")} style={{ cursor: "pointer" }}>Expiry {sortIcon("expiry")}</th>
                  <th onClick={() => handleSort("quantity")} style={{ cursor: "pointer" }}>Qty {sortIcon("quantity")}</th>
                  <th onClick={() => handleSort("prescriptionId")} style={{ cursor: "pointer" }}>Prescription Ref {sortIcon("prescriptionId")}</th>
                  <th>Receipt</th>
                </tr>
              </thead>

              <tbody>
                {currentRows.length === 0 && (
                  <tr>
                    <td colSpan="13" className="text-center">No matching records</td>
                  </tr>
                )}

                {currentRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.timestamp ? new Date(r.timestamp).toLocaleString() : "-"}</td>
                    <td>{r.employeeABS}</td>
                    <td>{r.employeeName}</td>
                    <td>{r.issuedTo}</td>
                    <td>{r.medicineId}</td>
                    <td>{r.medicineName}</td>
                    <td>{r.medicineType}</td>
                    <td>{r.medicineCategory}</td>
                    <td>{r.expiry ? formatDateDMY(new Date(r.expiry)) : "-"}</td>
                    <td>{r.quantity}</td>
                    <td>{r.prescriptionId.slice(-6)}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary"
                        onClick={() => downloadReceipt(r)}
                      >Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* ---------- PAGINATION ---------- */}
          <div className="d-flex justify-content-center align-items-center gap-2 mt-4">

            <button
              className="btn btn-outline-dark btn-sm"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
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
                onClick={() => goToPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            <button
              className="btn btn-outline-dark btn-sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
            </button>

          </div>
        </div>
      </div>

      {/* ---------- PRINT STYLES ---------- */}
      <style>
      {`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          button, select, input { display: none !important; }
        }
      `}
      </style>

    </div>
  );
};

export default MedicinesIssuedRegister;