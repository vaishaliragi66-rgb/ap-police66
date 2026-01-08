import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaTruck, FaFilePdf } from "react-icons/fa";
import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";


import autoTable from "jspdf-autotable";
import "bootstrap/dist/css/bootstrap.min.css";



function Institute_manufacture() {
  const [orders, setOrders] = useState([]);
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || 5000;
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(10);
  const [searchMedicine, setSearchMedicine] = useState("");
  const [quantityFilter, setQuantityFilter] = useState("");
  const [orderDateFilter, setOrderDateFilter] = useState("");
  const [deliveryDateFilter, setDeliveryDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
const [selectedOrder, setSelectedOrder] = useState(null);


  const handleRowsChange = (e) => {
    setOrdersPerPage(Number(e.target.value));
    setCurrentPage(1); // reset to first page
  };

  const filteredOrders = orders.filter((order) => {
    /* 🔍 Medicine name search */
    if (
      searchMedicine &&
      !order.Medicine_Name?.toLowerCase().includes(
        searchMedicine.toLowerCase()
      )
    )
      return false;
  
    /* 🔢 Quantity ≤ */
    if (quantityFilter !== "") {
      const limit = Number(quantityFilter);
      if (!Number.isFinite(limit)) return true; // allow typing
      if (Number(order.Quantity_Requested) > limit) return false;
    }
  
    /* 📅 Order Date ≤ */
    if (orderDateFilter) {
      const limitDate = new Date(orderDateFilter);
      limitDate.setHours(23, 59, 59, 999);
  
      if (new Date(order.Order_Date) > limitDate) return false;
    }
  
    /* 📅 Delivery Date ≤ */
    if (deliveryDateFilter) {
      if (!order.Delivery_Date) return false;
  
      const limitDate = new Date(deliveryDateFilter);
      limitDate.setHours(23, 59, 59, 999);
  
      if (new Date(order.Delivery_Date) > limitDate) return false;
    }
  
    /* 🚦 Status */
    if (statusFilter && order.Display_Status !== statusFilter) return false;
  
    return true;
  });
  const generateWord = async (order) => {
    if (order.Display_Status !== "DELIVERED") {
      alert("Word document is available only for delivered orders");
      return;
    }
  
    const doc = new Document({
      sections: [
        {
          children: [
            /* ---------- TITLE ---------- */
            new Paragraph({
              children: [
                new TextRun({
                  text: "OUT-PATIENT PHARMACY",
                  bold: true,
                  size: 32,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
  
            new Paragraph({
              children: [
                new TextRun({
                  text: "PHARMACY SALE RECEIPT",
                  bold: true,
                  size: 26,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
  
            new Paragraph(""),
  
            /* ---------- DETAILS ---------- */
            new Paragraph(`Receipt No: ${order._id.slice(-6).toUpperCase()}`),
            new Paragraph(`Manufacturer: ${order.Manufacturer_Name}`),
            new Paragraph(`Medicine: ${order.Medicine_Name}`),
            new Paragraph(`Quantity: ${order.Quantity_Requested}`),
            new Paragraph(`Status: ${order.Display_Status}`),
            new Paragraph(
              `Delivery Date: ${
                order.Delivery_Date
                  ? new Date(order.Delivery_Date).toDateString()
                  : "—"
              }`
            ),
  
            new Paragraph(""),
  
            /* ---------- TABLE ---------- */
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                /* Header Row */
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Batch No", bold: true }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Expiry Date", bold: true }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Quantity", bold: true }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                    }),
                  ],
                }),
  
                /* Data Row */
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          text:
                            "LOT" +
                            Math.floor(Math.random() * 90 + 10),
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          text: "31-12-2026",
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          text: String(order.Quantity_Requested),
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
  
            new Paragraph(""),
  
            /* ---------- DELIVERED STAMP ---------- */
            new Paragraph({
              children: [
                new TextRun({
                  text: "DELIVERED",
                  bold: true,
                  size: 28,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    });
  
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Pharmacy_Receipt_${order._id.slice(-6)}.docx`);
  };
  
  


  const openReceiptModal = (order) => {
    if (order.Display_Status !== "DELIVERED") {
      alert("Receipt available only for delivered orders");
      return;
    }
    setSelectedOrder(order);
    setShowReceiptModal(true);
  };
  
    
  
  const sortedOrders = [...filteredOrders].sort(
    (a, b) => new Date(b.Order_Date) - new Date(a.Order_Date)
  );
  
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = sortedOrders.slice(
    indexOfFirstOrder,
    indexOfLastOrder
  );

  const totalPages = Math.ceil(sortedOrders.length / ordersPerPage);

const formatDateDMY = (dateValue) => {
  if (!dateValue) return "—";

  const date = new Date(dateValue);
  if (isNaN(date)) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`; // ✅ DD-MM-YYYY
};

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

  // 🔹 Mark order as delivered
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

      alert(res.data.message || "Order updated successfully!");
    } catch (err) {
      console.error("Error marking as delivered:", err);
      alert(
        err.response?.data?.message ||
          "Error updating delivery status. Please try again."
      );
    }
  };

  // 🔹 Generate Pharmacy Receipt PDF (simplified)
  const generateReceipt = (order) => {
    if (order.Display_Status !== "DELIVERED") {
      alert("Receipt is available only for delivered orders!");
      return;
    }

    try {
      const doc = new jsPDF();
      const now = new Date();
      const billDate = now.toLocaleString();

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("OUT-PATIENT PHARMACY", 70, 20);
      doc.setFontSize(14);
      doc.text("PHARMACY SALE RECEIPT", 75, 27);

      doc.setLineWidth(0.5);
      doc.line(10, 30, 200, 30);

      // Basic Details
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Receipt No: ${order._id.slice(-6).toUpperCase()}`, 12, 38);
      doc.text(`Bill Date: ${billDate}`, 150, 38);
      doc.text(`Manufacturer: ${order.Manufacturer_Name}`, 12, 46);
      doc.text(`Medicine: ${order.Medicine_Name}`, 12, 53);
      doc.text(`Quantity: ${order.Quantity_Requested}`, 150, 46);
      doc.text(`Status: ${order.Display_Status}`, 150, 53);

      doc.line(10, 58, 200, 58);

      // Table (simplified)
      autoTable(doc, {
        startY: 65,
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

      const finalY = doc.lastAutoTable.finalY + 10;

      // Delivery Stamp
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DELIVERED", 90, finalY + 20);
      doc.setFont("helvetica", "normal");
      doc.text(now.toDateString(), 85, finalY + 27);

      // Footer Info
      doc.setFontSize(9);
      doc.text(
        "AP Police Health Institute\nSystem Generated Receipt\nwww.appolicehealth.in",
        14,
        finalY + 40
      );

      // Save
      doc.save(`Pharmacy_Receipt_${order._id.slice(-6)}.pdf`);
    } catch (err) {
      console.error("Error generating receipt:", err);
      alert("Failed to generate PDF receipt.");
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
      {/* Header */}
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
      <div
  className="d-flex flex-wrap align-items-end gap-3 mx-auto mt-4 mb-3 p-3 rounded-4"
  style={{
    maxWidth: "90%",
    backgroundColor: "#ffffff",
    border: "1px solid #eee",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  }}
>
  {/* Medicine Search */}
  <div className="d-flex flex-column">
    <label className="small fw-semibold text-muted mb-1">
      Medicine
    </label>
    <input
      type="text"
      className="form-control form-control-sm"
      placeholder="Search medicine"
      value={searchMedicine}
      onChange={(e) => {
        setSearchMedicine(e.target.value);
        setCurrentPage(1);
      }}
      style={{ minWidth: "180px" }}
    />
  </div>

  {/* Quantity */}
  <div className="d-flex flex-column">
    <label className="small fw-semibold text-muted mb-1">
      Quantity ≤
    </label>
    <input
      type="number"
      className="form-control form-control-sm"
      placeholder="Qty"
      value={quantityFilter}
      onChange={(e) => {
        setQuantityFilter(e.target.value);
        setCurrentPage(1);
      }}
      style={{ width: "110px" }}
    />
  </div>

  {/* Order Date */}
  <div className="d-flex flex-column">
    <label className="small fw-semibold text-muted mb-1">
      Order Date ≤
    </label>
    <input
      type="date"
      className="form-control form-control-sm"
      value={orderDateFilter}
      onChange={(e) => {
        setOrderDateFilter(e.target.value);
        setCurrentPage(1);
      }}
    />
  </div>

  {/* Delivery Date */}
  <div className="d-flex flex-column">
    <label className="small fw-semibold text-muted mb-1">
      Delivery Date ≤
    </label>
    <input
      type="date"
      className="form-control form-control-sm"
      value={deliveryDateFilter}
      onChange={(e) => {
        setDeliveryDateFilter(e.target.value);
        setCurrentPage(1);
      }}
    />
  </div>

  {/* Status */}
  <div className="d-flex flex-column">
    <label className="small fw-semibold text-muted mb-1">
      Status
    </label>
    <select
      className="form-select form-select-sm"
      value={statusFilter}
      onChange={(e) => {
        setStatusFilter(e.target.value);
        setCurrentPage(1);
      }}
      style={{ minWidth: "160px" }}
    >
      <option value="">All</option>
      <option value="PENDING">PENDING</option>
      <option value="APPROVED">APPROVED</option>
      <option value="REJECTED">REJECTED</option>
      <option value="DELIVERED">DELIVERED</option>
    </select>
  </div>

  {/* Clear Filters */}
  <div className="d-flex flex-column">
    <label className="small fw-semibold text-muted mb-1">
      &nbsp;
    </label>
    <button
      className="btn btn-outline-dark btn-sm px-3"
      onClick={() => {
        setSearchMedicine("");
        setQuantityFilter("");
        setOrderDateFilter("");
        setDeliveryDateFilter("");
        setStatusFilter("");
        setCurrentPage(1);
      }}
    >
      Clear
    </button>
  </div>
</div>


      {/* Orders Table */}
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
          <div className="d-flex justify-content-end p-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold text-muted">Rows per page:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: "80px" }}
                value={ordersPerPage}
                onChange={handleRowsChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
          <table className="table align-middle text-center mb-0">
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
                <th>Documents</th>
              </tr>
            </thead>

            <tbody>
              {currentOrders.map((order, idx) => (
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
                  <td className="fw-semibold text-secondary">{indexOfFirstOrder + idx + 1}</td>
                  <td className="fw-medium">{order.Medicine_Name}</td>
                  <td>{order.Manufacturer_Name}</td>
                  <td>{order.Quantity_Requested}</td>
                  <td>{formatDateDMY(new Date(order.Order_Date))}</td>
                  <td>
                    {order.Delivery_Date
                      ? formatDateDMY(new Date(order.Delivery_Date))
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
                    <div className="d-flex justify-content-center gap-2">
                      {order.institute_Status === "APPROVED" && (
                        <button
                          className="btn btn-sm fw-semibold d-flex align-items-center gap-2"
                          style={{
                            backgroundColor: "#000",
                            color: "#fff",
                            borderRadius: "50px",
                            padding: "8px 18px",
                          }}
                          onClick={() =>
                            markAsDelivered(order.Manufacturer_ID, order._id)
                          }
                        >
                          <FaTruck size={13} /> Delivered
                        </button>
                      )}

                      {/* Show Receipt button only for delivered orders */}
                      {order.Display_Status === "DELIVERED" && (
                        <button
                          className="btn btn-sm btn-outline-dark d-flex align-items-center gap-2"
                          onClick={() => generateReceipt(order)}
                        >
                          <FaFilePdf size={14} /> Receipt
                        </button>
                      )}
                    </div>
                  </td>

<td>
  <div className="d-flex justify-content-center gap-2">

    {/* VIEW */}
    <button
      className="btn btn-sm btn-outline-dark"
      onClick={() => openReceiptModal(order)}
    >
      View
    </button>

    {/* PDF */}
    {order.Display_Status === "DELIVERED" && (
      <button
        className="btn btn-sm btn-outline-danger"
        onClick={() => generateReceipt(order)}
        title="Download PDF"
      >
        <FaFilePdf size={14} />
      </button>
    )}

    {/* WORD */}
    {order.Display_Status === "DELIVERED" && (
      <button
        className="btn btn-sm btn-outline-primary"
        onClick={() => generateWord(order)}
        title="Download Word"
      >
        DOC
      </button>
    )}

  </div>
</td>


                </tr>
              ))}
            </tbody>
          </table>
          <div className="d-flex justify-content-center align-items-center gap-2 py-4">
            <button
              className="btn btn-outline-dark btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Previous
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                className={`btn btn-sm ${
                  currentPage === i + 1 ? "btn-dark" : "btn-outline-dark" 
                }`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            <button
              className="btn btn-outline-dark btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>

        </div>
      )}

      {/* ================= RECEIPT VIEW MODAL ================= */}
{showReceiptModal && selectedOrder && (
  <div className="modal fade show d-block" tabIndex="-1">
    <div className="modal-dialog modal-fullscreen modal-dialog-centered">
    <div className="modal-content rounded-0">


        {/* HEADER */}
        <div className="modal-header">
          <h5 className="modal-title fw-bold">
            Pharmacy Receipt Preview
          </h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => setShowReceiptModal(false)}
          ></button>
        </div>

        {/* BODY */}
        <div className="modal-body">

          <div className="text-center mb-3">
            <h5 className="fw-bold">OUT-PATIENT PHARMACY</h5>
            <p className="text-muted mb-0">PHARMACY SALE RECEIPT</p>
          </div>

          <hr />

          {/* DETAILS */}
          <div className="row mb-3">
            <div className="col-md-6">
              <p><strong>Receipt No:</strong> {selectedOrder._id.slice(-6).toUpperCase()}</p>
              <p><strong>Manufacturer:</strong> {selectedOrder.Manufacturer_Name}</p>
              <p><strong>Medicine:</strong> {selectedOrder.Medicine_Name}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Quantity:</strong> {selectedOrder.Quantity_Requested}</p>
              <p><strong>Status:</strong> {selectedOrder.Display_Status}</p>
              <p>
                <strong>Delivery Date:</strong>{" "}
                {selectedOrder.Delivery_Date
                  ? formatDateDMY(new Date(selectedOrder.Delivery_Date))
                  : "—"}
              </p>
            </div>
          </div>

          {/* TABLE */}
          <table className="table table-bordered text-center">
            <thead className="table-dark">
              <tr>
                <th>Batch No</th>
                <th>Expiry Date</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{"LOT" + Math.floor(Math.random() * 90 + 10)}</td>
                <td>31-12-2026</td>
                <td>{selectedOrder.Quantity_Requested}</td>
              </tr>
            </tbody>
          </table>

          <div className="text-center mt-3">
            <span className="badge bg-success px-4 py-2 fs-6">
              DELIVERED
            </span>
          </div>

        </div>

        {/* FOOTER */}
        <div className="modal-footer d-flex justify-content-between">

          <button
            className="btn btn-outline-secondary"
            onClick={() => window.print()}
          >
            Print
          </button>

          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-danger"
              onClick={() => generateReceipt(selectedOrder)}
            >
              PDF
            </button>

            <button
              className="btn btn-outline-primary"
              onClick={() => generateWord(selectedOrder)}
            >
              Word
            </button>

            <button
              className="btn btn-dark"
              onClick={() => setShowReceiptModal(false)}
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  
  </div>
)}

    </div>
  );
}

export default Institute_manufacture;
