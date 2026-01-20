import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "bootstrap/dist/css/bootstrap.min.css";

const PrescriptionReport = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || "6100";
  const employeeId = localStorage.getItem("employeeId");

  useEffect(() => {
    if (employeeId) fetchPrescriptions();
  }, [employeeId]);

  const fetchPrescriptions = async () => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT_NO}/prescription-api/employee/${employeeId}`
      );
      setPrescriptions(res.data || []);
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
  };

  // ================= RECEIPT GENERATOR =================
  const downloadReceipt = (prescription, medicine) => {
    const doc = new jsPDF();

    const billDate = prescription.Timestamp
      ? new Date(prescription.Timestamp).toLocaleString()
      : "-";

    const issuedTo = prescription.IsFamilyMember
      ? `${prescription.FamilyMember?.Name} (${prescription.FamilyMember?.Relationship})`
      : `${prescription.Employee?.Name} (Employee)`;

    doc.setFontSize(14);
    doc.text("OUT-PATIENT PHARMACY", 105, 15, { align: "center" });
    doc.text("PHARMACY ISSUE RECEIPT", 105, 22, { align: "center" });

    doc.setFontSize(10);
    doc.text(
      `Receipt No: ${prescription._id.slice(-6)}`,
      14,
      35
    );
    doc.text(`Bill Date: ${billDate}`, 14, 42);

    doc.text(
      `Institute: ${prescription.Institute?.Institute_Name || "-"}`,
      14,
      52
    );
    doc.text(`Issued To: ${issuedTo}`, 14, 59);

    autoTable(doc, {
      startY: 70,
      head: [["Medicine", "Quantity", "Status"]],
      body: [[medicine.Medicine_Name, medicine.Quantity, "ISSUED"]]
    });

    doc.text(
      "System Generated Receipt",
      105,
      doc.lastAutoTable.finalY + 15,
      { align: "center" }
    );

    doc.save(
      `Prescription_Receipt_${prescription._id.slice(-6)}.pdf`
    );
  };

  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        padding: "40px 0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="container">
  
        {/* Back */}
        <button
          className="btn mb-4"
          onClick={() => window.history.back()}
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #D6E0F0",
            borderRadius: "8px",
            padding: "6px 14px",
            fontSize: "14px",
            color: "#1F2933",
          }}
        >
          ← Back
        </button>
  
        {/* PAGE HEADER */}
        <div className="mb-4">
          <h3 style={{ fontWeight: 600, color: "#1F2933" }}>
            Prescription Records
          </h3>
          <p style={{ color: "#6B7280", marginBottom: 0 }}>
            All medicines issued to you and your family members
          </p>
        </div>
  
        {/* SUMMARY BAR */}
        <div className="d-flex gap-3 mb-4 flex-wrap">
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D6E0F0",
              borderRadius: "12px",
              padding: "14px 20px",
              fontWeight: 600,
              color: "#1F2933",
            }}
          >
            Total Prescriptions:{" "}
            <span style={{ color: "#4A70A9" }}>
              {prescriptions.length}
            </span>
          </div>
  
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D6E0F0",
              borderRadius: "12px",
              padding: "14px 20px",
              fontWeight: 600,
              color: "#1F2933",
            }}
          >
            Total Medicines:{" "}
            <span style={{ color: "#4A70A9" }}>
              {prescriptions.reduce(
                (acc, p) => acc + p.Medicines.length,
                0
              )}
            </span>
          </div>
        </div>
  
        {/* TABLE CARD */}
        <div
          className="card border-0"
          style={{
            borderRadius: "16px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div className="card-body">
  
            {prescriptions.length === 0 ? (
              <p className="text-center text-muted">
                No prescriptions found.
              </p>
            ) : (
              <div className="table-responsive">
                <table
                  className="table align-middle"
                  style={{
                    border: "1px solid #D6E0F0",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <thead
                    style={{
                      backgroundColor: "#F3F7FF",
                      color: "#1F2933",
                      fontWeight: 600,
                    }}
                  >
                    <tr>
                      <th>#</th>
                      <th>Institute</th>
                      <th>Person</th>
                      <th>Medicine</th>
                      <th>Qty</th>
                      <th>Date</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
  
                  <tbody>
                    {prescriptions.map((p, idx) =>
                      p.Medicines.map((m, i) => (
                        <tr
                          key={`${p._id}-${i}`}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "#F8FAFC")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          {i === 0 && (
                            <>
                              <td rowSpan={p.Medicines.length}>
                                {idx + 1}
                              </td>
  
                              <td rowSpan={p.Medicines.length}>
                                {p.Institute?.Institute_Name || "—"}
                              </td>
  
                              <td rowSpan={p.Medicines.length}>
                                <span
                                  style={{
                                    padding: "4px 12px",
                                    borderRadius: "999px",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    backgroundColor: p.IsFamilyMember
                                      ? "#FFF4E5"
                                      : "#EAF2FF",
                                    color: p.IsFamilyMember
                                      ? "#92400E"
                                      : "#1D4ED8",
                                  }}
                                >
                                  {p.IsFamilyMember
                                    ? `${p.FamilyMember?.Name} (${p.FamilyMember?.Relationship})`
                                    : "Self"}
                                </span>
                              </td>
                            </>
                          )}
  
                          <td>{m.Medicine_Name}</td>
                          <td>{m.Quantity}</td>
                          <td>{formatDate(p.Timestamp)}</td>
  
                          <td>
                            <button
                              className="btn btn-sm"
                              style={{
                                borderRadius: "999px",
                                backgroundColor: "#EAF2FF",
                                color: "#4A70A9",
                                fontWeight: 600,
                                border: "none",
                                padding: "6px 14px",
                              }}
                              onClick={() => downloadReceipt(p, m)}
                            >
                              Download
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
  
          </div>
        </div>
      </div>
    </div>
  );
  
  
};

export default PrescriptionReport;
