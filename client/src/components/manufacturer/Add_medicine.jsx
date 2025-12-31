import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPills, FaCalendarAlt } from "react-icons/fa";

const Add_medicine = () => {
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || 6100;
  const [manufacturer, setManufacturer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    Medicine_Code: "",
    Medicine_Name: "",
    Type: "",
    Category: "",
    Quantity: "",
    Threshold_Qty: "",
    Expiry_Date: ""
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
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) setError(""); // Clear error when user starts typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!manufacturer?._id) {
      setError("Manufacturer ID not found. Please log in again.");
      return;
    }

    // Validate form data
    const requiredFields = [
      "Medicine_Code", "Medicine_Name", "Quantity", 
      "Threshold_Qty", "Expiry_Date"
    ];
    
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(", ")}`);
      return;
    }

    if (Number(formData.Quantity) <= 0 || Number(formData.Threshold_Qty) <= 0) {
      setError("Quantity and Threshold must be positive numbers");
      return;
    }

    // Validate expiry date
    const today = new Date();
    const expiryDate = new Date(formData.Expiry_Date);
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    expiryDate.setHours(0, 0, 0, 0);
    
    if (expiryDate <= today) {
      setError("Expiry date must be in the future (tomorrow or later)");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/medicine-api/medicine_add`,
        {
          ...formData,
          Manufacturer_ID: manufacturer._id,
          Quantity: Number(formData.Quantity),
          Threshold_Qty: Number(formData.Threshold_Qty),
          Expiry_Date: formData.Expiry_Date
        }
      );

      setSuccess(response.data.message || "✅ Medicine added successfully!");
      
      // Reset form
      setFormData({
        Medicine_Code: "",
        Medicine_Name: "",
        Type: "",
        Category: "",
        Quantity: "",
        Threshold_Qty: "",
        Expiry_Date: ""
      });
      
    } catch (error) {
      console.error("Error adding medicine:", error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.join(", ") ||
                          error.response?.data?.error || 
                          error.message || 
                          "❌ Failed to add medicine";
      
      setError(errorMessage);
      
      // If it's a 404, suggest checking server routes
      if (error.response?.status === 404) {
        setError(prev => `${prev}. Please make sure the server is running and routes are properly configured.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (!manufacturer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading manufacturer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#f7f7f7] px-4 pt-16">
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
        className="bg-white shadow-lg border border-gray-200 rounded-xl p-6 w-full max-w-lg"
        style={{
          boxShadow: "0 8px 25px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)",
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
        <p className="text-gray-600 mb-5 text-sm text-center">
          Logged in as <strong>{manufacturer.Manufacturer_Name}</strong> (ID:{" "}
          <span className="font-mono text-gray-700 text-xs">{manufacturer._id}</span>)
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 text-left">
          {/* Medicine Code */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Medicine Code *
            </label>
            <input
              type="text"
              name="Medicine_Code"
              value={formData.Medicine_Code}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-black focus:border-black bg-gray-50 text-sm"
              placeholder="MED001"
            />
          </div>

          {/* Medicine Name */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Medicine Name *
            </label>
            <input
              type="text"
              name="Medicine_Name"
              value={formData.Medicine_Name}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-black focus:border-black bg-gray-50 text-sm"
              placeholder="e.g., Paracetamol"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Type
            </label>
            <select
              name="Type"
              value={formData.Type}
              onChange={handleChange}
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-black focus:border-black bg-gray-50 text-sm"
            >
              <option value="">Select Type</option>
              <option value="Tablet">Tablet</option>
              <option value="Capsule">Capsule</option>
              <option value="Syrup">Syrup</option>
              <option value="Injection">Injection</option>
              <option value="Ointment">Ointment</option>
              <option value="Drops">Drops</option>
              <option value="Inhaler">Inhaler</option>
              <option value="Powder">Powder</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Category
            </label>
            <select
              name="Category"
              value={formData.Category}
              onChange={handleChange}
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-black focus:border-black bg-gray-50 text-sm"
            >
              <option value="">Select Category</option>
              <option value="Antibiotic">Antibiotic</option>
              <option value="Analgesic">Analgesic</option>
              <option value="Antipyretic">Antipyretic</option>
              <option value="Antihistamine">Antihistamine</option>
              <option value="Antacid">Antacid</option>
              <option value="Vitamin">Vitamin</option>
              <option value="Cardiac">Cardiac</option>
              <option value="Diabetic">Diabetic</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Quantity *
            </label>
            <input
              type="number"
              name="Quantity"
              value={formData.Quantity}
              onChange={handleChange}
              required
              min="1"
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-black focus:border-black bg-gray-50 text-sm"
              placeholder="e.g., 1000"
            />
          </div>

          {/* Threshold Quantity */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Threshold Quantity *
            </label>
            <input
              type="number"
              name="Threshold_Qty"
              value={formData.Threshold_Qty}
              onChange={handleChange}
              required
              min="1"
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-black focus:border-black bg-gray-50 text-sm"
              placeholder="e.g., 100"
            />
          </div>

          {/* Expiry Date - Full width */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1">
              <FaCalendarAlt className="text-gray-400" />
              Expiry Date *
            </label>
            <input
              type="date"
              name="Expiry_Date"
              value={formData.Expiry_Date}
              onChange={handleChange}
              required
              min={getMinDate()}
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-black focus:border-black bg-gray-50 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be a future date (tomorrow or later)
            </p>
          </div>

          {/* Button */}
          <div className="col-span-2 text-center mt-3">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-all w-full ${
                loading 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-black text-white hover:bg-[#1a1a1a]"
              }`}
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Adding Medicine...
                </>
              ) : (
                "Add Medicine"
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-center text-gray-400 text-xs">
            © 2025 AP Police Health Division • All medicines must have valid expiry dates
          </p>
          <p className="text-center text-gray-400 text-xs mt-1">
            Required fields are marked with *
          </p>
        </div>
      </div>
    </div>
  );
};

export default Add_medicine;