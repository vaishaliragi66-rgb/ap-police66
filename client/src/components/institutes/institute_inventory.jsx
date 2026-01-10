import React, { useEffect, useState } from "react";
import axios from "axios";

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

  /* ---------- FILTER STATES ---------- */
  const [searchMedicine, setSearchMedicine] = useState("");
  const [quantityFilter, setQuantityFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  /* ---------- FETCH ---------- */
  useEffect(() => {
    const fetchInventory = async () => {
      const storedInstitute = localStorage.getItem("institute");
      if (!storedInstitute) return;

      const instituteId = JSON.parse(storedInstitute)._id;

      const res = await axios.get(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/inventory/${instituteId}`
      );

      setInventory(res.data);
    };

    fetchInventory();
  }, [BACKEND_PORT_NO]);

  /* ---------- FILTER LOGIC ---------- */
  const filteredInventory = inventory.filter((item) => {
    const daysLeft = daysFromToday(item.Expiry_Date);

    /* Medicine search */
    if (
      searchMedicine &&
      !item.medicineName?.toLowerCase().includes(searchMedicine.toLowerCase())
    )
      return false;

    /* Quantity ≤ */
    if (quantityFilter !== "") {
      const limit = Number(quantityFilter);
      if (!Number.isFinite(limit)) return true; // allow typing

      if (Number(item.quantity) > limit) return false;
    }

    /* Expiry ≤ */
    if (expiryFilter) {
      const limitDate = new Date(expiryFilter);
      limitDate.setHours(23, 59, 59, 999);

      if (new Date(item.expiryDate) > limitDate) return false;
    }

    /* Status */
  
        if (statusFilter === "EXPIRED" && !(daysLeft < 0)) return false;

        if (
          statusFilter === "NEAR_EXPIRY" &&
          !(daysLeft >= 0 && daysLeft <= 5)
        )
          return false;

        if (
          statusFilter === "LOW_STOCK" &&
          !(item.quantity < item.Threshold_Qty)
        )
          return false;

        /* ✅ NORMAL = not expired AND not near expiry AND not low stock */
        if (
          statusFilter === "NORMAL" &&
          !(
            daysLeft >= 0 &&
            daysLeft > 5 &&
            item.quantity >= item.threshold
          )
        )
          return false;

        return true;

  });

  /* ---------- SORT ---------- */
  const sortedInventory = [...filteredInventory].sort(
    (a, b) => daysFromToday(a.expiryDate) - daysFromToday(b.expiryDate)
  );

  /* ---------- PAGINATION ---------- */
  const indexOfLastRow = currentPage * rowsPerPage;
  const currentInventory = sortedInventory.slice(
    indexOfLastRow - rowsPerPage,
    indexOfLastRow
  );
  const totalPages = Math.ceil(sortedInventory.length / rowsPerPage);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Institute Inventory
      </h2>

      {/* ================= FILTERS (ALWAYS VISIBLE) ================= */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search Medicine"
          className="border rounded px-3 py-1 text-sm"
          value={searchMedicine}
          onChange={(e) => {
            setSearchMedicine(e.target.value);
            setCurrentPage(1);
          }}
        />

        <input
          type="number"
          placeholder="Qty ≤"
          className="border rounded px-3 py-1 text-sm w-24"
          value={quantityFilter}
          onChange={(e) => {
            setQuantityFilter(e.target.value);
            setCurrentPage(1);
          }}
        />

        <input
          type="date"
          className="border rounded px-3 py-1 text-sm"
          value={expiryFilter}
          onChange={(e) => {
            setExpiryFilter(e.target.value);
            setCurrentPage(1);
          }}
        />

        <select
          className="border rounded px-3 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Status</option>
          <option value="EXPIRED">❌ Expired</option>
          <option value="NEAR_EXPIRY">⏰ Near Expiry</option>
          <option value="NORMAL   ">✔ Normal</option>
          <option value="LOW_STOCK">⚠️ Low Stock</option>
        </select>
      </div>

      {/* ================= TABLE / EMPTY ================= */}
      {sortedInventory.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">
          No medicines found
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl shadow-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3 text-left">Medicine</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Threshold</th>
                  <th className="p-3">Expiry</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedInventory.map((row, index) => {
                  const daysLeft = daysFromToday(row.Expiry_Date);
                  let status = "Normal";
                  let statusClass = "bg-green-100 text-green-800";
                  let statusIcon = "✅";

                  if (daysLeft !== null && daysLeft < 0) {
                    status = "Expired";
                    statusClass = "bg-red-100 text-red-800";
                    statusIcon = "⛔";
                  } else if (daysLeft !== null && daysLeft <= 5) {
                    status = "Near Expiry";
                    statusClass = "bg-orange-100 text-orange-800";
                    statusIcon = "⏰";
                  } else if (row.Quantity < row.Threshold_Qty) {
                    status = "Low Stock";
                    statusClass = "bg-yellow-100 text-yellow-800";
                    statusIcon = "⚠️";
                  }

                  return (
                    <tr key={index}>
                      <td>{index + 1}</td>

                      {/* Medicine Name */}
                      <td>{row.Medicine_Name}</td>

                      {/* Quantity = Main + Sub */}
                      <td>{row.Quantity}</td>

                      {/* Threshold (optional) */}
                      <td>{row.Threshold_Qty}</td>

                      {/* Expiry */}
                      <td>
                        {row.Expiry_Date
                          ? new Date(row.Expiry_Date).toLocaleDateString("en-GB")
                          : "—"}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${statusClass}`}
                        >
                          <span>{statusIcon}</span>
                          <span>{status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>

          {/* Pagination */}
         {/* ---------- PAGINATION ---------- */}
        <div className="flex justify-center items-center gap-2 mt-5">

        {/* PREVIOUS */}
        <button
          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          Previous
        </button>

        {/* PAGE NUMBERS */}
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            className={`px-3 py-1 border rounded text-sm ${
              currentPage === i + 1
                ? "bg-black text-white"
                : "bg-white"
            }`}
            onClick={() => setCurrentPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}

        {/* NEXT */}
        <button
          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          Next
        </button>

        </div>

        </>
      )}
    </div>
  );
}

export default InstituteInventory;
