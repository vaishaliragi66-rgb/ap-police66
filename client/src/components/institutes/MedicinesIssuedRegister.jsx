import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MedicinesIssuedRegister = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const instituteId = localStorage.getItem("instituteId");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
 
  



  // ---------- FILTER STATES ----------
  const [medicineFilter, setMedicineFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [expiryDateFilter, setExpiryDateFilter] = useState("");
  const [issuedToFilter, setIssuedToFilter] = useState("");
  const issuedToOptions = [
    "Self",
    "Wife",
    "Father",
    "Mother",
    "Sister",
    "Brother",
    "Son",
    "Daughter"
  ];
  const [medicineIdFilter, setMedicineIdFilter] = useState("");
  const [quantityFilter, setQuantityFilter] = useState("");
  
  // ---------- PRESCRIPTION VIEW ----------
const [viewMode, setViewMode] = useState(false);
const [selectedPrescription, setSelectedPrescription] = useState(null);


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

const uniqueMedicineIds = [
  ...new Set(rows.map(r => r.medicineId).filter(Boolean))
];


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
              prescription: p, // ⭐ REQUIRED FOR VIEW
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

  const validateTimeRange = () => {
    if ((startTime && !endTime) || (!startTime && endTime)) {
      alert("Please select both Start Time and End Time");
      return false;
    }
    return true;
  };
  
  const filteredRows = rows.filter((r) => {
    const rowDate = new Date(r.timestamp);
  
    /* ---------- DATE FILTER ---------- */
    if (startDate && !endDate) {
      const start = new Date(startDate);
      if (
        rowDate.toDateString() !== start.toDateString()
      ) return false;
    }
  
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
  
      if (rowDate < start || rowDate > end) return false;
    }
  
    /* ---------- TIME FILTER ---------- */
    if (startTime && endTime) {
      const rowTime =
        rowDate.getHours() * 60 + rowDate.getMinutes();
  
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
  
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
  
      if (rowTime < startMinutes || rowTime > endMinutes) return false;
    }
  
    /* ---------- EXISTING FILTERS ---------- */
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

      /* ---------- EXPIRY DATE FILTER (≤ selected date) ---------- */
    if (expiryDateFilter) {
      if (!r.expiry) return false; // skip medicines without expiry

      const expiry = new Date(r.expiry);
      const selected = new Date(expiryDateFilter);

      // make selected date include full day
      selected.setHours(23, 59, 59, 999);

      if (expiry > selected) return false;
    }

    
     /* ---------- ISSUED TO FILTER ---------- */
     let issuedToMatch = true;

     if (issuedToFilter) {
       if (issuedToFilter === "Self") {
         issuedToMatch =
           !r.issuedTo?.toLowerCase().includes("("); // employee only
       } else {
         issuedToMatch =
           r.issuedTo?.toLowerCase().includes(issuedToFilter.toLowerCase());
       }
     }
     /* ---------- QUANTITY FILTER (LESS THAN) ---------- */
      if (quantityFilter) {
        const qtyLimit = Number(quantityFilter);
        if (Number(r.quantity) > qtyLimit) return false;
      }

  
      return (
        searchMatch &&
        medicineMatch &&
        typeMatch &&
        categoryMatch &&
        issuedToMatch
      );
      
    
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
  // ---------- VIEW PRESCRIPTION ----------
const viewPrescription = (row) => {
  setSelectedPrescription(row.prescription);
  setViewMode(true);
};

// ---------- PRESCRIPTION PDF ----------
const downloadPrescriptionPDF = (prescription) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AP POLICE HEALTH INSTITUTE", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(12);
  doc.text("ONLINE MEDICAL PRESCRIPTION", pageWidth / 2, 28, { align: "center" });

  doc.line(14, 32, pageWidth - 14, 32);

  doc.setFontSize(11);
  const startY = 40;

  doc.rect(14, startY, pageWidth - 28, 22);

  doc.text(`Prescription Ref: ${prescription._id.slice(-6)}`, 18, startY + 7);
  doc.text(`Date: ${new Date(prescription.Timestamp).toLocaleString()}`, 18, startY + 14);
  
  doc.text(
    `Employee: ${prescription.Employee?.Name || "-"}`,
    pageWidth / 2 + 5,
    startY + 7
  );
  doc.text(
    `ABS No: ${prescription.Employee?.ABS_NO || "-"}`,
    pageWidth / 2 + 5,
    startY + 14
  );
  
  const tableBody = prescription.Medicines.map((m, i) => [
    i + 1,
    m.Medicine_ID?.Medicine_Name || "-",
    m.Medicine_ID?.Type || "-",
    m.Medicine_ID?.Category || "-",
    m.Quantity,
    m.Medicine_ID?.Expiry_Date
      ? formatDateDMY(new Date(m.Medicine_ID.Expiry_Date))
      : "-"
  ]);

  autoTable(doc, {
    startY: startY + 42,
    head: [["S.No", "Medicine", "Type", "Category", "Qty", "Expiry"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [33, 150, 243],
      textColor: 255,
      halign: "center"
    },
    bodyStyles: { halign: "center" }
  });

  doc.text(
    "System Generated Prescription – No Signature Required",
    pageWidth / 2,
    doc.lastAutoTable.finalY + 15,
    { align: "center" }
  );

  // FIXED: Open in new tab instead of trying to save directly
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  // Open in new tab
  window.open(pdfUrl, '_blank');
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
};


// ---------- PRESCRIPTION WORD ----------
const downloadPrescriptionWord = (prescription) => {
  let html = `
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; }
      h2 { text-align: center; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      th, td {
        border: 1px solid #000;
        padding: 8px;
        text-align: center;
      }
      th {
        background-color: #f2f2f2;
      }
    </style>
  </head>
  <body>

    <h2>ONLINE MEDICAL PRESCRIPTION</h2>

    <p><strong>Prescription Ref:</strong> ${prescription._id.slice(-6)}</p>
    <p><strong>Employee:</strong> ${prescription.Employee?.Name}</p>
    <p><strong>ABS No:</strong> ${prescription.Employee?.ABS_NO}</p>
    <p><strong>Date:</strong> ${new Date(prescription.Timestamp).toLocaleString()}</p>

    <table>
      <tr>
        <th>S.No</th>
        <th>Medicine</th>
        <th>Type</th>
        <th>Category</th>
        <th>Quantity</th>
      </tr>
  `;

  prescription.Medicines.forEach((m, i) => {
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${m.Medicine_ID?.Medicine_Name || "-"}</td>
        <td>${m.Medicine_ID?.Type || "-"}</td>
        <td>${m.Medicine_ID?.Category || "-"}</td>
        <td>${m.Quantity}</td>
      </tr>
    `;
  });

  html += `
    </table>

    <p style="margin-top:30px;text-align:center;">
      <em>System Generated Prescription</em>
    </p>

  </body>
  </html>
  `;

  const blob = new Blob([html], {
    type: "application/msword"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Prescription_${prescription._id.slice(-6)}.doc`;
  a.click();

  URL.revokeObjectURL(url);
};
const printPrescription = () => {
  const content = document.getElementById("prescription-print");

  const printWindow = window.open("", "", "height=800,width=900");

  printWindow.document.write(`
    <html>
      <head>
        <title>Prescription</title>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
        />
        <style>
          body { padding: 25px; font-family: Arial, sans-serif; }
          h5 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 8px; text-align: center; }
          th { background: #f2f2f2; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
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
            <button className="btn btn-light btn-sm" onClick={handleDownloadCSV}>
              ⬇ Download
            </button>

            <button className="btn btn-light btn-sm" onClick={handlePrint}>
              🖨 Print
            </button>
            
          </div>
        </div>


        {/* ================= FILTER CARD ================= */}
        {showFilters && (
<div className="card-body border-bottom">
  <div className="card shadow-sm">
    <div className="card-header bg-light fw-semibold">
      Filters
    </div>

    <div className="card-body">
      <div className="d-flex flex-wrap gap-2 align-items-end">
      <select
          className="form-select form-select-sm"
          style={{ width: "180px" }}
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Categories</option>
          {uniqueCategories.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>
        
        <select
          className="form-select form-select-sm"
          style={{ width: "180px" }}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Types</option>
          {uniqueTypes.map((t, i) => (
            <option key={i} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="form-select form-select-sm"
          style={{ width: "200px" }}
          value={medicineFilter}
          onChange={(e) => {
            setMedicineFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Medicines</option>
          {uniqueMedicines.map((m, i) => (
            <option key={i} value={m}>{m}</option>
          ))}
        </select>
         <input
          type="text"
          className="form-control form-control-sm"
          style={{ width: "340px" }}
          placeholder="Search ABS / Name / Issued To / Ref / Medicine ID"
          value={searchFilter}
          onChange={(e) => {
            setSearchFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
      <div>
        <label className="form-label small">Start Date</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      <div>
        <label className="form-label small">End Date</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>
      <div className="w-100"></div>
      <div>
        <label className="form-label small">Start Time</label>
        <input
          type="time"
          className="form-control form-control-sm"
          value={startTime}
          onChange={(e) => {
            setStartTime(e.target.value);
            setCurrentPage(1);
          }}
          onBlur={validateTimeRange}
        />
      </div>
    
      <div>
        <label className="form-label small">End Time</label>
        <input
          type="time"
          className="form-control form-control-sm"
          value={endTime}
          onChange={(e) => {
            setEndTime(e.target.value);
            setCurrentPage(1);
          }}
          onBlur={validateTimeRange}
        />
      </div>
      <select
        className="form-select form-select-sm"
        style={{ width: "180px" }}
        value={issuedToFilter}
        onChange={(e) => {
          setIssuedToFilter(e.target.value);
          setCurrentPage(1);
        }}
      >
        <option value="">Issued To (All)</option>
        {issuedToOptions.map((opt, i) => (
          <option key={i} value={opt}>{opt}</option>
        ))}
      </select>

      {/* ✅ MOVE MEDICINE ID HERE */}
      <select
        className="form-select form-select-sm"
        style={{ width: "180px" }}
        value={medicineIdFilter}
        onChange={(e) => {
          setMedicineIdFilter(e.target.value);
          setCurrentPage(1);
        }}
      >
        <option value="">All Medicine IDs</option>
        {uniqueMedicineIds.map((id, i) => (
          <option key={i} value={id}>{id}</option>
        ))}
      </select>
      <div>
        <label className="form-label small">Expiry ≤</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={expiryDateFilter}
          onChange={(e) => {
            setExpiryDateFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

            <div>
        <label className="form-label small">Qty Less Than</label>
        <input
          type="number"
          min="1"
          className="form-control form-control-sm"
          placeholder="e.g. 3"
          value={quantityFilter}
          onChange={(e) => {
            setQuantityFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>


      </div>
      <div>
        
      </div>
    </div>
  </div>
</div>
)}


        {/* ---------- TABLE ---------- */}
        <div className="card-body">
          {/* ---------- ROWS PER PAGE (TOP RIGHT – CONSISTENT) ---------- */}
          <div className="d-flex justify-content-end align-items-center gap-3 mb-3">

              <button
                className="btn btn-outline-dark btn-sm"
                onClick={() => setShowFilters(prev => !prev)}
              >
                {showFilters ? "Hide Filters ▲" : "Show Filters ▼"}
              </button>

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
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => viewPrescription(r)}
                        >
                          View
                        </button>

                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => downloadPrescriptionPDF(r.prescription)}
                        >
                          PDF
                        </button>

                        <button
                          className="btn btn-sm btn-outline-dark"
                          onClick={() => downloadPrescriptionWord(r.prescription)}
                        >
                          Word
                        </button>
                      </div>
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
      {viewMode && selectedPrescription && (
  <div
    className="modal fade show"
    style={{ display: "block", background: "rgba(0,0,0,.6)" }}
  >
    <div className="modal-dialog modal-fullscreen">
      <div className="modal-content">

        {/* HEADER */}
        <div className="modal-header bg-dark text-white">
          <h5>Online Prescription</h5>
          <button
            className="btn-close btn-close-white"
            onClick={() => setViewMode(false)}
          />
        </div>

        {/* BODY */}
        <div className="modal-body" id="prescription-print">

          <h5 className="text-center mb-4">
            AP POLICE HEALTH INSTITUTE<br />
            <small className="text-muted">ONLINE MEDICAL PRESCRIPTION</small>
          </h5>

          <table className="table table-borderless mb-3">
          <tbody>
            <tr>
              <td style={{ width: "50%" }}>
                <strong>Employee:</strong> {selectedPrescription.Employee?.Name}
              </td>
              <td style={{ width: "50%", textAlign: "right" }}>
                <strong>Prescription Ref:</strong> {selectedPrescription._id.slice(-6)}
              </td>
            </tr>
            <tr>
              <td>
                <strong>ABS No:</strong> {selectedPrescription.Employee?.ABS_NO}
              </td>
              <td style={{ textAlign: "right" }}>
                <strong>Date:</strong>{" "}
                {new Date(selectedPrescription.Timestamp).toLocaleString()}
              </td>
            </tr>
          </tbody>
         
        </table>
        <hr
        style={{
              borderTop: "1px solid #000",
              margin: "12px 0 20px 0"
            }}
          />


              <table
                  className="table table-bordered mt-3"
                  style={{ borderTop: "2px solid #000" }}
                >
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>Medicine</th>
                <th>Type</th>
                <th>Category</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {selectedPrescription.Medicines.map((m, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{m.Medicine_ID?.Medicine_Name}</td>
                  <td>{m.Medicine_ID?.Type}</td>
                  <td>{m.Medicine_ID?.Category}</td>
                  <td>{m.Quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-center mt-4">
            <em>System Generated Prescription – No Signature Required</em>
          </p>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button
            className="btn btn-primary"
            onClick={printPrescription}
          >
            🖨 Print
          </button>

          <button
            className="btn btn-danger"
            onClick={() => downloadPrescriptionPDF(selectedPrescription)}
          >
            📄 PDF
          </button>

          <button
            className="btn btn-dark"
            onClick={() => downloadPrescriptionWord(selectedPrescription)}
          >
            📝 Word
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setViewMode(false)}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  </div>
)}



    </div>
  );
};

export default MedicinesIssuedRegister;