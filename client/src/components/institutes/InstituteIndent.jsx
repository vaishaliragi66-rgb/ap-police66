import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const InstituteIndent = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const instituteId = localStorage.getItem("instituteId");
  
  const [indentData, setIndentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Fetch indent data
  const fetchIndentData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT}/indent-api/generate`,
        { params: { instituteId } }
      );
      setIndentData(res.data);
    } catch (err) {
      console.error("Failed to fetch indent data:", err);
      alert("Failed to load indent data");
    } finally {
      setLoading(false);
    }
  };

  // View button handler
  const handleView = async () => {
    if (!indentData) {
      await fetchIndentData();
    }
    setShowModal(true);
  };

  // Generate PDF
  const generatePDF = async () => {
    try {
      if (!indentData) {
        await fetchIndentData();
      }
      
      const indent = indentData;
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
          i.Remarks || '-'
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
      alert("Failed to generate PDF. Please try again.");
      console.error("PDF generation error:", err);
    }
  };

  // Generate Word Document (HTML to Blob method)
  const generateWordDocument = () => {
    if (!indentData) {
      alert("Please load indent data first");
      return;
    }

    const indent = indentData;
    const date = new Date(indent.Date).toLocaleDateString("en-GB");
    
    // Create HTML content for Word
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Indent Request</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { font-size: 18px; margin-bottom: 5px; }
          .date { text-align: right; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #2c3e50; color: white; padding: 10px; text-align: center; }
          td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature-box { width: 45%; }
          .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">INDENT REQUEST</div>
          <div class="subtitle">${indent.Institute_Name}</div>
          <div class="subtitle">${indent.Institute_Address}</div>
        </div>
        
        <div class="date">DATE: ${date}</div>
        
        <table>
          <thead>
            <tr>
              <th>S.NO</th>
              <th>MEDICINE NAME</th>
              <th>TYPE</th>
              <th>CATEGORY</th>
              <th>STOCK</th>
              <th>INDENT QTY</th>
              <th>REMARKS</th>
            </tr>
          </thead>
          <tbody>
            ${indent.Items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.Medicine_Name}</td>
                <td>${item.Type}</td>
                <td>${item.Category}</td>
                <td>${item.Stock_On_Hand}</td>
                <td>${item.Required_Quantity}</td>
                <td>${item.Remarks || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="signature-section">
          <div class="signature-box">
            <div>Pharmacy Officer</div>
            <div>${indent.Institute_Name || "-"}</div>
            <div>${indent.Institute_Address || "-"}</div>
            <div class="signature-line"></div>
          </div>
          
          <div class="signature-box">
            <div>Unit Medical Officer</div>
            <div>${indent.Institute_Name || "-"}</div>
            <div>${indent.Institute_Address || "-"}</div>
            <div class="signature-line"></div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Convert HTML to Blob and download
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    saveAs(blob, 'Indent_Request.doc');
  };

  // Generate Excel
  const generateExcel = () => {
    if (!indentData) {
      alert("Please load indent data first");
      return;
    }

    const indent = indentData;
    const worksheetData = [
      ["INDENT REQUEST"],
      [indent.Institute_Name],
      [indent.Institute_Address],
      [`Date: ${new Date(indent.Date).toLocaleDateString("en-GB")}`],
      [],
      ["S.NO", "MEDICINE NAME", "TYPE", "CATEGORY", "STOCK", "INDENT QTY", "REMARKS"],
      ...indent.Items.map((item, idx) => [
        idx + 1,
        item.Medicine_Name,
        item.Type,
        item.Category,
        item.Stock_On_Hand,
        item.Required_Quantity,
        item.Remarks || '-'
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Indent");

    // Merge header cells
    const mergeCells = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }
    ];
    worksheet["!merges"] = mergeCells;

    XLSX.writeFile(workbook, "Indent_Request.xlsx");
  };

  // Print modal content
  const printIndent = () => {
    const content = document.getElementById("indent-print");

    const printWindow = window.open("", "", "height=800,width=900");

    printWindow.document.write(`
      <html>
        <head>
          <title>Indent Request</title>
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
          />
          <style>
            body { padding: 25px; font-family: Arial, sans-serif; }
            h5 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; }
            th { background: #f2f2f2; }
            .signature-box { margin-top: 50px; }
            .signature-line { border-top: 1px solid #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="container mt-4">
      <h4 style={{ color: "#2c3e50" }}>Indent Report</h4>
      
      <div className="card shadow-sm border-0 mt-4">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-3">
            <button
              className="btn btn-primary"
              onClick={handleView}
              disabled={loading}
            >
              {loading ? "Loading..." : "View Indent"}
            </button>
            
            <button
              className="btn btn-danger"
              onClick={generatePDF}
              disabled={loading}
            >
              PDF
            </button>
            
            <button
              className="btn btn-dark"
              onClick={generateWordDocument}
              disabled={!indentData || loading}
            >
              Word
            </button>
            
            <button
              className="btn btn-warning"
              onClick={generateExcel}
              disabled={!indentData || loading}
            >
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showModal && indentData && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title">Indent Preview</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                />
              </div>
              
              <div className="modal-body" id="indent-print">
                <div className="text-center mb-4">
                  <h4 className="fw-bold">INDENT REQUEST</h4>
                  <h5>{indentData.Institute_Name}</h5>
                  <h6>{indentData.Institute_Address}</h6>
                  <div className="text-end">
                    <small className="text-muted">
                      DATE: {new Date(indentData.Date).toLocaleDateString("en-GB")}
                    </small>
                  </div>
                </div>
                
                <hr style={{ borderTop: "1px solid #000", margin: "12px 0 20px 0" }} />
                
                <div className="table-responsive">
                  <table className="table table-bordered table-striped">
                    <thead className="table-dark">
                      <tr>
                        <th>S.NO</th>
                        <th>MEDICINE NAME</th>
                        <th>TYPE</th>
                        <th>CATEGORY</th>
                        <th>STOCK</th>
                        <th>INDENT QTY</th>
                        <th>REMARKS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indentData.Items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{item.Medicine_Name}</td>
                          <td>{item.Type}</td>
                          <td>{item.Category}</td>
                          <td>{item.Stock_On_Hand}</td>
                          <td>{item.Required_Quantity}</td>
                          <td>{item.Remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="row mt-5">
                  <div className="col-md-6">
                    <div className="signature-box">
                      <p className="fw-bold mb-1">Pharmacy Officer</p>
                      <p className="mb-1">{indentData.Institute_Name}</p>
                      <p className="mb-0 text-muted">{indentData.Institute_Address}</p>
                      <div className="signature-line"></div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="signature-box">
                      <p className="fw-bold mb-1">Unit Medical Officer</p>
                      <p className="mb-1">{indentData.Institute_Name}</p>
                      <p className="mb-0 text-muted">{indentData.Institute_Address}</p>
                      <div className="signature-line"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="btn btn-primary"
                  onClick={printIndent}
                >
                  🖨 Print
                </button>

                <button 
                  className="btn btn-danger"
                  onClick={() => {
                    setShowModal(false);
                    generatePDF();
                  }}
                >
                  📄 PDF
                </button>

                <button 
                  className="btn btn-dark"
                  onClick={() => {
                    setShowModal(false);
                    generateWordDocument();
                  }}
                >
                  📝 Word
                </button>

                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS for modal */}
      <style>
        {`
          .modal-content {
            animation: fadeIn 0.3s ease;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 40px;
            padding-top: 5px;
          }
        `}
      </style>
    </div>
  );
};

export default InstituteIndent;