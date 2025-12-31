import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaClipboardList, FaFilePdf } from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

  // ✅ Fetch orders
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
        if (data.length === 0) setError("No orders found for this manufacturer");
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

  // ✅ Actions
  const handleAccept = async (orderId) => {
    try {
      await axios.put(
        `http://localhost:6100/manufacturer-api/manufacturer/order/accept/${manufacturer.Manufacturer_ID}/${orderId}`
      );
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? { ...order, manufacture_Status: "APPROVED", Remarks: "Approved and ready for dispatch" }
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
            ? { ...order, manufacture_Status: "DELIVERED", Remarks: "Approved and ready for dispatch" }
            : order
        )
      );
      alert("✅ Order marked as delivered");
    } catch (err) {
      alert("❌ Failed to mark order as delivered: " + (err.response?.data?.error || err.message));
    }
  };

  // ✅ Generate PDF Receipt
  const generateReceipt = (order) => {
    const status = (order.manufacture_Status || "").toUpperCase();
    const remarks = (order.Remarks || "").toLowerCase();

    if (status !== "DELIVERED" || remarks !== "approved and ready for dispatch") {
      alert("PDF is available only for delivered orders with remarks 'Approved and ready for dispatch'");
      return;
    }

    try {
      const doc = new jsPDF();
      const now = new Date();
      const date = now.toLocaleString();

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Manufacturer Dispatch Receipt", 55, 20);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Receipt ID: ${order._id.slice(-6).toUpperCase()}`, 14, 35);
      doc.text(`Date: ${date}`, 150, 35);
      doc.text(`Manufacturer: ${manufacturer?.Manufacturer_Name}`, 14, 43);
      doc.text(`Institute: ${order.Institute_ID?.Institute_Name || "N/A"}`, 14, 50);
      doc.text(`Medicine: ${order.Medicine_ID?.Medicine_Name || "N/A"}`, 14, 57);
      doc.text(`Quantity: ${order.Quantity_Requested}`, 150, 43);
      doc.text(`Status: ${status}`, 150, 50);
      doc.text(`Remarks: ${order.Remarks}`, 14, 64);

      doc.line(10, 68, 200, 68);

      // Simple Table
      autoTable(doc, {
        startY: 75,
        head: [["Batch No", "Expiry", "Qty"]],
        body: [
          [
            "LOT" + Math.floor(Math.random() * 90 + 10),
            "31/12/2026",
            order.Quantity_Requested,
          ],
        ],
        theme: "grid",
        styles: { halign: "center", fontSize: 11 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
      });

      const finalY = doc.lastAutoTable.finalY + 15;

      // Delivered Tag
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("✅ ORDER DISPATCHED", 70, finalY + 10);

      // Footer
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Generated by Manufacturer Portal | AP Police Health\nSystem Generated PDF | www.appolicehealth.in",
        14,
        finalY + 25
      );

      doc.save(`Dispatch_Receipt_${order._id.slice(-6)}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF receipt");
    }
  };

  // ✅ UI States
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
          Manage and dispatch institute medicine orders
        </p>
      </div>

      {/* Orders Table */}
      <div
        className="bg-white rounded-4 shadow-sm p-4 w-100"
        style={{
          maxWidth: "1200px",
          border: "1px solid #e5e5e5",
          boxShadow:
            "0 8px 25px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)",
        }}
      >
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
                  const status = (order.manufacture_Status || "").toUpperCase();
                  const remarks = (order.Remarks || "").toLowerCase();

                  return (
                    <tr key={order._id}>
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
                        ) : status === "DELIVERED" &&
                          remarks === "approved and ready for dispatch" ? (
                          <button
                            onClick={() => generateReceipt(order)}
                            className="btn btn-sm btn-outline-dark d-flex align-items-center gap-2 mx-auto"
                          >
                            <FaFilePdf size={14} /> PDF
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
