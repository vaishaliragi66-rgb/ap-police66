import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPills } from "react-icons/fa"; // 💊 Medicine icon

const Add_medicine = () => {
  const [manufacturer, setManufacturer] = useState(null);
  const [formData, setFormData] = useState({
    Medicine_Code: "",
    Medicine_Name: "",
    Type: "",
    Category: "",
    Quantity: "",
    Threshold_Qty: "",
  });

  useEffect(() => {
    const storedData = localStorage.getItem("manufacturer");

    if (!storedData || storedData === "undefined") {
      alert("⚠️ Manufacturer not logged in!");
      window.location.href = "/manufacturer-login";
      return;
    }

    try {
      const parsed = JSON.parse(storedData);
      const manu = parsed.manufacturer ? parsed.manufacturer : parsed;
      setManufacturer(manu);
    } catch (error) {
      localStorage.removeItem("manufacturer");
      alert("⚠️ Invalid session. Please log in again.");
      window.location.href = "/manufacturer-login";
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!manufacturer?._id) {
      alert("Manufacturer ID not found. Please log in again.");
      return;
    }

    try {
      await axios.post("http://localhost:6100/medicine-api/medicine_add", {
        ...formData,
        Manufacturer_ID: manufacturer._id,
      });

      alert("✅ Medicine added successfully!");
      setFormData({
        Medicine_Code: "",
        Medicine_Name: "",
        Type: "",
        Category: "",
        Quantity: "",
        Threshold_Qty: "",
      });
    } catch (error) {
      alert("❌ Failed to add medicine");
      console.error("Error adding medicine:", error);
    }
  };

  if (!manufacturer) {
    return (
      <div className="text-center mt-10 text-gray-500">
        Loading manufacturer data...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start bg-[#f7f7f7] px-4 pt-16"
    >
      {/* Page Header */}
      <div className="text-center mb-5">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
          Add Medicine
        </h2>
        <p className="text-gray-500 mt-1 text-sm">
          Register a new medicine under your manufacturer account
        </p>
      </div>

      {/* Card */}
      <div
        className="bg-white shadow-lg border border-gray-200 rounded-xl p-6 w-full max-w-lg text-center"
        style={{
          boxShadow:
            "0 8px 25px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {/* Icon */}
        <div
          className="flex justify-center items-center mb-4 mx-auto"
          style={{
            backgroundColor: "#f1f3f2",
            width: "70px",
            height: "70px",
            borderRadius: "50%",
            boxShadow: "inset 0 0 6px rgba(0,0,0,0.08)",
          }}
        >
          <FaPills size={35} color="#333" />
        </div>

        {/* Manufacturer Info */}
        <p className="text-gray-600 mb-5 text-sm">
          Logged in as <strong>{manufacturer.Manufacturer_Name}</strong> (ID:{" "}
          <span className="font-mono text-gray-700">{manufacturer._id}</span>)
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 text-left">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Medicine Code
            </label>
            <input
              type="text"
              name="Medicine_Code"
              value={formData.Medicine_Code}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-0 focus:border-black bg-gray-50 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Medicine Name
            </label>
            <input
              type="text"
              name="Medicine_Name"
              value={formData.Medicine_Name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-0 focus:border-black bg-gray-50 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Type
            </label>
            <input
              type="text"
              name="Type"
              value={formData.Type}
              onChange={handleChange}
              placeholder="e.g., Tablet, Syrup"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-0 focus:border-black bg-gray-50 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Category
            </label>
            <input
              type="text"
              name="Category"
              value={formData.Category}
              onChange={handleChange}
              placeholder="e.g., Antibiotic"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-0 focus:border-black bg-gray-50 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Quantity
            </label>
            <input
              type="number"
              name="Quantity"
              value={formData.Quantity}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-0 focus:border-black bg-gray-50 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Threshold Quantity
            </label>
            <input
              type="number"
              name="Threshold_Qty"
              value={formData.Threshold_Qty}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-0 focus:border-black bg-gray-50 text-sm"
            />
          </div>

          {/* Button */}
          <div className="col-span-2 text-center mt-3">
            <button
              type="submit"
              className="bg-black text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-[#1a1a1a] transition-all"
            >
              Add Medicine
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-gray-400 mt-4 text-xs">
          © 2025 AP Police Health Division
        </p>
      </div>
    </div>
  );
};

export default Add_medicine;
