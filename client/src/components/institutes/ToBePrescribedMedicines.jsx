import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaDownload, FaSearch, FaFilter, FaPills } from "react-icons/fa";

const ToBePrescribedMedicines = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5200}`;

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const instituteId = localStorage.getItem("instituteId");

  useEffect(() => {
    fetchToBePrescribedMedicines();
  }, []);

  const fetchToBePrescribedMedicines = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/doctor-prescription-api/to-be-prescribed/all`);
      setMedicines(response.data || []);
    } catch (error) {
      console.error("Error fetching to-be-prescribed medicines:", error);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = !searchTerm ||
      medicine.Medicine_Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.Employee?.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.Employee?.ABS_NO?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !filterType || medicine.Type === filterType;

    const matchesDate = !filterDate || formatDate(medicine.createdAt) === filterDate;

    return matchesSearch && matchesType && matchesDate;
  });

  const uniqueTypes = [...new Set(medicines.map(m => m.Type).filter(Boolean))];

  const downloadCSV = () => {
    const headers = [
      "Employee Name",
      "ABS NO",
      "Family Member",
      "Medicine Name",
      "Type",
      "Dosage Form",
      "Strength",
      "Food Timing",
      "Morning",
      "Afternoon",
      "Night",
      "Duration",
      "Quantity",
      "Remarks",
      "Prescribed Date",
      "Notes"
    ];

    const csvData = filteredMedicines.map(medicine => [
      medicine.Employee?.Name || "-",
      medicine.Employee?.ABS_NO || "-",
      medicine.IsFamilyMember ? (medicine.FamilyMember?.Name || "Family Member") : "Self",
      medicine.Medicine_Name || "-",
      medicine.Type || "-",
      medicine.Dosage_Form || "-",
      medicine.Strength || "-",
      medicine.FoodTiming || "-",
      medicine.Morning || 0,
      medicine.Afternoon || 0,
      medicine.Night || 0,
      medicine.Duration || "-",
      medicine.Quantity || 0,
      medicine.Remarks || "-",
      formatDateTime(medicine.createdAt),
      medicine.Notes || "-"
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `to-be-prescribed-medicines-${formatDate(new Date())}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container-fluid mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading to-be-prescribed medicines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">To Be Prescribed Medicines</h4>
          <p className="text-muted mb-0">Medicines prescribed by doctors that need to be obtained externally</p>
        </div>
        <button
          className="btn btn-success"
          onClick={downloadCSV}
          disabled={filteredMedicines.length === 0}
        >
          <FaDownload className="me-2" />
          Download CSV
        </button>
      </div>

      {/* Filters */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="input-group">
            <span className="input-group-text"><FaSearch /></span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by medicine name, employee name, or ABS NO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-3">
          <div className="input-group">
            <span className="input-group-text"><FaFilter /></span>
            <select
              className="form-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Medicine Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-md-3">
          <input
            type="date"
            className="form-control"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            placeholder="Filter by date"
          />
        </div>
        <div className="col-md-2">
          <button
            className="btn btn-outline-secondary w-100"
            onClick={() => {
              setSearchTerm("");
              setFilterType("");
              setFilterDate("");
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-primary">
            <div className="card-body text-center">
              <h5 className="card-title text-primary">{medicines.length}</h5>
              <p className="card-text">Total Prescriptions</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-success">
            <div className="card-body text-center">
              <h5 className="card-title text-success">{filteredMedicines.length}</h5>
              <p className="card-text">Filtered Results</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-info">
            <div className="card-body text-center">
              <h5 className="card-title text-info">{uniqueTypes.length}</h5>
              <p className="card-text">Medicine Types</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-warning">
            <div className="card-body text-center">
              <h5 className="card-title text-warning">
                {medicines.reduce((sum, med) => sum + (med.Quantity || 0), 0)}
              </h5>
              <p className="card-text">Total Quantity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Medicines Table */}
      {filteredMedicines.length === 0 ? (
        <div className="text-center py-5">
          <FaPills size={48} className="text-muted mb-3" />
          <h5 className="text-muted">No to-be-prescribed medicines found</h5>
          <p className="text-muted">Medicines prescribed by doctors will appear here.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Employee</th>
                <th>ABS NO</th>
                <th>Patient</th>
                <th>Medicine Name</th>
                <th>Type</th>
                <th>Dosage Form</th>
                <th>Strength</th>
                <th>Dosage</th>
                <th>Duration</th>
                <th>Quantity</th>
                <th>Prescribed Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedicines.map((medicine, index) => (
                <tr key={`${medicine._id}-${index}`}>
                  <td>{medicine.Employee?.Name || "-"}</td>
                  <td>{medicine.Employee?.ABS_NO || "-"}</td>
                  <td>
                    {medicine.IsFamilyMember ?
                      `${medicine.FamilyMember?.Name || "Family Member"} (${medicine.FamilyMember?.Relationship || ""})` :
                      "Self"
                    }
                  </td>
                  <td className="fw-semibold">{medicine.Medicine_Name || "-"}</td>
                  <td>{medicine.Type || "-"}</td>
                  <td>{medicine.Dosage_Form || "-"}</td>
                  <td>{medicine.Strength || "-"}</td>
                  <td>
                    {medicine.Morning > 0 && `${medicine.Morning} Morning`}
                    {medicine.Afternoon > 0 && `, ${medicine.Afternoon} Afternoon`}
                    {medicine.Night > 0 && `, ${medicine.Night} Night`}
                    {(!medicine.Morning && !medicine.Afternoon && !medicine.Night) && "-"}
                  </td>
                  <td>{medicine.Duration || "-"}</td>
                  <td>{medicine.Quantity || 0}</td>
                  <td>{formatDateTime(medicine.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ToBePrescribedMedicines;