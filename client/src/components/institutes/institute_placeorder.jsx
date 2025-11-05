import React, { useState, useEffect } from "react";
import axios from "axios";

function Institutes_placeorder() {
  const [formData, setFormData] = useState({
    Manufacturer_Name: "",
    Manufacturer_ID: "",
    Medicine_Name: "",
    Quantity_Requested: "",
  });

  const [manufacturers, setManufacturers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [message, setMessage] = useState("");

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || 5000;

  // 🔹 Fetch manufacturers on mount
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

  // 🔹 Fetch medicines for selected manufacturer
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

  // Handle manufacturer select
  const handleManufacturerChange = (e) => {
    const selectedId = e.target.value;
    const selectedManufacturer = manufacturers.find((m) => m._id === selectedId);
    setFormData({
      ...formData,
      Manufacturer_ID: selectedId,
      Manufacturer_Name: selectedManufacturer
        ? selectedManufacturer.Manufacturer_Name
        : "",
      Medicine_Name: "",
      Quantity_Requested: "",
    });
    setMedicines([]);
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ✅ Handle form submit — call /institute-api
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const instituteId = localStorage.getItem("instituteId");
      if (!instituteId) {
        setMessage("Institute not logged in!");
        return;
      }

      const res = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/place_order/${instituteId}`,
        formData
      );

      setMessage(res.data.message || "Order placed successfully!");
      setFormData({
        Manufacturer_Name: "",
        Manufacturer_ID: "",
        Medicine_Name: "",
        Quantity_Requested: "",
      });
      setMedicines([]);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Error placing order");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{
        minHeight: "90vh",
        backgroundColor: "#f0f2f5",
        padding: "20px",
      }}
    >
      <div
        className="card shadow"
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "30px",
          width: "400px",
          maxWidth: "90%",
        }}
      >
        <h3 className="text-center text-primary mb-4 fw-bold">Place New Order</h3>

        <form onSubmit={handleSubmit}>
          {/* Manufacturer dropdown */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Select Manufacturer</label>
            <select
              name="Manufacturer_ID"
              value={formData.Manufacturer_ID}
              onChange={(e) => {
                const selectedManufacturer = manufacturers.find(
                  (m) => m._id === e.target.value
                );
                setFormData({
                  ...formData,
                  Manufacturer_ID: selectedManufacturer?._id || "",
                  Manufacturer_Name: selectedManufacturer?.Manufacturer_Name || "",
                });
              }}
              className="form-select"
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


          {/* Medicine dropdown */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Select Medicine</label>
            <select
              name="Medicine_Name"
              value={formData.Medicine_Name}
              onChange={handleChange}
              className="form-select"
              required
              disabled={!formData.Manufacturer_ID}
            >
              <option value="">-- Select Medicine --</option>
              {medicines.map((med) => (
                <option key={med._id} value={med.Medicine_Name}>
                  {med.Medicine_Name}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Quantity</label>
            <input
              type="number"
              name="Quantity_Requested"
              value={formData.Quantity_Requested}
              onChange={handleChange}
              className="form-control"
              placeholder="Enter Quantity"
              required
            />
          </div>

          <div className="text-center">
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 fw-semibold rounded-3"
            >
              Place Order
            </button>
          </div>
        </form>

        {message && (
          <p
            className={`text-center mt-3 ${
              message.toLowerCase().includes("error")
                ? "text-danger"
                : "text-success"
            } fw-semibold`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default Institutes_placeorder;
