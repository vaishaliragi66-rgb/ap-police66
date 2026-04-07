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

  const handleCsvChange = async (event) => {
    const file = event.target.files[0];
    setMessage("");
    setError("");
    setPreviewRows([]);
    if (!file) {
      setCsvFile(null);
      return;
    }

    if (!/\.csv$/i.test(file.name)) {
      setError("Please upload a CSV file.");
      event.target.value = null;
      return;
    }

    setCsvFile(file);

    try {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: "string" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!rows || rows.length === 0) {
        setError("The CSV file is empty or could not be parsed.");
        return;
      }

      const headers = Object.keys(rows[0]);
      setPreviewHeaders(headers);
      setPreviewRows(rows.slice(0, 5));
    } catch (err) {
      console.error(err);
      setError("Unable to read the CSV file. Please verify the format.");
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

    if (!csvFile) {
      setError("Please choose a CSV file before uploading.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("csvFile", csvFile);
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

      setMessage(
        `${response.data.message} Created ${response.data.createdCount} of ${response.data.totalRows} rows.`
      );
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
    const sampleRow = [
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
    ];

    const csv = [sampleHeaders.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee_bulk_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-5" style={{ maxWidth: 960 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Bulk Employee Upload</h2>
          <p className="text-muted">
            Upload employee records via CSV. Optionally include a ZIP of photo files or add PhotoURL values in the CSV.
          </p>
        </div>
        <button className="btn btn-light" onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</button>
      </div>

      <div className="card shadow-sm p-4 mb-4">
        <div className="mb-3">
          <label className="form-label fw-semibold">Employee CSV file</label>
          <input
            type="file"
            accept=".csv"
            className="form-control"
            onChange={handleCsvChange}
            ref={fileInputRef}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Optional employee photo ZIP</label>
          <input
            type="file"
            accept=".zip"
            className="form-control"
            onChange={handleZipChange}
            ref={zipInputRef}
          />
        </div>

        <div className="d-flex flex-wrap gap-2 mb-4">
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !csvFile}>
            <FaCloudUploadAlt className="me-2" />
            {uploading ? "Uploading..." : "Upload CSV"}
          </button>
          <button className="btn btn-outline-secondary" onClick={downloadTemplate} type="button">
            <FaFileUpload className="me-2" />Download template
          </button>
        </div>

        <div className="mb-3 text-muted">
          <small>
            CSV must include headers like <code>ABS_NO</code>, <code>Name</code>, <code>Email</code>, <code>Password</code>, <code>Gender</code>, and address columns.
            Use <code>PhotoFilename</code> to match names in the ZIP archive, or <code>PhotoURL</code> to fetch online images.
          </small>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {previewRows.length > 0 && (
          <div className="mt-4">
            <h6>CSV preview (first 5 rows)</h6>
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
