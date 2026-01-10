// src/pages/MainStore.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "http://localhost:6100";

export default function MainStore() {

  const navigate = useNavigate();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

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
    if (!window.confirm("Are you sure you want to delete this medicine?")) return;

    try {
      await axios.delete(`${BACKEND_URL}/mainstore/delete/${id}`);
      alert("Medicine deleted successfully");
      fetchMedicines();
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
          ➕ Add Medicine
        </button>

        <button className="btn btn-success"
          onClick={() => navigate("/institutes/transfer")}>
          🔁 Transfer Medicine
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
                  <th>Issued By</th>
                  <th>Qty</th>
                  <th>Threshold</th>
                  <th>Expiry</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {medicines.map(med => (
                  <tr key={med._id}>
                    <td>{med.Medicine_Code}</td>
                    <td>{med.Medicine_Name}</td>
                    <td>{med.Issued_By}</td>
                    <td>{med.Quantity}</td>
                    <td>{med.Threshold_Qty}</td>
                    <td>{med.Expiry_Date?.split("T")[0]}</td>

                    <td className="text-center">

                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => openEditModal(med)}
                      >
                        ✎ Update
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteMedicine(med._id)}
                      >
                        🗑 Delete
                      </button>

                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
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
                  Update Medicine — {selectedMed.Medicine_Name}
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
                      value={selectedMed.Medicine_Name}
                      onChange={handleEditChange}
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
                    <label>Issued By</label>
                    <input
                      name="Issued_By"
                      className="form-control"
                      value={selectedMed.Issued_By}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label>Expiry Date</label>
                    <input
                      type="date"
                      name="Expiry_Date"
                      className="form-control"
                      value={selectedMed.Expiry_Date?.split("T")[0]}
                      onChange={handleEditChange}
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