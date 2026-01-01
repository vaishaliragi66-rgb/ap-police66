import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MedicinesIssuedRegister = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const instituteId = localStorage.getItem("instituteId");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instituteId) return;

    axios
      .get(
        `http://localhost:${BACKEND_PORT}/prescription-api/institute/${instituteId}`
      )
      .then((res) => {
        const flattened = [];

        res.data.forEach((p) => {
          const timestamp = p.Timestamp; // ✅ CORRECT FIELD

          p.Medicines.forEach((m) => {
            flattened.push({
              timestamp,
              employeeABS: p.Employee?.ABS_NO || "-",
              employeeName: p.Employee?.Name || "-",
              issuedTo: p.IsFamilyMember
                ? `${p.FamilyMember?.Name} (${p.FamilyMember?.Relationship})`
                : p.Employee?.Name,
              medicineName: m.Medicine_ID?.Medicine_Name || "-",
              expiry: m.Medicine_ID?.Expiry_Date || null,
              quantity: m.Quantity,
              prescriptionId: p._id
            });
          });
        });

        setRows(flattened);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [instituteId]);

  // ================= RECEIPT GENERATOR =================
  const downloadReceipt = (row) => {
    const doc = new jsPDF();

    const billDate = row.timestamp
      ? new Date(row.timestamp).toLocaleString()
      : "-";

    doc.setFontSize(14);
    doc.text("OUT-PATIENT PHARMACY", 105, 15, { align: "center" });
    doc.text("PHARMACY ISSUE RECEIPT", 105, 22, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Receipt No: ${row.prescriptionId.slice(-6)}`, 14, 35);
    doc.text(`Bill Date: ${billDate}`, 14, 42);

    doc.text("Institute: AP Police Health Institute", 14, 52);
    doc.text(`Issued To: ${row.issuedTo}`, 14, 59);
    doc.text(`Employee ABS No: ${row.employeeABS}`, 14, 66);

    autoTable(doc, {
      startY: 75,
      head: [["Medicine", "Quantity", "Expiry Date", "Status"]],
      body: [
        [
          row.medicineName,
          row.quantity,
          row.expiry
            ? new Date(row.expiry).toLocaleDateString()
            : "-",
          "ISSUED"
        ]
      ]
    });

    doc.text(
      "System Generated Receipt",
      105,
      doc.lastAutoTable.finalY + 15,
      { align: "center" }
    );

    doc.save(
      `Medicine_Issue_Receipt_${row.prescriptionId.slice(-6)}.pdf`
    );
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <strong>Loading issued medicines...</strong>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="card shadow">
        <div className="card-header bg-dark text-white">
          <h5 className="mb-0">Medicines Issued Register</h5>
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Date & Time</th>
                  <th>Employee ABS_NO</th>
                  <th>Employee Name</th>
                  <th>Issued To</th>
                  <th>Medicine</th>
                  <th>Expiry Date</th>
                  <th>Quantity</th>
                  <th>Prescription Ref</th>
                  <th>Receipt</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center">
                      No medicines issued
                    </td>
                  </tr>
                )}

                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      {r.timestamp
                        ? new Date(r.timestamp).toLocaleString()
                        : "-"}
                    </td>
                    <td>{r.employeeABS}</td>
                    <td>{r.employeeName}</td>
                    <td>{r.issuedTo}</td>
                    <td>{r.medicineName}</td>
                    <td>
                      {r.expiry
                        ? new Date(r.expiry).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>{r.quantity}</td>
                    <td>{r.prescriptionId.slice(-6)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => downloadReceipt(r)}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicinesIssuedRegister;
