import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaCapsules } from "react-icons/fa";

function Institutes_placeorder() {
  const [formData, setFormData] = useState({
    Manufacturer_Name: "",
    Manufacturer_ID: "",
    Medicine_Name: "",
    Medicine_ID: "",
    Quantity_Requested: "",
  });

  const [manufacturers, setManufacturers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [message, setMessage] = useState("");

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || 5000;

  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/manufacturer-api/manufacturers`
        );
        setManufacturers(res.data);
      } catch (err) {
        console.error("Error fetching manufacturers:", err);
      }
    };
    fetchManufacturers();
  }, []);

  useEffect(() => {
    const fetchMedicines = async () => {
      if (!formData.Manufacturer_ID) return;
      try {
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/medicine-api/medicines/${formData.Manufacturer_ID}`
        );
        setMedicines(res.data);
      } catch (err) {
        console.error("Error fetching medicines:", err);
        setMedicines([]);
      }
    };
    fetchMedicines();
  }, [formData.Manufacturer_ID]);

  const handleManufacturerChange = (e) => {
    const selectedId = e.target.value;
    const selectedManufacturer = manufacturers.find((m) => m._id === selectedId);
    setFormData({
      ...formData,
      Manufacturer_ID: selectedId,
      Manufacturer_Name: selectedManufacturer?.Manufacturer_Name || "",
      Medicine_Name: "",
      Medicine_ID: "",
      Quantity_Requested: "",
    });
    setMedicines([]);
  };

  const handleMedicineChange = (e) => {
    const selectedId = e.target.value;
    const selectedMedicine = medicines.find((m) => m._id === selectedId);
    setFormData({
      ...formData,
      Medicine_ID: selectedId,
      Medicine_Name: selectedMedicine?.Medicine_Name || "",
    });
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const instituteId = localStorage.getItem("instituteId");
      if (!instituteId) {
        setMessage("Institute not logged in!");
        return;
      }

      const payload = {
        Manufacturer_ID: formData.Manufacturer_ID,
        Medicine_ID: formData.Medicine_ID,
        Quantity_Requested: formData.Quantity_Requested,
      };

      const res = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/place_order/${instituteId}`,
        payload
      );

      setMessage(res.data.message || "✅ Order placed successfully!");
      setFormData({
        Manufacturer_Name: "",
        Manufacturer_ID: "",
        Medicine_Name: "",
        Medicine_ID: "",
        Quantity_Requested: "",
      });
      setMedicines([]);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "❌ Error placing order");
    }
  };

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100"
      style={{
        backgroundColor: "#fafafa",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <FaCapsules size={45} className="text-dark mb-3" />
        <h1
          className="fw-bold text-dark mb-2"
          style={{ fontSize: "2.5rem", letterSpacing: "0.5px" }}
        >
          Place New Order
        </h1>
        <p className="text-muted" style={{ fontSize: "1rem" }}>
          Select a manufacturer and medicine, then enter the required quantity
        </p>
      </div>

      {/* Centered Card */}
      <div
        className="shadow-sm p-5 rounded-4"
        style={{
          width: "100%",
          maxWidth: "500px",
          backgroundColor: "#ffffff",
          border: "1px solid #e8e8e8",
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.08)",
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Manufacturer Dropdown */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold">
              Select Manufacturer
            </label>
            <select
              value={formData.Manufacturer_ID}
              onChange={handleManufacturerChange}
              className="form-select border-0 shadow-sm"
              style={{
                backgroundColor: "#f9f9f9",
                borderRadius: "10px",
                height: "45px",
              }}
              required
            >
              <option value="">-- Select Manufacturer --</option>
              {manufacturers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.Manufacturer_Name}
                </option>
              ))}
            </select>
          </div>

          {/* Medicine Dropdown */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold">
              Select Medicine
            </label>
            <select
              value={formData.Medicine_ID}
              onChange={handleMedicineChange}
              className="form-select border-0 shadow-sm"
              style={{
                backgroundColor: "#f9f9f9",
                borderRadius: "10px",
                height: "45px",
              }}
              required
              disabled={!formData.Manufacturer_ID}
            >
              <option value="">-- Select Medicine --</option>
              {medicines.map((med) => (
                <option key={med._id} value={med._id}>
                  {med.Medicine_Name}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="mb-4">
            <label className="form-label text-muted small fw-semibold">
              Quantity
            </label>
            <input
              type="number"
              name="Quantity_Requested"
              value={formData.Quantity_Requested}
              onChange={handleChange}
              className="form-control border-0 shadow-sm"
              placeholder="Enter Quantity"
              style={{
                backgroundColor: "#f9f9f9",
                borderRadius: "10px",
                height: "45px",
              }}
              required
            />
          </div>

          {/* Centered Button */}
          <div className="text-center">
            <button
              type="submit"
              className="fw-semibold"
              style={{
                background: "linear-gradient(180deg, #000, #1a1a1a)",
                color: "#fff",
                border: "none",
                borderRadius: "50px",
                padding: "12px 50px",
                fontSize: "1rem",
                letterSpacing: "0.3px",
                transition: "all 0.3s ease",
                boxShadow: "0 3px 6px rgba(0, 0, 0, 0.15)",
              }}
              onMouseOver={(e) => {
                e.target.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.25)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.target.style.boxShadow = "0 3px 6px rgba(0, 0, 0, 0.15)";
                e.target.style.transform = "translateY(0)";
              }}
            >
              Place Order
            </button>
          </div>
        </form>

        {/* Message */}
        {message && (
          <div
            className={`text-center mt-4 fw-semibold ${
              message.startsWith("✅") ? "text-success" : "text-danger"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default Institutes_placeorder;
