import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { Modal } from "bootstrap";

function Medicines_table() {
  const [medicines, setMedicines] = useState([]);
  const [selectedMed, setSelectedMed] = useState(null);
  const [formData, setFormData] = useState({
    Medicine_Name: "",
    Quantity: "",
    Threshold_Qty: "",
  });

  // ✅ Get manufacturer ID from localStorage
  const manufacturer = JSON.parse(localStorage.getItem("manufacturer"));
  const manufacturerId = manufacturer?._id;

  // ✅ Fetch medicines belonging to this manufacturer
  const fetchMedicines = async () => {
    try {
      if (!manufacturerId) {
        alert("Manufacturer not logged in!");
        return;
      }

      const res = await fetch(
        `http://localhost:6100/medicine-api/medicines/${manufacturerId}`
      );
      const data = await res.json();
      setMedicines(data);
    } catch (err) {
      console.error("Error fetching medicines:", err);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  // ✅ DELETE medicine (only manufacturer’s)
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this medicine?")) return;
  
    try {
      const res = await fetch(
        `http://localhost:6100/medicine-api/medicine_delete/${id}/${manufacturerId}`,
        { method: "DELETE" }
      );
  
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchMedicines();
      } else {
        alert(data.message || "Delete failed");
      }
    } catch (err) {
      console.error("Error deleting medicine:", err);
    }
  };
  

  // ✅ OPEN update modal
  const openUpdateModal = (med) => {
    setSelectedMed(med);
    setFormData({
      Medicine_Name: med.Medicine_Name,
      Type: med.Type,
      Category: med.Category,
      Quantity: med.Quantity,
      Threshold_Qty: med.Threshold_Qty,
    });

    const modalEl = document.getElementById("updateModal");
    const modal = new Modal(modalEl);
    modal.show();
  };

  // ✅ Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ UPDATE medicine (only manufacturer’s)
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!manufacturerId) {
      alert("Manufacturer not logged in!");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:6100/medicine-api/medicine_update/${selectedMed._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Manufacturer_ID: manufacturerId,
            Medicine_Name: formData.Medicine_Name.trim(),
            Type: formData.Type.trim(),
            Category: formData.Category.trim(),
            Quantity: parseInt(formData.Quantity),
            Threshold_Qty: parseInt(formData.Threshold_Qty),
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        fetchMedicines();
        const modalEl = document.getElementById("updateModal");
        const modal = Modal.getInstance(modalEl);
        modal.hide();
      } else {
        alert(data.message || "Update failed");
      }
    } catch (err) {
      console.error("Error updating medicine:", err);
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4 text-center">Medicine Master</h1>

      <div className="table-responsive">
        <table className="table table-bordered table-striped align-middle">
          <thead className="table-dark text-center">
            <tr>
              <th>Medicine Code</th>
              <th>Medicine Name</th>
              <th>Type</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Threshold Quantity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {medicines.length > 0 ? (
              medicines.map((med) => (
                <tr key={med._id}>
                  <td>{med.Medicine_Code}</td>
                  <td>{med.Medicine_Name}</td>
                  <td>{med.Type || "-"}</td>
                  <td>{med.Category || "-"}</td>
                  <td>{med.Quantity}</td>
                  <td>{med.Threshold_Qty}</td>
                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-warning me-2"
                      onClick={() => openUpdateModal(med)}
                    >
                      Update
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(med._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center">
                  No medicines found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Update Modal */}
      <div
        className="modal fade"
        id="updateModal"
        tabIndex="-1"
        aria-labelledby="updateModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <form onSubmit={handleUpdateSubmit}>
              <div className="modal-header">
                <h5 className="modal-title" id="updateModalLabel">
                  Update Medicine
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Medicine Name</label>
                  <input
                    type="text"
                    name="Medicine_Name"
                    className="form-control"
                    value={formData.Medicine_Name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Type</label>
                  <input
                    type="text"
                    name="Type"
                    className="form-control"
                    value={formData.Type}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    name="Category"
                    className="form-control"
                    value={formData.Category}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    name="Quantity"
                    className="form-control"
                    value={formData.Quantity}
                    onChange={handleChange}
                    required
                    min="0"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Threshold Quantity</label>
                  <input
                    type="number"
                    name="Threshold_Qty"
                    className="form-control"
                    value={formData.Threshold_Qty}
                    onChange={handleChange}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Medicines_table;

