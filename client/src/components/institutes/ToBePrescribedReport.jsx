import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ToBePrescribedReport = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5200}`;

  const navigate = useNavigate();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    doctorId: "",
    fromDate: "",
    toDate: "",
    instituteId: ""
  });
  const [institutes, setInstitutes] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    fetchReportData();
    fetchInstitutes();
    fetchDoctors();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("instituteToken") || localStorage.getItem("token");
      const instituteId = localStorage.getItem("instituteId");

      if (!token || !instituteId) {
        setError("Authentication required");
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/doctor-prescription-api/to-be-prescribed/all`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          instituteId: instituteId,
          ...filters
        }
      });

      setReportData(response.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching report data:", err);
      setError(err.response?.data?.message || "Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutes = async () => {
    try {
      const token = localStorage.getItem("instituteToken") || localStorage.getItem("token");
      const response = await axios.get(`${BACKEND_URL}/institute-api/institutions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstitutes(response.data || []);
    } catch (err) {
      console.error("Error fetching institutes:", err);
    }
  };

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem("instituteToken") || localStorage.getItem("token");
      const instituteId = localStorage.getItem("instituteId");
      const response = await axios.get(`${BACKEND_URL}/employee-api/employees`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { instituteId, role: "doctor" }
      });
      setDoctors(response.data || []);
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    fetchReportData();
  };

  const clearFilters = () => {
    setFilters({
      doctorId: "",
      fromDate: "",
      toDate: "",
      instituteId: ""
    });
    fetchReportData();
  };

  const downloadReport = async (format = 'csv') => {
    try {
      const token = localStorage.getItem("instituteToken") || localStorage.getItem("token");

      const response = await axios.get(`${BACKEND_URL}/doctor-prescription-api/to-be-prescribed/download`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          format: format,
          ...filters
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'pdf' ? 'html' : format; // Since we're sending HTML for PDF
      link.setAttribute('download', `to-be-prescribed-medicines.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading report:", err);
      alert("Failed to download report");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  const getPatientName = (record) => {
    if (record.IsFamilyMember && record.FamilyMember) {
      return `${record.FamilyMember.Name} (${record.FamilyMember.Relationship})`;
    }
    return record.Employee?.Name || "Unknown";
  };

  if (loading) {
    return (
      <div className="container-fluid mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button
            className="btn btn-outline-secondary me-3"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <h2 className="mb-0 d-inline">To Be Prescribed Medicines Report</h2>
        </div>
        <div>
          <button
            className="btn btn-success me-2"
            onClick={() => downloadReport('csv')}
          >
            📥 Download CSV
          </button>
          <button
            className="btn btn-danger"
            onClick={() => downloadReport('pdf')}
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Filters</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Doctor</label>
              <select
                className="form-select"
                value={filters.doctorId}
                onChange={(e) => handleFilterChange('doctorId', e.target.value)}
              >
                <option value="">All Doctors</option>
                {doctors.map(doctor => (
                  <option key={doctor._id} value={doctor._id}>
                    {doctor.Name} ({doctor.ABS_NO})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Institute</label>
              <select
                className="form-select"
                value={filters.instituteId}
                onChange={(e) => handleFilterChange('instituteId', e.target.value)}
              >
                <option value="">All Institutes</option>
                {institutes.map(institute => (
                  <option key={institute._id} value={institute._id}>
                    {institute.Institute_Name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <button className="btn btn-primary me-2" onClick={applyFilters}>
              Apply Filters
            </button>
            <button className="btn btn-secondary" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Report Data ({reportData.length} records)</h5>
        </div>
        <div className="card-body">
          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          {reportData.length === 0 ? (
            <div className="text-center text-muted py-4">
              No "To Be Prescribed" medicines found
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Doctor Name</th>
                    <th>Patient Name</th>
                    <th>Medicine Name</th>
                    <th>Type</th>
                    <th>Dosage Form</th>
                    <th>Strength</th>
                    <th>Dosage</th>
                    <th>Duration</th>
                    <th>Quantity</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((record, index) => (
                    <tr key={record._id || index}>
                      <td>{index + 1}</td>
                      <td>{record.prescription_id?.created_by || "Unknown"}</td>
                      <td>{getPatientName(record)}</td>
                      <td>{record.Medicine_Name}</td>
                      <td>{record.Type}</td>
                      <td>{record.Dosage_Form}</td>
                      <td>{record.Strength}</td>
                      <td>
                        {[
                          record.Morning && "Morning",
                          record.Afternoon && "Afternoon",
                          record.Night && "Night"
                        ].filter(Boolean).join(", ") || "-"}
                      </td>
                      <td>{record.Duration || "-"}</td>
                      <td>{record.Quantity || 0}</td>
                      <td>{formatDate(record.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToBePrescribedReport;