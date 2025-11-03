import React, { useEffect, useState } from "react";
import axios from "axios";

function Institute_manufacture() {
  const [orders, setOrders] = useState([]);
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // 🔹 Get logged-in institute data from localStorage
        const storedInstitute = localStorage.getItem("institute");
        console.log("Stored Institute:", storedInstitute);
        if (!storedInstitute) {
          console.error("No institute found in localStorage");
          return;
        }

        const institute = JSON.parse(storedInstitute);
        const instituteId = institute._id; // ✅ use _id from MongoDB

        // 🔹 Fetch orders for that institute
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/institute-api/orders/${instituteId}`
        );

        setOrders(res.data);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, [BACKEND_PORT_NO]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Orders Placed to Manufacturers
      </h2>

      {orders.length === 0 ? (
        <p className="text-center text-gray-600">No orders found.</p>
      ) : (
        <table className="w-full border border-gray-300 rounded-lg shadow-md">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border">S.No</th>
              <th className="p-3 border">Medicine Name</th>
              <th className="p-3 border">Manufacturer</th>
              <th className="p-3 border">Quantity Requested</th>
              <th className="p-3 border">Order Date</th>
              <th className="p-3 border">Delivery Date</th>
              <th className="p-3 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={index} className="text-center">
                <td className="p-2 border">{index + 1}</td>
                <td className="p-2 border">{order.Medicine_ID?.Medicine_Name || "N/A"}</td>
                <td className="p-2 border">{order.Manufacturer_ID?.Manufacturer_Name || "N/A"}</td>
                <td className="p-2 border">{order.Quantity_Requested}</td>
                <td className="p-2 border">
                  {new Date(order.Order_Date).toLocaleDateString()}
                </td>
                <td className="p-2 border">
                  {order.Delivery_Date
                    ? new Date(order.Delivery_Date).toLocaleDateString()
                    : "—"}
                </td>
                <td
                  className={`p-2 border font-semibold ${
                    order.Status === "DELIVERED"
                      ? "text-green-600"
                      : order.Status === "PENDING"
                      ? "text-yellow-600"
                      : order.Status === "REJECTED"
                      ? "text-red-600"
                      : "text-blue-600"
                  }`}
                >
                  {order.Status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Institute_manufacture;
