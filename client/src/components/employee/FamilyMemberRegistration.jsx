import React, { useState } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';

const FamilyMemberRegistration = () => {
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get('employeeId');
  const [familyMembers, setFamilyMembers] = useState([
    { Name: '', Relationship: '', DOB: '', Medical_History: '' },
  ]);
  const navigate = useNavigate();

  const handleChange = (index, e) => {
    const { name, value } = e.target;
    const updatedMembers = [...familyMembers];
    updatedMembers[index][name] = value;
    setFamilyMembers(updatedMembers);
  };

  const addFamilyMember = () => {
    setFamilyMembers([
      ...familyMembers,
      { Name: '', Relationship: '', DOB: '', Medical_History: '' },
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`http://localhost:5200/employee-api/${employeeId}/add-family-members`, {
        familyMembers,
      });
      alert('Family members added successfully!');
      console.log(response.data);
      navigate('/');
    } catch (error) {
      console.error(error);
      alert('An error occurred while adding family members.');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 border border-gray-300 rounded-lg bg-gray-50 shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Add Family Members</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {familyMembers.map((member, index) => (
          <div key={index} className="space-y-2 border-b border-gray-200 pb-4">
            <div>
              <label className="block font-medium">Name:</label>
              <input
                type="text"
                name="Name"
                value={member.Name}
                onChange={(e) => handleChange(index, e)}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium">Relation:</label>
              <input
                type="text"
                name="Relationship"
                value={member.Relationship}
                onChange={(e) => handleChange(index, e)}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium">DOB:</label>
              <input
                type="date"
                name="DOB"
                value={member.DOB}
                onChange={(e) => handleChange(index, e)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium">Medical History:</label>
              <textarea
                name="Medical_History"
                value={member.Medical_History}
                onChange={(e) => handleChange(index, e)}
                className="w-full p-2 border border-gray-300 rounded-md"
              ></textarea>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addFamilyMember}
          className="w-full py-2 px-4 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600"
        >
          + Add Another Family Member
        </button>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600"
        >
          Submit Family Members
        </button>
      </form>
    </div>
  );
};

export default FamilyMemberRegistration;