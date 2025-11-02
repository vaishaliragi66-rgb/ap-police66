import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const EmployeeRegistration = () => {
  const [formData, setFormData] = useState({
    ABS_NO: '',
    Name: '',
    Designation: '',
    DOB: '',
    Address: '',
    Blood_Group: '',
    Medical_History: ''
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5200/employee-api/register', formData);
      alert('Employee registered successfully!');
      console.log(response.data);
      navigate(`/family-member/register?employeeId=${response.data.employee._id}`);
    } catch (error) {
      console.error(error);
      alert('An error occurred while registering the employee.');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 border border-gray-300 rounded-lg bg-gray-50 shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Employee Registration</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">ABS_NO:</label>
          <input
            type="text"
            name="ABS_NO"
            value={formData.ABS_NO}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block font-medium">Name:</label>
          <input
            type="text"
            name="Name"
            value={formData.Name}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block font-medium">Designation:</label>
          <input
            type="text"
            name="Designation"
            value={formData.Designation}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block font-medium">DOB:</label>
          <input
            type="date"
            name="DOB"
            value={formData.DOB}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block font-medium">Address:</label>
          <input
            type="text"
            name="Address"
            value={formData.Address}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block font-medium">Blood Group:</label>
          <input
            type="text"
            name="Blood_Group"
            value={formData.Blood_Group}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block font-medium">Medical History:</label>
          <textarea
            name="Medical_History"
            value={formData.Medical_History}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          ></textarea>
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600"
        >
          Register Employee
        </button>
      </form>
    </div>
  );
};

export default EmployeeRegistration;