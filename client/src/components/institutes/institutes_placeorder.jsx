import React, { useState, useEffect } from "react";
import axios from "axios";

function Institutes_placeorder() {
  const [formData, setFormData] = useState({
    Manufacturer_Name: "",
    Medicine_Name: "",
    Quantity_Requested: "",
  });
  const [manufacturers, setManufacturers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [message, setMessage] = useState("");

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT; // change if backend uses another port

  // 🔹 Fetch all manufacturers on mount
  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/manufacturer-api/manufacturers`
        );
        setManufacturers(res.data);
        console.log(res)
      } catch (err) {
        console.error("Error fetching manufacturers:", err);
      }
    };
    fetchManufacturers();
  }, []);
console.log("Manufacturers:", manufacturers);
  // 🔹 Fetch medicines when manufacturer changes
  useEffect(() => {
    const fetchMedicines = async () => {
      if (!formData.Manufacturer_Name) return;
      try {
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/manufacturer-api/manufacturers/${formData.Manufacturer_Name}/medicines`
        );
        setMedicines(res.data);
      } catch (err) {
        console.error("Error fetching medicines:", err);
        setMedicines([]);
      }
    };
    fetchMedicines();
  }, [formData.Manufacturer_Name]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const instituteId = localStorage.getItem("instituteId");
      if (!instituteId) {
        setMessage("Institute not logged in!");
        return;
      }

      const res = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/api/institute/${instituteId}/placeorder`,
        formData
      );

      setMessage(res.data.message || "Order placed successfully!");
      setFormData({
        Manufacturer_Name: "",
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
        <h3 className="text-center text-primary mb-4 fw-bold">
          Place New Order
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Manufacturer Name Dropdown */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Select Manufacturer</label>
            <select
              name="Manufacturer_Name"
              value={formData.Manufacturer_Name}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">-- Select Manufacturer --</option>
              {manufacturers.map((m) => (
                <option key={m._id} value={m.Manufacturer_Name}>
                  {m.Manufacturer_Name}
                </option>
              ))}
            </select>
          </div>

          {/* Medicine Name Dropdown */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Select Medicine</label>
            <select
              name="Medicine_Name"
              value={formData.Medicine_Name}
              onChange={handleChange}
              className="form-select"
              required
              disabled={!formData.Manufacturer_Name}
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
