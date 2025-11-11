import React, { useEffect, useState } from "react";
import { Modal } from "bootstrap";
import { FaPills, FaSearch } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

function Medicines_table() {
  const [medicines, setMedicines] = useState([]);
  const [filteredMeds, setFilteredMeds] = useState([]);
  const [selectedMed, setSelectedMed] = useState(null);
  const [formData, setFormData] = useState({
    Medicine_Name: "",
    Type: "",
    Category: "",
    Quantity: "",
    Threshold_Qty: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const manufacturer = JSON.parse(localStorage.getItem("manufacturer"));
  const manufacturerId = manufacturer?._id;

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
      setFilteredMeds(data);
    } catch (err) {
      console.error("Error fetching medicines:", err);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredMeds(
      medicines.filter(
        (med) =>
          med.Medicine_Name.toLowerCase().includes(term) ||
          med.Medicine_Code.toLowerCase().includes(term) ||
          (med.Type && med.Type.toLowerCase().includes(term)) ||
          (med.Category && med.Category.toLowerCase().includes(term))
      )
    );
  };

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
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
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-start"
      style={{
        backgroundColor: "#f5f6f7",
        paddingTop: "65px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div className="text-center mb-3">
        <h2
          className="fw-bold text-dark mb-2"
          style={{ fontSize: "2.3rem", letterSpacing: "0.3px" }}
        >
          <FaPills className="me-2 mb-1 text-dark" />
          Medicine Master
        </h2>
        <p className="text-muted mb-3" style={{ fontSize: "0.9rem" }}>
          Manage and monitor medicines under your manufacturer
        </p>

        {/* Search Bar */}
        <div
          className="d-flex align-items-center justify-content-center mb-4"
          style={{
            maxWidth: "400px",
            width: "90%",
            position: "relative",
          }}
        >
          <FaSearch
            style={{
              position: "absolute",
              left: "14px",
              color: "#888",
              fontSize: "0.9rem",
            }}
          />
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={handleSearch}
            className="form-control shadow-sm"
            style={{
              paddingLeft: "35px",
              borderRadius: "20px",
              backgroundColor: "#f9f9f9",
              border: "1px solid #ddd",
              height: "40px",
              fontSize: "0.9rem",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => (e.target.style.boxShadow = "0 0 0 3px #e5e5e5")}
            onBlur={(e) => (e.target.style.boxShadow = "none")}
          />
        </div>
      </div>

      {/* Table Card */}
      <div
        className="bg-white rounded-4 shadow-sm p-4 w-100"
        style={{
          maxWidth: "1200px",
          border: "1px solid #e5e5e5",
          boxShadow:
            "0 8px 25px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div className="table-responsive">
          <table className="table align-middle text-center mb-0">
            <thead
              style={{
                backgroundColor: "#111",
                color: "#fff",
                fontSize: "0.95rem",
              }}
            >
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Threshold</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: "0.92rem" }}>
              {filteredMeds.length > 0 ? (
                filteredMeds.map((med) => (
                  <tr
                    key={med._id}
                    style={{
                      transition: "background-color 0.25s ease",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f9f9f9")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td>{med.Medicine_Code}</td>
                    <td className="fw-semibold text-dark">{med.Medicine_Name}</td>
                    <td>{med.Type || "-"}</td>
                    <td>{med.Category || "-"}</td>
                    <td>{med.Quantity}</td>
                    <td>{med.Threshold_Qty}</td>
                    <td>
                      <button
                        className="btn btn-sm me-2"
                        style={{
                          backgroundColor: "#f1f1f1",
                          color: "#222",
                          border: "none",
                          fontWeight: "500",
                          padding: "5px 12px",
                          borderRadius: "6px",
                        }}
                        onClick={() => openUpdateModal(med)}
                      >
                        Update
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{
                          backgroundColor: "#000",
                          color: "#fff",
                          border: "none",
                          padding: "5px 12px",
                          borderRadius: "6px",
                        }}
                        onClick={() => handleDelete(med._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-muted py-3">
                    No medicines found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Modal */}
      <div
        className="modal fade"
        id="updateModal"
        tabIndex="-1"
        aria-labelledby="updateModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow rounded-3">
            <form onSubmit={handleUpdateSubmit}>
              <div className="modal-header border-0 pb-0">
                <h5
                  className="modal-title text-dark fw-semibold"
                  id="updateModalLabel"
                >
                  Update Medicine
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                ></button>
              </div>

              <div className="modal-body pt-2">
                {["Medicine_Name", "Type", "Category", "Quantity", "Threshold_Qty"].map(
                  (field) => (
                    <div className="mb-3" key={field}>
                      <label className="form-label text-muted small">
                        {field.replace("_", " ")}
                      </label>
                      <input
                        type={field.includes("Quantity") ? "number" : "text"}
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        required
                        className="form-control"
                        style={{
                          backgroundColor: "#f9f9f9",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>
                  )
                )}
              </div>

              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light"
                  data-bs-dismiss="modal"
                  style={{
                    border: "1px solid #ccc",
                    color: "#333",
                    fontWeight: "500",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-dark"
                  style={{
                    backgroundColor: "#000",
                    borderRadius: "8px",
                    fontWeight: "500",
                  }}
                >
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
