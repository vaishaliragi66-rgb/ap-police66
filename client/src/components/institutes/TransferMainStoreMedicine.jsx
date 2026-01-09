// src/pages/TransferMainStoreMedicine.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaExchangeAlt } from "react-icons/fa";

const BACKEND_URL = "http://localhost:6100";

export default function TransferMainStoreMedicine() {

  const [medicines, setMedicines] = useState([]);
  const [institutes, setInstitutes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    Medicine_ID: "",
    Transfer_Qty: "",
    Institute_ID: "",
    Transfer_To: "institute"
  });

  // ✅ Load Main Store Medicines
  const loadMedicines = async () => {
  try {
    const res = await axios.get(`${BACKEND_URL}/mainstore/all-medicines`);

    console.log("Medicines API Response →", res.data);

    // backend might return:
    // []  OR  { medicines: [] } OR {data:[]}

    let list = res.data;

    if (Array.isArray(res.data?.medicines)) {
      list = res.data.medicines;
    }

    if (!Array.isArray(list)) {
      list = [];
    }

    setMedicines(list);

  } catch (err) {
    console.error("Medicine load failed", err);
    setMedicines([]);   // <-- always keep as array
  }
};


  // ✅ Load Institutes EXCEPT currently opened one
 const loadInstitutes = async () => {
  try {
    const stored = localStorage.getItem("institute");
    if (!stored) return;

    const current = JSON.parse(stored);
    const CURRENT_ID = current?._id;
    console.log(
  "Fetching institutes from:",
  `${BACKEND_URL}/institute-api/except/${CURRENT_ID}`
);

    const res = await axios.get(
      `${BACKEND_URL}/institute-api/except/${CURRENT_ID}`
    );

    const list =
      Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.institutes)
        ? res.data.institutes
        : [];

    setInstitutes(list);

  } catch (err) {
    console.error("Institute load error", err);
    setInstitutes([]);
    setError("Failed to load institutes");
  }
};

  useEffect(() => {
    loadMedicines();
    loadInstitutes();
  }, []);

  // Handle change
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (error) setError("");
    if (success) setSuccess("");
  };

  // Submit Transfer
  const handleTransfer = async (e) => {
    e.preventDefault();

    if (!formData.Medicine_ID || !formData.Transfer_Qty) {
      setError("Please select medicine and quantity");
      return;
    }

    if (formData.Transfer_To === "institute" && !formData.Institute_ID) {
      setError("Please select an institute");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const endpoint =
        formData.Transfer_To === "institute"
          ? "/mainstore/transfer/institute"
          : "/mainstore/transfer/substore";

      const res = await axios.post(`${BACKEND_URL}${endpoint}`, formData);

      setSuccess(res.data.message || "Medicine transferred successfully");

      // reset qty only
      setFormData(prev => ({
        ...prev,
        Transfer_Qty: ""
      }));

      loadMedicines();

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Transfer failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">

      {/* Header */}
      <div className="text-center mb-3">
        <h3 className="fw-bold">Transfer Medicine — Main Store</h3>
        <p className="text-muted">
          Move stock from Main Store to Institute or Sub-Store
        </p>
      </div>

      {/* Card */}
      <div className="card shadow-sm mx-auto" style={{ maxWidth: "650px" }}>
        <div className="card-body">

          {/* Icon */}
          <div className="d-flex justify-content-center mb-2">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: "70px",
                height: "70px",
                background: "#f1f3f2",
                boxShadow: "inset 0 0 6px rgba(0,0,0,.08)"
              }}
            >
              <FaExchangeAlt size={28} />
            </div>
          </div>

          {/* Error */}
          {error && <div className="alert alert-danger py-2">{error}</div>}

          {/* Success */}
          {success && <div className="alert alert-success py-2">{success}</div>}

          {/* FORM */}
          <form onSubmit={handleTransfer}>

            {/* Medicine */}
            <div className="mb-3">
              <label className="form-label fw-semibold">Select Medicine *</label>

              <select
                name="Medicine_ID"
                value={formData.Medicine_ID}
                onChange={handleChange}
                disabled={loading}
                required
                className="form-select"
              >
                <option value="">Choose Medicine</option>

                {medicines.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.Medicine_Name} ({m.Medicine_Code}) — Stock {m.Quantity}
                  </option>
                ))}
              </select>
            </div>

            <div className="row">

              {/* Quantity */}
              <div className="col-md-6 mb-3">
                <label className="form-label fw-semibold">Transfer Quantity *</label>
                <input
                  type="number"
                  name="Transfer_Qty"
                  value={formData.Transfer_Qty}
                  onChange={handleChange}
                  min="1"
                  required
                  disabled={loading}
                  className="form-control"
                />
              </div>

              {/* Transfer To */}
              <div className="col-md-6 mb-3">
                <label className="form-label fw-semibold">Transfer To *</label>

                <select
                  name="Transfer_To"
                  value={formData.Transfer_To}
                  onChange={handleChange}
                  disabled={loading}
                  className="form-select"
                >
                  <option value="institute">Institute</option>
                  <option value="substore">Sub Store</option>
                </select>
              </div>
            </div>

            {/* Institutes (exclude current) */}
            {formData.Transfer_To === "institute" && (
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Select Institute *
                </label>

                <select
                  name="Institute_ID"
                  value={formData.Institute_ID}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="form-select"
                >
                  <option value="">Choose Institute</option>

                  {institutes.map(inst => (
                    <option key={inst._id} value={inst._id}>
                      {inst.Institute_Name} — {inst.Address?.District}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Substore note */}
            {formData.Transfer_To === "substore" && (
              <div className="alert alert-info py-2 small">
                Sub-Store transfer does not require ID
              </div>
            )}

            {/* Submit */}
            <div className="mt-3">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-dark w-100"
              >
                {loading ? "Processing..." : "Transfer Medicine"}
              </button>
            </div>

          </form>
        </div>

        <div className="card-footer text-center text-muted small">
          Stock will be deducted from Main Store after transfer
        </div>
      </div>
    </div>
  );
}