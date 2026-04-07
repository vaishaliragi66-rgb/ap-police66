import React, { useState, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { FaFileUpload, FaCloudUploadAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const BulkEmployeeUpload = () => {
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadWarnings, setUploadWarnings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);

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
    "Pincode",
    "PhotoFilename",
    "PhotoURL"
  ];

  const handleExcelChange = async (event) => {
    const file = event.target.files[0];
    setMessage("");
    setError("");
    setUploadWarnings([]);
    setPreviewRows([]);
    if (!file) {
      setCsvFile(null);
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("Please upload an Excel file (.xlsx or .xls).");
      event.target.value = null;
      return;
    }

    setCsvFile(file);

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

  const handleZipChange = (event) => {
    const file = event.target.files[0];
    setError("");
    setMessage("");
    if (!file) {
      setZipFile(null);
      return;
    }
    if (!/\.zip$/i.test(file.name)) {
      setError("Please upload a ZIP file for photos.");
      event.target.value = null;
      return;
    }
    setZipFile(file);
  };

  const handleUpload = async () => {
    setMessage("");
    setError("");
    setUploadWarnings([]);

    if (!csvFile) {
      setError("Please choose an Excel file before uploading.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("excelFile", csvFile);
      if (zipFile) {
        formData.append("photoZip", zipFile);
      }

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
      setCsvFile(null);
      setZipFile(null);
      setPreviewRows([]);
      setPreviewHeaders([]);
      if (fileInputRef.current) fileInputRef.current.value = null;
      if (zipInputRef.current) zipInputRef.current.value = null;
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
        "john.jpg",
        ""
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employee_bulk_template.xlsx");
  };

  return (
    <div className="container py-5" style={{ maxWidth: 960 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Bulk Employee Upload</h2>
          <p className="text-muted">
            Upload employee records via Excel. Add PhotoURL values or embed photos directly in Excel cells.
          </p>
        </div>
        <button className="btn btn-light" onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</button>
      </div>

      <div className="card shadow-sm p-4 mb-4">
        <div className="mb-3">
          <label className="form-label fw-semibold">Employee Excel file (.xlsx or .xls)</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="form-control"
            onChange={handleExcelChange}
            ref={fileInputRef}
          />
        </div>

        <div className="d-flex flex-wrap gap-2 mb-4">
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !csvFile}>
            <FaCloudUploadAlt className="me-2" />
            {uploading ? "Uploading..." : "Upload Excel"}
          </button>
          <button className="btn btn-outline-secondary" onClick={downloadTemplate} type="button">
            <FaFileUpload className="me-2" />Download Excel Template
          </button>
        </div>

        <div className="mb-3 text-muted">
          <small>
            Excel file must include headers like <code>ABS_NO</code>, <code>Name</code>, <code>Email</code>, <code>Password</code>, <code>Gender</code>, and address columns.
            You can embed photos directly in Excel cells or use the <code>PhotoURL</code> column for web images.
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
            <h6>Excel preview (first 5 rows)</h6>
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
