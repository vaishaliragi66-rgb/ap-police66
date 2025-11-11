import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaClipboardList } from "react-icons/fa";

function OrdersInstitutes() {
  const [manufacturer, setManufacturer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ Get manufacturer from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("manufacturer");
      if (stored && stored !== "undefined") {
        const parsed = JSON.parse(stored);
        if (parsed._id && parsed.Manufacturer_Name) {
          setManufacturer(parsed);
        } else {
          setError("Invalid manufacturer data in localStorage");
        }
      } else {
        setError("Please log in first");
      }
    } catch {
      setError("Error reading manufacturer data");
    }
  }, []);

  // ✅ Fetch orders once manufacturer is set
  useEffect(() => {
    if (!manufacturer) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get(
          `http://localhost:6100/manufacturer-api/manufacturer/orders/${manufacturer.Manufacturer_ID}`
        );

        const data = res.data.orders || [];
        setOrders(data);
        setFilteredOrders(data);
        if (data.length === 0) {
          setError("No orders found for this manufacturer");
        }
      } catch (err) {
        console.error("❌ Error fetching orders:", err);
        setError("Failed to load orders: " + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [manufacturer]);

  // ✅ Search filter
  useEffect(() => {
    const query = search.toLowerCase();
    const filtered = orders.filter(
      (order) =>
        order.Medicine_ID?.Medicine_Name?.toLowerCase().includes(query) ||
        order.Institute_ID?.Institute_Name?.toLowerCase().includes(query)
    );
    setFilteredOrders(filtered);
  }, [search, orders]);

  // ✅ ACTION HANDLERS
  const handleAccept = async (orderId) => {
    try {
      await axios.put(
        `http://localhost:6100/manufacturer-api/manufacturer/order/accept/${manufacturer.Manufacturer_ID}/${orderId}`
      );
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? { ...order, manufacture_Status: "APPROVED", Remarks: "Approved by manufacturer" }
            : order
        )
      );
      alert("✅ Order accepted successfully");
    } catch (err) {
      alert("❌ Failed to accept order: " + (err.response?.data?.error || err.message));
    }
  };

  const handleReject = async (orderId) => {
    try {
      await axios.put(
        `http://localhost:6100/manufacturer-api/manufacturer/order/reject/${manufacturer.Manufacturer_ID}/${orderId}`
      );
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? { ...order, manufacture_Status: "REJECTED", Remarks: "Rejected by manufacturer" }
            : order
        )
      );
      alert("❌ Order rejected successfully");
    } catch (err) {
      alert("❌ Failed to reject order: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeliver = async (orderId) => {
    try {
      await axios.put(
        `http://localhost:6100/manufacturer-api/manufacturer/order/deliver/${manufacturer.Manufacturer_ID}/${orderId}`
      );
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? { ...order, manufacture_Status: "DELIVERED", Remarks: "Delivered successfully" }
            : order
        )
      );
      alert("✅ Order marked as delivered");
    } catch (err) {
      alert("❌ Failed to mark order as delivered: " + (err.response?.data?.error || err.message));
    }
  };

  // ✅ UI STATES
  if (loading)
    return (
      <div className="text-center mt-5 text-gray-600">
        <h4>Loading orders...</h4>
      </div>
    );

  if (error)
    return (
      <div className="text-center mt-5 text-danger fw-semibold">
        {error}
      </div>
    );

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-start"
      style={{
        backgroundColor: "#f5f6f7",
        paddingTop: "70px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h2
          className="fw-bold text-dark mb-2"
          style={{ fontSize: "2.3rem", letterSpacing: "0.4px" }}
        >
          <FaClipboardList className="me-2 mb-1 text-dark" />
          Orders Dashboard
        </h2>
        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
          Manage orders received from institutes
        </p>
      </div>

      {/* Card Wrapper */}
      <div
        className="bg-white rounded-4 shadow-sm p-4 w-100"
        style={{
          maxWidth: "1200px",
          border: "1px solid #e5e5e5",
          boxShadow:
            "0 8px 25px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Manufacturer Info */}


        {/* Search Bar */}
        <div className="mb-4 text-center">
          <input
            type="text"
            placeholder="Search by institute or medicine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-control mx-auto"
            style={{
              maxWidth: "400px",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9",
              border: "1px solid #ddd",
              fontSize: "0.9rem",
              padding: "10px 12px",
            }}
          />
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table
            className="table align-middle text-center mb-0"
            style={{ verticalAlign: "middle" }}
          >
            <thead
              style={{
                backgroundColor: "#111",
                color: "#fff",
                fontSize: "0.95rem",
                borderRadius: "10px",
              }}
            >
              <tr>
                <th>Institute</th>
                <th>Medicine</th>
                <th>Quantity</th>
                <th>Order Date</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: "0.92rem" }}>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const status = (order.manufacture_Status || order.Status || "").toUpperCase();
                  return (
                    <tr
                      key={order._id}
                      style={{ transition: "all 0.25s ease" }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f9f9f9")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td>{order.Institute_ID?.Institute_Name || "N/A"}</td>
                      <td>{order.Medicine_ID?.Medicine_Name || "N/A"}</td>
                      <td>{order.Quantity_Requested || order.Quantity}</td>
                      <td>
                        {new Date(order.Order_Date).toLocaleDateString()}
                      </td>
                      <td
                        className={`fw-semibold ${
                          status === "PENDING"
                            ? "text-warning"
                            : status === "APPROVED"
                            ? "text-primary"
                            : status === "DELIVERED"
                            ? "text-success"
                            : status === "REJECTED"
                            ? "text-danger"
                            : "text-secondary"
                        }`}
                      >
                        {status}
                      </td>
                      <td>{order.Remarks || "—"}</td>
                      <td>
                        {status === "PENDING" ? (
                          <div className="d-flex justify-content-center gap-2">
                            <button
                              onClick={() => handleAccept(order._id)}
                              className="btn btn-sm btn-success"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(order._id)}
                              className="btn btn-sm btn-danger"
                            >
                              Reject
                            </button>
                          </div>
                        ) : status === "APPROVED" ? (
                          <button
                            onClick={() => handleDeliver(order._id)}
                            className="btn btn-sm btn-dark"
                          >
                            Deliver
                          </button>
                        ) : (
                          <span className="text-muted small">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="text-muted py-3">
                    No matching orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OrdersInstitutes;
