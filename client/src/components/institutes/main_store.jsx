// src/pages/MainStore.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Format date to show only MM-YYYY
const formatExpiryDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}-${year}`;
};

export default function MainStore() {

  const navigate = useNavigate();
  // Sanitize display name to remove replacement characters
  const sanitizeName = (s) => {
    if (!s && s !== 0) return "";
    return String(s).replace(/\uFFFD/g, "").replace(/�/g, "").trim();
  };
  const [medicines, setMedicines] = useState([]);
  const [nonDeletable, setNonDeletable] = useState(new Set());
  const [loading, setLoading] = useState(true);
const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 8;
const indexOfLast = currentPage * rowsPerPage;
const indexOfFirst = indexOfLast - rowsPerPage;
const currentMedicines = medicines.slice(indexOfFirst, indexOfLast);
const totalPages = Math.ceil(medicines.length / rowsPerPage);


  // modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);

 const fetchMedicines = async () => {
  try {
    const institute = JSON.parse(localStorage.getItem("institute"));
    const instituteId = institute?._id;

    if (!instituteId) {
      alert("Institute not found in session");
      return;
    }

    const res = await axios.get(
      `${BACKEND_URL}/mainstore/all-medicines/${instituteId}`
    );

    setMedicines(res.data || []);
    // after loading medicines, also fetch ledger to determine non-deletable medicines
    try {
      const ledgerRes = await axios.get(`${BACKEND_URL}/ledger-api/institute/${instituteId}`);
      const ledger = Array.isArray(ledgerRes.data?.ledger) ? ledgerRes.data.ledger : [];
      const ids = new Set(ledger.map(l => (l.Medicine_ID && l.Medicine_ID._id) ? l.Medicine_ID._id.toString() : (l.Medicine_ID ? String(l.Medicine_ID) : null)).filter(Boolean));
      setNonDeletable(ids);
    } catch (e) {
      console.warn('Could not load ledger for delete-protection', e);
      setNonDeletable(new Set());
    }
  } catch (err) {
    console.error(err);
    alert("Failed to load medicines");
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchMedicines();
  }, []);

  // -------- DELETE MEDICINE ----------
  const deleteMedicine = async (id) => {
    // Prevent deletion if ledger shows transactions for this medicine
    if (nonDeletable.has(String(id))) {
      alert("Cannot delete medicine that has transaction history or remaining stock.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this medicine?")) return;

    try {
      await axios.delete(`${BACKEND_URL}/mainstore/delete/${id}`);
      alert("Medicine deleted successfully");
      fetchMedicines();
      setCurrentPage(1);

    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete medicine");
    }
  };

  // -------- OPEN EDIT MODAL ----------
  const openEditModal = (medicine) => {
    setSelectedMed({ ...medicine });
    setShowModal(true);
  };

  // -------- HANDLE EDIT INPUT ----------
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setSelectedMed(prev => ({ ...prev, [name]: value }));
  };

  // -------- UPDATE MEDICINE ----------
  const updateMedicine = async () => {
    try {
      await axios.put(
        `${BACKEND_URL}/mainstore/update/${selectedMed._id}`,
        selectedMed
      );

      alert("Medicine updated successfully");
      setShowModal(false);
      fetchMedicines();
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    }
  };

  return (
    <div className="container py-4">
      <h3 className="fw-bold mb-3">Main Store</h3>

      <div className="d-flex gap-3 mb-3">
        <button className="btn btn-primary"
          onClick={() => navigate("/institutes/add")}>
          Receipt
        </button>

        <button className="btn btn-success"
          onClick={() => navigate("/institutes/transfer")}>
          Transfer Medicine
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-header fw-semibold">
          Main Store Stock ({medicines.length})
        </div>

        {loading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : medicines.length === 0 ? (
          <div className="p-4 text-center fw-bold text-muted">
            No medicines available
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Strength</th>
                  <th>Received From</th>
                  <th>Qty</th>
                  <th>Threshold</th>
                  <th>Expiry</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {currentMedicines.map(med => (

                  <tr key={med._id}>
                    <td className="text-uppercase">{sanitizeName(med.Medicine_Code)}</td>
                    <td className="text-uppercase">{sanitizeName(med.Medicine_Name)}</td>
                    <td>{sanitizeName(med.Strength) || "-"}</td>
                    <td className="text-uppercase">{sanitizeName(med.Issued_By)}</td>
                    <td>{med.Quantity}</td>
                    <td>{med.Threshold_Qty}</td>
                    <td>{formatExpiryDate(med.Expiry_Date)}</td>

                    <td className="text-center">

                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => openEditModal(med)}
                      >
                        Update
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteMedicine(med._id)}
                      >
                        Delete
                      </button>

                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
            {/* Pagination */}
<div className="d-flex justify-content-center mt-3">
  <nav>
    <ul className="pagination">

      <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
        <button
          className="page-link"
          onClick={() => setCurrentPage(prev => prev - 1)}
        >
          Previous
        </button>
      </li>

      {[...Array(totalPages)].map((_, index) => (
        <li
          key={index}
          className={`page-item ${
            currentPage === index + 1 ? "active" : ""
          }`}
        >
          <button
            className="page-link"
            onClick={() => setCurrentPage(index + 1)}
          >
            {index + 1}
          </button>
        </li>
      ))}

      <li
        className={`page-item ${
          currentPage === totalPages ? "disabled" : ""
        }`}
      >
        <button
          className="page-link"
          onClick={() => setCurrentPage(prev => prev + 1)}
        >
          Next
        </button>
      </li>

    </ul>
  </nav>
</div>



          </div>
        )}
      </div>


      {/* ================= UPDATE MODAL ================= */}
      {showModal && selectedMed && (
        <div className="modal fade show d-block"
             style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">

              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  Update Medicine — {sanitizeName(selectedMed.Medicine_Name)}
                </h5>

                <button className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)} />
              </div>

              <div className="modal-body">

                <div className="row g-3">

                  <div className="col-md-4">
                    <label>Medicine Name</label>
                    <input
                      name="Medicine_Name"
                      className="form-control"
                      style={{ textTransform: "uppercase" }}
                      value={selectedMed.Medicine_Name}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="col-md-3">
                    <label>Strength</label>
                    <input
                      name="Strength"
                      className="form-control"
                      value={selectedMed.Strength || ""}
                      onChange={handleEditChange}
                      placeholder="500mg"
                    />
                  </div>

                  <div className="col-md-3">
                    <label>Quantity</label>
                    <input
                      type="number"
                      name="Quantity"
                      className="form-control"
                      value={selectedMed.Quantity}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="col-md-3">
                    <label>Threshold</label>
                    <input
                      type="number"
                      name="Threshold_Qty"
                      className="form-control"
                      value={selectedMed.Threshold_Qty}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label>Received From</label>
                    <input
                      name="Issued_By"
                      className="form-control"
                      style={{ textTransform: "uppercase" }}
                      value={selectedMed.Issued_By}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label>Expiry Date</label>
                    <input
                      type="month"
                      name="Expiry_Date"
                      className="form-control"
                      value={selectedMed.Expiry_Date ? selectedMed.Expiry_Date.slice(0, 7) : ""}
                      onChange={(e) => {
                        // Set day to 1 for month-year format
                        if (e.target.value) {
                          const year = (e.target.value.split("-")[0] || "");
                          if (year.length > 4) return;
                          handleEditChange({ target: { name: "Expiry_Date", value: e.target.value + "-01" } });
                        } else {
                          handleEditChange({ target: { name: "Expiry_Date", value: "" } });
                        }
                      }}
                    />
                  </div>

                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary"
                  onClick={() => setShowModal(false)}>
                  Cancel
                </button>

                <button className="btn btn-primary"
                  onClick={updateMedicine}>
                  Save Changes
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
