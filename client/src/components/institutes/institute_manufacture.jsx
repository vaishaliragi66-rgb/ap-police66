import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaTruck } from "react-icons/fa";
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
          Manufacturer_Name: order.Manufacturer_ID?.Manufacturer_Name || "N/A",
          Medicine_Name: order.Medicine_ID?.Medicine_Name || "N/A",
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

      const res = await axios.put(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/orders/${encodeURIComponent(
          manId
        )}/${encodeURIComponent(orderId)}/delivered`
      );

      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId
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
        err.response?.data?.message ||
        err.message ||
        "Failed to mark as delivered";
      alert(serverMsg);
    }
  };

  return (
    <div
      className="container-fluid pb-5"
      style={{
        fontFamily: "Inter, sans-serif",
        backgroundColor: "#fafafa",
        minHeight: "100vh",
      }}
    >
      {/* Sticky Header */}
      <div
        className="text-center py-4 position-sticky top-0 z-3"
        style={{
          backgroundColor: "#fff",
          boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
        }}
      >
       
        <h2
          className="fw-bold text-dark mb-2"
          style={{
            fontSize: "2.3rem",
            letterSpacing: "0.6px",
          }}
        >
          Orders Placed to Manufacturers
        </h2>
        <div
          style={{
            width: "80px",
            height: "3px",
            backgroundColor: "#000",
            borderRadius: "3px",
            margin: "0 auto 10px auto",
          }}
        ></div>
        <p className="text-muted" style={{ fontSize: "0.95rem" }}>
          Review, track, and confirm deliveries for your medicine orders
        </p>
      </div>

      {/* Table Section */}
      {orders.length === 0 ? (
        <p className="text-center text-muted mt-5">No orders found.</p>
      ) : (
        <div
          className="table-responsive shadow-sm rounded-4 mx-auto mt-4"
          style={{
            backgroundColor: "#fff",
            border: "1px solid #eee",
            maxWidth: "90%",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }}
        >
          <table
            className="table align-middle text-center mb-0"
            style={{ borderRadius: "15px" }}
          >
            <thead
              style={{
                backgroundColor: "#000",
                color: "#fff",
                fontSize: "0.95rem",
                position: "sticky",
                top: 0,
                zIndex: 2,
              }}
            >
              <tr>
                <th>#</th>
                <th>Medicine</th>
                <th>Manufacturer</th>
                <th>Quantity</th>
                <th>Order Date</th>
                <th>Delivery Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order, idx) => (
                <tr
                  key={order._id}
                  style={{
                    borderBottom: "1px solid #f1f1f1",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f7f7f7")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td className="fw-semibold text-secondary">{idx + 1}</td>
                  <td className="fw-medium">{order.Medicine_Name}</td>
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
                      className={`badge px-3 py-2 rounded-pill ${
                        order.Display_Status === "DELIVERED"
                          ? "bg-success"
                          : order.Display_Status === "APPROVED"
                          ? "bg-dark"
                          : order.Display_Status === "PENDING"
                          ? "bg-secondary"
                          : "bg-warning text-dark"
                      }`}
                    >
                      {order.Display_Status}
                    </span>
                  </td>
                  <td>
                    {order.institute_Status === "APPROVED" && (
                      <button
                        className="btn btn-sm fw-semibold d-flex align-items-center justify-content-center gap-2 mx-auto"
                        style={{
                          backgroundColor: "#000",
                          color: "#fff",
                          borderRadius: "50px",
                          padding: "8px 22px",
                          transition: "all 0.3s ease",
                        }}
                        onMouseOver={(e) => {
                          e.target.style.boxShadow =
                            "0 6px 12px rgba(0,0,0,0.3)";
                          e.target.style.transform = "translateY(-2px)";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.boxShadow = "none";
                          e.target.style.transform = "translateY(0)";
                        }}
                        onClick={() =>
                          markAsDelivered(order.Manufacturer_ID, order._id)
                        }
                      >
                        <FaTruck size={13} /> Delivered
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
