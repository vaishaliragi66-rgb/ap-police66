import React, { useEffect, useState } from "react";
import axios from "axios";

function InstituteInventory() {
  const [inventory, setInventory] = useState([]);
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const storedInstitute = localStorage.getItem("institute");
        if (!storedInstitute) return;

        const institute = JSON.parse(storedInstitute);
        const instituteId = institute._id;

        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/institute-api/inventory/${instituteId}`
        );

        setInventory(res.data);
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    };

    fetchInventory();
  }, [BACKEND_PORT_NO]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Institute Inventory</h2>

      {inventory.length === 0 ? (
        <p className="text-center text-gray-600">No medicines found.</p>
      ) : (
        <table className="w-full border border-gray-300 rounded-lg shadow-md">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border">S.No</th>
              <th className="p-3 border">Medicine Name</th>
              <th className="p-3 border">Manufacturer</th>
              <th className="p-3 border">Quantity Available</th>
              <th className="p-3 border">Threshold Quantity</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item, index) => (
              <tr key={index} className="text-center">
                <td className="p-2 border">{index + 1}</td>
                <td className="p-2 border">{item.medicineName}</td>
                <td className="p-2 border">{item.manufacturerName}</td>
                <td className="p-2 border">{item.quantity}</td>
                <td className="p-2 border">{item.threshold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default InstituteInventory;
