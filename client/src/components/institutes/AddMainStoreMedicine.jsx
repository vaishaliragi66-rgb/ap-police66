import React, { useState } from "react";
import axios from "axios";
import { FaPills, FaCalendarAlt } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
const AddMainStoreMedicine = () => {
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || 6100;

  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    Institute_ID: localStorage.getItem("instituteId"),
    Medicine_Code: "",
    Medicine_Name: "",
    Type: "",
    Category: "",
    Quantity: "",
    Threshold_Qty: "",
    Issued_By: "",
    Expiry_Date: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  // tomorrow = min expiry
  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const required = [
      "Medicine_Code",
      "Medicine_Name",
      "Quantity",
      "Threshold_Qty",
      "Issued_By",
      "Expiry_Date"
    ];

    const missing = required.filter(f => !formData[f]);
    if (missing.length > 0) {
      setError("Please fill required fields: " + missing.join(", "));
      return;
    }

    if (Number(formData.Quantity) <= 0 || Number(formData.Threshold_Qty) <= 0) {
      setError("Quantity & Threshold must be positive numbers");
      return;
    }

    const expiry = new Date(formData.Expiry_Date);
    const today = new Date();
    today.setHours(0,0,0,0);
    expiry.setHours(0,0,0,0);

    if (expiry <= today) {
      setError("Expiry date must be in the future (tomorrow or later)");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/mainstore/add`,
        {
          ...formData,
          Quantity: Number(formData.Quantity),
          Threshold_Qty: Number(formData.Threshold_Qty)
        }
      );

      setSuccess(res.data.message || "Medicine added to Main Store");

      setFormData({
        Institute_ID: localStorage.getItem("instituteId"),
        Medicine_Code: "",
        Medicine_Name: "",
        Type: "",
        Category: "",
        Quantity: "",
        Threshold_Qty: "",
        Issued_By: "",
        Expiry_Date: ""
      });

    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to add medicine";

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#f7f7f7] px-4 pt-16">

      {/* Header */}
      <div className="text-center mb-5">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
          Add Medicine — Main Store
        </h2>
        <p className="text-gray-500 mt-1 text-sm">
          Register a new medicine into the central store inventory
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

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 text-left">

          {/* Medicine Code */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Medicine Code *
            </label>
            <input
              name="Medicine_Code"
              value={formData.Medicine_Code}
              onChange={handleChange}
              disabled={loading}
              required
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-sm focus:ring-2 focus:ring-black"
              placeholder="MS-001"
            />
          </div>

          {/* Medicine Name */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Medicine Name *
            </label>
            <input
              name="Medicine_Name"
              value={formData.Medicine_Name}
              onChange={handleChange}
              disabled={loading}
              required
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-sm focus:ring-2 focus:ring-black"
              placeholder="Paracetamol"
            />
          </div>

          {/* Type Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Type
            </label>
            <select
              name="Type"
              value={formData.Type}
              onChange={handleChange}
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-sm"
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

          {/* Category Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Category
            </label>
            <select
              name="Category"
              value={formData.Category}
              onChange={handleChange}
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-sm"
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

          {/* Issued By */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Issued By *
            </label>
            <input
              name="Issued_By"
              value={formData.Issued_By}
              onChange={handleChange}
              disabled={loading}
              required
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-sm"
              placeholder="AP Police HQ"
            />
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
              min="1"
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-sm"
            />
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Threshold Qty *
            </label>
            <input
              type="number"
              name="Threshold_Qty"
              value={formData.Threshold_Qty}
              onChange={handleChange}
              min="1"
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-sm"
            />
          </div>

          {/* Expiry Date */}
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
              min={getMinDate()}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-sm"
            />

            <p className="text-xs text-gray-500 mt-1">
              Must be a future date (tomorrow or later)
            </p>
          </div>

          {/* Submit */}
          <div className="col-span-2 mt-3">
            <button
              type="submit"
              disabled={loading}
              className={`w-full px-6 py-3 rounded-md text-sm font-medium ${
                loading ? "bg-gray-400" : "bg-black text-white hover:bg-[#111]"
              }`}
            >
              {loading ? "Adding..." : "Add Medicine"}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t text-center border-gray-200">
          <p className="text-gray-400 text-xs">
            © 2025 AP Police Health Division
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddMainStoreMedicine;