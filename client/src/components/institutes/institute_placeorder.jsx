import React, { useState, useEffect } from "react";
import axios from "axios";

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

  // Fetch manufacturers on mount
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

  // Fetch medicines for selected manufacturer
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

  // Handle manufacturer selection
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

  // Handle medicine selection
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

  // Submit form
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

      setMessage(res.data.message || "Order placed successfully!");
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
      setMessage(err.response?.data?.message || "Error placing order");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "90vh", backgroundColor: "#f0f2f5", padding: "20px" }}
    >
      <div
        className="card shadow"
        style={{ backgroundColor: "white", borderRadius: "12px", padding: "30px", width: "400px", maxWidth: "90%" }}
      >
        <h3 className="text-center text-primary mb-4 fw-bold">Place New Order</h3>

        <form onSubmit={handleSubmit}>
          {/* Manufacturer dropdown */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Select Manufacturer</label>
            <select
              value={formData.Manufacturer_ID}
              onChange={handleManufacturerChange}
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
              value={formData.Medicine_ID}
              onChange={handleMedicineChange}
              className="form-select"
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
            <button type="submit" className="btn btn-primary px-4 py-2 fw-semibold rounded-3">
              Place Order
            </button>
          </div>
        </form>

        {message && (
          <p className={`text-center mt-3 ${message.toLowerCase().includes("error") ? "text-danger" : "text-success"} fw-semibold`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default Institutes_placeorder;
