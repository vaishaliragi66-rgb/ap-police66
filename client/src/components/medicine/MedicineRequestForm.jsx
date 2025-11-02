import React, { useState } from 'react';

const MedicineRequestForm = () => {
  const [formData, setFormData] = useState({
    instituteId: '',
    medicineCode: '',
    quantity: '',
  });
  const [showModal, setShowModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 border border-gray-300 rounded-lg bg-gray-50 shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Medicine Request</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Institute ID:</label>
          <input
            type="text"
            name="instituteId"
            value={formData.instituteId}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block font-medium">Medicine Code:</label>
          <input
            type="text"
            name="medicineCode"
            value={formData.medicineCode}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block font-medium">Quantity:</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600"
        >
          Submit Request
        </button>
      </form>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4">Request Sent</h3>
            <p>Your request has been sent and is waiting for approval.</p>
            <button
              onClick={closeModal}
              className="mt-4 py-2 px-4 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineRequestForm;