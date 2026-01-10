import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const InstituteIndent = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const instituteId = localStorage.getItem("instituteId");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

    const generatePDF = async () => {
      try {
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT}/indent-api/generate`,
          { params: { instituteId } }
      );
      const indent = res.data;
      const doc = new jsPDF();
      doc.setFontSize(10);
      doc.text(
        `DATE: ${new Date(indent.Date).toLocaleDateString("en-GB")}`,
        190,
        42,
        { align: "right" }
      );
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text("INDENT REQUEST", 105, 20, { align: "center" });

      doc.setFontSize(11);
      doc.text(indent.Institute_Name, 105, 28, { align: "center" });
      doc.text(indent.Institute_Address, 105, 34, { align: "center" });

      autoTable(doc, {
        startY: 45,
        head: [[
          "S.NO",
          "MEDICINE NAME",
          "TYPE",
          "CATEGORY",
          "STOCK",
          "INDENT QTY",
          "REMARKS"
        ]],
        body: indent.Items.map((i, idx) => [
          idx + 1,
          i.Medicine_Name,
          i.Type,
          i.Category,
          i.Stock_On_Hand,
          i.Required_Quantity,
          i.Remarks
        ]),
        headStyles: {
          fillColor: [52, 73, 94],
          textColor: 255
        },
        styles: {
          fontSize: 9,
          halign: "center"
        }
      });
          /* ------------ SIGNATURE BLOCK ------------ */
      const y = doc.lastAutoTable.finalY + 25;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      /* Left: Pharmacy Officer */
      doc.text("Pharmacy Officer", 30, y);
      doc.text(indent.Institute_Name || "-", 30, y + 8);
      doc.text(indent.Institute_Address || "-", 30, y + 14, {
        maxWidth: 70
      });

      /* Right: Unit Medical Officer */
      doc.text("Unit Medical Officer", 130, y);
      doc.text(indent.Institute_Name || "-", 130, y + 8);
      doc.text(indent.Institute_Address || "-", 130, y + 14, {
        maxWidth: 70
      });


          doc.save("Indent.pdf");
        
     } catch (err) {
        alert("Failed to generate indent. Please try again.");
        console.error("Indent generation error:", err);
        }

    };

  return (
    <div className="container mt-4">
      <h4 style={{ color: "#2c3e50" }}>Indent Report</h4>
      <button
        className="btn btn-primary mt-3"
        onClick={generatePDF}
      >
        Generate Indent Report
      </button>
    </div>
  );
};

export default InstituteIndent;