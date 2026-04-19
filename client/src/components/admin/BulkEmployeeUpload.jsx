import React, { useState, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { FaFileUpload, FaCloudUploadAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const BulkEmployeeUpload = () => {
  const navigate = useNavigate();
  const [excelFile, setExcelFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadWarnings, setUploadWarnings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const sampleHeaders = [
    "ABS_NO",
    "Name",
    "Email",
    "Password",
    "Designation",
    "DOB",
    "Blood_Group",
    "Height",
    "Weight",
    "Phone_No",
    "Gender",
    "Street",
    "District",
    "State",
    "Pincode"
  ];

  const handleExcelChange = async (event) => {
    const file = event.target.files[0];
    setMessage("");
    setError("");
    setUploadWarnings([]);
    setPreviewRows([]);
    if (!file) {
      setExcelFile(null);
      return;
    }

    if (!/\.xlsx$/i.test(file.name)) {
      setError("Please upload an Excel file (.xlsx).");
      event.target.value = null;
      return;
    }

    setExcelFile(file);

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!rows || rows.length === 0) {
        setError("The Excel file is empty or could not be parsed.");
        return;
      }

      const headers = Object.keys(rows[0]);
      setPreviewHeaders(headers);
      setPreviewRows(rows.slice(0, 5));
    } catch (err) {
      console.error(err);
      setError("Unable to read the Excel file. Please verify the format.");
    }
  };

  const handleUpload = async () => {
    setMessage("");
    setError("");
    setUploadWarnings([]);

    if (!excelFile) {
      setError("Please choose an Excel file before uploading.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("excelFile", excelFile);

      const response = await axios.post(
        `${BACKEND_URL}/admin-api/employee-bulk-upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      const responseErrors = Array.isArray(response.data.errors) ? response.data.errors : [];
      setMessage(
        `${response.data.message} Created ${response.data.createdCount} of ${response.data.totalRows} rows.`
      );
      setUploadWarnings(responseErrors);
      setError("");
      setExcelFile(null);
      setPreviewRows([]);
      setPreviewHeaders([]);
      if (fileInputRef.current) fileInputRef.current.value = null;
    } catch (err) {
      console.error(err);
      const apiError = err.response?.data?.message || err.message || "Upload failed.";
      const details = err.response?.data?.errors;
      if (Array.isArray(details) && details.length > 0) {
        setError(`${apiError} ${details.map((item) => `Row ${item.row}: ${item.errors.join(", ")}`).join(" | ")}`);
      } else {
        setError(apiError);
      }
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const sampleData = [
      sampleHeaders,
      [
        "POLICE123",
        "John Doe",
        "john@example.com",
        "TempPass@123",
        "Inspector",
        "1990-01-01",
        "O+",
        "170",
        "68",
        "9876543210",
        "Male",
        "MG Road",
        "Hyderabad",
        "Telangana",
        "500001",
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employee_bulk_template.xlsx");
  };

  return (
    <div
      className="container py-5"
      style={{
        maxWidth: 960,
        minHeight: "100vh",
      }}
    >
      <style>
        {`
          .bulk-upload-card {
            background: rgba(255, 255, 255, 0.74);
            border: 1px solid rgba(255, 255, 255, 0.85);
            border-radius: 26px;
            box-shadow: 0 24px 44px rgba(148, 184, 255, 0.16);
            backdrop-filter: blur(18px);
          }

          .bulk-upload-card .form-control {
            min-height: 48px;
            border-radius: 16px;
            border: 1px solid rgba(191, 219, 254, 0.7);
            background: rgba(248, 250, 252, 0.96);
            box-shadow: 0 10px 22px rgba(148, 163, 184, 0.10);
          }

          .bulk-upload-card .form-control:focus {
            border-color: #60A5FA;
            box-shadow: 0 0 0 0.18rem rgba(96, 165, 250, 0.14);
          }

          .bulk-upload-card .table {
            --bs-table-bg: transparent;
            margin-bottom: 0;
          }

          .bulk-upload-card .table thead th {
            background: #eff6ff;
            color: #1e3a8a;
            border-color: rgba(191, 219, 254, 0.75);
            font-weight: 600;
            white-space: nowrap;
          }

          .bulk-upload-card .table tbody tr:hover {
            background: rgba(239, 246, 255, 0.7);
          }
        `}
      </style>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "7px 14px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(255,255,255,0.85)",
              color: "#2563EB",
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              marginBottom: "14px",
              boxShadow: "0 12px 26px rgba(147,197,253,0.18)",
            }}
          >
            Employee Import
          </div>
          <h2 style={{ fontWeight: 600, letterSpacing: "-0.03em", color: "#0F172A" }}>Bulk Employee Upload</h2>
          <p className="text-muted mb-0" style={{ maxWidth: 680, lineHeight: 1.7 }}>
            Upload employee records through Excel and place each employee photo directly on the same row inside the sheet.
          </p>
        </div>
        <button
          className="btn"
          onClick={() => navigate("/admin/dashboard")}
          style={{
            borderRadius: "999px",
            padding: "10px 18px",
            background: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(191,219,254,0.8)",
            color: "#2563EB",
            boxShadow: "0 12px 26px rgba(191,219,254,0.16)",
            transition: "all 0.3s ease",
          }}
        >
          Back to Dashboard
        </button>
      </div>

      <div
        className="card shadow-sm p-4 mb-4 bulk-upload-card"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.76), rgba(255,255,255,0.68))",
        }}
      >
        <div className="mb-3">
          <label className="form-label fw-semibold" style={{ color: "#0F172A" }}>Employee Excel file (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx"
            className="form-control"
            onChange={handleExcelChange}
            ref={fileInputRef}
          />
        </div>

        <div className="d-flex flex-wrap gap-2 mb-4">
          <button
            className="btn"
            onClick={handleUpload}
            disabled={uploading || !excelFile}
            style={{
              borderRadius: "16px",
              padding: "11px 18px",
              background: "linear-gradient(135deg, #2563EB, #38BDF8)",
              color: "#fff",
              fontWeight: 600,
              boxShadow: "0 14px 28px rgba(96,165,250,0.28)",
              border: "none",
              transition: "all 0.3s ease",
            }}
          >
            <FaCloudUploadAlt className="me-2" />
            {uploading ? "Uploading..." : "Upload Excel"}
          </button>
          <button
            className="btn"
            onClick={downloadTemplate}
            type="button"
            style={{
              borderRadius: "16px",
              padding: "11px 18px",
              background: "rgba(255,255,255,0.84)",
              border: "1px solid rgba(191,219,254,0.8)",
              color: "#2563EB",
              fontWeight: 600,
              boxShadow: "0 12px 24px rgba(191,219,254,0.16)",
              transition: "all 0.3s ease",
            }}
          >
            <FaFileUpload className="me-2" />Download Excel Template
          </button>
        </div>

        <div
          className="mb-3 text-muted"
          style={{
            background: "linear-gradient(135deg, rgba(239,246,255,0.92), rgba(255,255,255,0.78))",
            border: "1px solid rgba(191,219,254,0.7)",
            borderRadius: "18px",
            padding: "14px 16px",
            boxShadow: "0 12px 24px rgba(191,219,254,0.12)",
          }}
        >
          <small>
            Excel file must include headers like <code>ABS_NO</code>, <code>Name</code>, <code>Email</code>, <code>Password</code>, <code>Gender</code>, and address columns.
            Insert each photo into the worksheet on the same row as that employee. The upload will use the first image anchored to each row.
          </small>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {uploadWarnings.length > 0 && (
          <div className="alert alert-warning">
            <div className="fw-semibold mb-2">Some rows were skipped:</div>
            <ul className="mb-0 ps-3">
              {uploadWarnings.map((item) => (
                <li key={item.row}>
                  Row {item.row}: {item.errors.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {previewRows.length > 0 && (
          <div className="mt-4">
            <h6 style={{ color: "#0F172A", fontWeight: 600 }}>Excel preview (first 5 rows)</h6>
            <div className="table-responsive" style={{ maxHeight: 320, overflowY: "auto" }}>
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    {previewHeaders.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx}>
                      {previewHeaders.map((header) => (
                        <td key={header}>{String(row[header] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkEmployeeUpload;
