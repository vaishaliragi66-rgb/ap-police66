import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

function Institute_manufacture() {
  const [orders, setOrders] = useState([]);
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || 5000;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const storedInstitute = localStorage.getItem("institute");
        if (!storedInstitute) return;

        const institute = JSON.parse(storedInstitute);
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/institute-api/orders/${institute._id}`
        );

        if (!Array.isArray(res.data)) {
          console.error("Unexpected orders response:", res.data);
          return;
        }

        const ordersWithDisplay = res.data.map((order) => ({
          ...order,
          Display_Status: order.institute_Status || "PENDING",
          Manufacturer_Name:
            order.Manufacturer_ID?.Manufacturer_Name || "N/A",
          Medicine_Name:
            order.Medicine_ID?.Medicine_Name || "N/A",
        }));

        setOrders(ordersWithDisplay);
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    };

    fetchOrders();
  }, [BACKEND_PORT_NO]);

  const markAsDelivered = async (manufacturerId, orderId) => {
    try {
      const manId =
        typeof manufacturerId === "object" && manufacturerId._id
          ? manufacturerId._id
          : manufacturerId;
      const ordId = orderId;

      const res = await axios.put(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/orders/${encodeURIComponent(
          manId
        )}/${encodeURIComponent(ordId)}/delivered`
      );

      setOrders((prev) =>
        prev.map((o) =>
          o._id === ordId
            ? {
                ...o,
                Display_Status: res.data.instituteDelivered
                  ? "DELIVERED"
                  : o.Display_Status,
                Delivery_Date: res.data.instituteDelivered
                  ? new Date().toISOString()
                  : o.Delivery_Date,
              }
            : o
        )
      );

      alert(res.data.message || "Order updated");
    } catch (err) {
      console.error("Error marking as delivered:", err);
      const serverMsg =
        err.response?.data?.message || err.message || "Failed to mark as delivered";
      alert(serverMsg);
    }
  };

  return (
    <div className="container my-5">
      <h2 className="text-center mb-4 text-primary">
        Orders Placed to Manufacturers
      </h2>
      {orders.length === 0 ? (
        <p className="text-center text-muted">No orders found.</p>
      ) : (
        <div className="table-responsive shadow">
          <table className="table table-bordered table-striped text-center align-middle">
            <thead className="table-primary">
              <tr>
                <th>S.No</th>
                <th>Medicine Name</th>
                <th>Manufacturer</th>
                <th>Quantity Requested</th>
                <th>Order Date</th>
                <th>Delivery Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => (
                <tr key={order._id}>
                  <td>{idx + 1}</td>
                  <td>{order.Medicine_Name}</td>
                  <td>{order.Manufacturer_Name}</td>
                  <td>{order.Quantity_Requested}</td>
                  <td>{new Date(order.Order_Date).toLocaleDateString()}</td>
                  <td>
                    {order.Delivery_Date
                      ? new Date(order.Delivery_Date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        order.Display_Status === "DELIVERED"
                          ? "bg-success"
                          : order.Display_Status === "APPROVED"
                          ? "bg-info text-dark"
                          : order.Display_Status === "PENDING"
                          ? "bg-secondary"
                          : "bg-warning text-dark"
                      }`}
                    >
                      {order.Display_Status}
                    </span>
                  </td>
                  <td>
                    {order.institute_Status === "APPROVED" &&(
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => markAsDelivered(order.Manufacturer_ID, order._id)}
                        >
                          Mark Delivered
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Institute_manufacture;
