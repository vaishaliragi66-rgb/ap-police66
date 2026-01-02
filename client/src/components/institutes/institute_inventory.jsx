import React, { useEffect, useState } from "react";
import axios from "axios";

/* ✅ SAFE DATE FORMATTER (DD-MM-YYYY) */
const formatDateDMY = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${dd}-${mm}-${yyyy}`;
};

/* ✅ DAYS DIFFERENCE FROM TODAY */
const daysFromToday = (value) => {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(value);
  date.setHours(0, 0, 0, 0);

  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
};

function InstituteInventory() {
  const [inventory, setInventory] = useState([]);
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };


  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const storedInstitute = localStorage.getItem("institute");
        if (!storedInstitute) return;

        const institute = JSON.parse(storedInstitute);
        const instituteId = institute._id;

        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/institute-api/inventory/${instituteId}`
        );

        setInventory(res.data);
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    };

    fetchInventory();
  }, [BACKEND_PORT_NO]);

  /* ✅ SORT INVENTORY BY EXPIRY (NEAREST FIRST, EXPIRED LAST) */
  const sortedInventory = [...inventory].sort((a, b) => {
    const da = daysFromToday(a.expiryDate);
    const db = daysFromToday(b.expiryDate);

    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;

    // expired go last
    if (da < 0 && db >= 0) return 1;
    if (db < 0 && da >= 0) return -1;

    return da - db;
  });

  const indexOfLastRow = currentPage * rowsPerPage;
const indexOfFirstRow = indexOfLastRow - rowsPerPage;

const currentInventory = sortedInventory.slice(
  indexOfFirstRow,
  indexOfLastRow
);

const totalPages = Math.ceil(sortedInventory.length / rowsPerPage);


  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Institute Inventory
      </h2>

      {sortedInventory.length === 0 ? (
        <p className="text-center text-gray-600">No medicines found.</p>
      ) : (
        <div>
          <div className="flex justify-end mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">
              Rows per page:
            </span>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={rowsPerPage}
              onChange={handleRowsChange}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>

        <table className="w-full border border-gray-300 rounded-lg shadow-md">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border">S.No</th>
              <th className="p-3 border">Medicine Name</th>
              <th className="p-3 border">Manufacturer</th>
              <th className="p-3 border">Quantity</th>
              <th className="p-3 border">Threshold</th>
              <th className="p-3 border">Expiry Date</th>
              <th className="p-3 border">Warnings</th>
            </tr>
          </thead>

          <tbody>
            {currentInventory.map((item, index) => {
              const daysLeft = daysFromToday(item.expiryDate);
              const isExpired = daysLeft < 0;
              const nearExpiry = daysLeft >= 0 && daysLeft <= 5;
              const lowStock = item.quantity < item.threshold;

              return (
                <tr
                  key={index}
                  className="text-center"
                  style={{
                    backgroundColor: isExpired
                      ? "#ffcccc"
                      : nearExpiry
                      ? "#fff3cd"
                      : lowStock
                      ? "#fcebea"
                      : "white",
                    fontWeight: isExpired ? "bold" : "normal",
                  }}
                >
                  <td className="p-2 border">{indexOfFirstRow + index + 1}</td>
                  <td className="p-2 border">{item.medicineName}</td>
                  <td className="p-2 border">{item.manufacturerName}</td>
                  <td className="p-2 border">{item.quantity}</td>
                  <td className="p-2 border">{item.threshold}</td>
                  <td className="p-2 border">
                    {formatDateDMY(item.expiryDate)}
                  </td>
                  <td className="p-2 border">
                    {isExpired && (
                      <span className="text-danger fw-bold">
                        ❌ EXPIRED
                      </span>
                    )}
                    {!isExpired && nearExpiry && (
                      <span className="text-warning fw-bold">
                        ⏰ Expires in {daysLeft} day(s)
                      </span>
                    )}
                    {!isExpired && lowStock && (
                      <div className="text-danger fw-semibold">
                        ⚠️ Low Stock
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex justify-center items-center gap-2 mt-5">
          <button
            className="px-3 py-1 border rounded text-sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Previous
          </button>

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

          <button
            className="px-3 py-1 border rounded text-sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>

        </div>
      )}
    </div>
  );
}

export default InstituteInventory;
