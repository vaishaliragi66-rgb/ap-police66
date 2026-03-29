// src/pages/TransferMainStoreMedicine.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaExchangeAlt } from "react-icons/fa";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;


export default function TransferMainStoreMedicine() {

  const [medicines, setMedicines] = useState([]);
  const [institutes, setInstitutes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");
 const institute = JSON.parse(localStorage.getItem("institute"));
  const CURRENT_INSTITUTE_ID = institute?._id;   // ? FIXED

  const [formData, setFormData] = useState({
    Medicine_ID: "",
    Transfer_Qty: "",
    Transfer_To: "institute",

    // for institute ? institute
    To_Institute_ID: "",

    // for substore
    Institute_ID: CURRENT_INSTITUTE_ID,
    Remarks: ""
  });

  // Frontend-only institutes list to show in the dropdown (won't create server records)
  const FRONTEND_INSTITUTES = [
    "Chief Office, Hyderabad",
    "1st Battalion, Yousufguda",
    "2nd Battalion, Asifabad",
    "3rd Battalion, Ibrahimpatnam",
    "4th Battalion, Nampally",
    "5th Battalion, Bhoopalapally",
    "6th Battalion, Kothagudem",
    "7th Battalion, Dichpally",
    "8th Battalion, Kondapur",
    "9th Battalion",
    "10th Battalion, Beechupally",
    "11th Battalion",
    "12th Battalion, Anantapur",
    "13th Battalion, Mancherial",
    "14th Battalion",
    "15th Battalion, Sattupally",
    "16th Battalion",
    "17th Battalion, Siricilla",
    "PTC - Warangal",
    "PTC - Karimnagar",
    "PTC - Medchal",
    "SAR CPL, Amberpet",
    "CAR, Gachibowli",
    "RBVRR TSPA",
    "GREYHOUNDS",
    "OCTOPUS"
  ];

  // ? Load Main Store Medicines
  const loadMedicines = async () => {
  try {
    if (!CURRENT_INSTITUTE_ID) {
      console.error("Institute ID missing");
      return;
    }

    const res = await axios.get(
      `${BACKEND_URL}/mainstore/all-medicines/${CURRENT_INSTITUTE_ID}`
    );

    setMedicines(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error("Medicine load failed", err);
    setMedicines([]);
  }
};



  // ? Load Institutes EXCEPT currently opened one
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

    // Append frontend-only institutes if they are not already present (avoid duplicates by name)
    const existingNames = new Set((Array.isArray(list) ? list : []).map(i => (i.Institute_Name || "").toString().trim()));
    const toAppend = FRONTEND_INSTITUTES
      .filter(n => !existingNames.has(n))
      .map((n, idx) => ({ _id: `frontend-${idx}-${n.replace(/\s+/g,'-')}`, Institute_Name: n }));

    if (toAppend.length > 0) {
      setInstitutes(prev => ([...prev, ...toAppend]));
    }

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

  try {
    setLoading(true);
    setError("");
    setSuccess("");

    let endpoint = "";
    let payload = {};

    // ===============================
    // INSTITUTE ? INSTITUTE
    // ===============================
    if (formData.Transfer_To === "institute") {
      if (!formData.To_Institute_ID) {
        setError("Please select target institute");
        setLoading(false);
        return;
      }

      endpoint = "/mainstore/transfer/institute";

      payload = {
        Medicine_ID: formData.Medicine_ID,
        Transfer_Qty: formData.Transfer_Qty,

        // ?? BOTH INSTITUTES
        From_Institute_ID: CURRENT_INSTITUTE_ID,
        To_Institute_ID: formData.To_Institute_ID,
        Remarks: formData.Remarks
      };
    }

    // ===============================
    // INSTITUTE ? SUBSTORE
    // ===============================
    else {
      endpoint = "/mainstore/transfer/substore";

      payload = {
        Medicine_ID: formData.Medicine_ID,
        Transfer_Qty: formData.Transfer_Qty,

        // ?? SAME INSTITUTE
        Institute_ID: CURRENT_INSTITUTE_ID,
        Remarks: formData.Remarks
      };
    }

    console.log("FINAL TRANSFER PAYLOAD:", payload);

    const res = await axios.post(`${BACKEND_URL}${endpoint}`, payload);

    setSuccess(res.data.message || "Transfer successful");

    setFormData(prev => ({
      ...prev,
      Transfer_Qty: "",
      To_Institute_ID: "",
      Remarks: ""
    }));

    loadMedicines();

  } catch (err) {
    setError(
      err.response?.data?.message ||
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
        <h3 className="fw-bold">Transfer Medicine � Main Store</h3>
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
                    {m.Medicine_Name} ({m.Medicine_Code}) � Stock {m.Quantity}
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
                  name="To_Institute_ID"
                  value={formData.To_Institute_ID}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="form-select"
                >
                  <option value="">Choose Institute</option>

                  {institutes.map(inst => (
                    <option key={inst._id} value={inst._id}>
                      {inst.Institute_Name} � {inst.Address?.District}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {formData.Transfer_To === "institute" && (
              <div className="mb-3">
                <label className="form-label fw-semibold">Remarks</label>
                <input
                  name="Remarks"
                  value={formData.Remarks}
                  onChange={handleChange}
                  disabled={loading}
                  className="form-control"
                  placeholder="Optional"
                />
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
