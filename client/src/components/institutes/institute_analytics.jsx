import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;


/* ===============================
   Utility: Abnormal Test Checker
=================================*/
const isAbnormal = (value, range) => {
  if (!value || !range) return false;
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  
  if (range.includes("–")) {
    const [min, max] = range.split("–").map(parseFloat);
    return num < min || num > max;
  }
  if (range.startsWith("<")) return num >= parseFloat(range.slice(1));
  if (range.startsWith(">")) return num <= parseFloat(range.slice(1));
  
  return false;
};

/* ===============================
   Export Utilities
=================================*/
const downloadCSV = (data) => {
  if (!data.length) return;

  const headers = [
    "Role",
    "Name",
    "Gender",
    "District",
    "Age",
    "Blood Group",
    "Diseases",
    "Tests",
    "Medicines",
    "First Visit",
    "Last Visit"
  ];

  const rows = data.map(r => [
    r.Role,
    r.Name,
    r.Gender || "",
    r.District || "",
    r.Age ?? "",
    r.Blood_Group || "",
    (r.Diseases || []).join("; "),
    (r.Tests || []).map(t => `${t.Test_Name}: ${t.Result_Value} ${t.Units || ""}`).join("; "),
    (r.Medicines || []).map(m => `${m.Medicine_Name} (${m.Quantity})`).join("; "),
    r.First_Visit_Date ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB") : "",
    r.Last_Visit_Date ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB") : ""
  ]);

  const csv = headers.join(",") + "\n" + rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Institute_Analytics.csv";
  link.click();
};

const downloadPDF = (data) => {
  if (!data.length) return;

  const doc = new jsPDF("l", "mm", "a4");
  doc.setFontSize(14);
  doc.text("Institute Medical Analytics Report", 14, 15);

  autoTable(doc, {
    startY: 22,
    head: [[
      "Role",
      "Name",
      "Gender",
      "District",
      "Age",
      "Blood Group",
      "Diseases",
      "Tests",
      "Medicines",
      "First Visit",
      "Last Visit"
    ]],
    body: data.map(r => [
      r.Role,
      r.Name,
      r.Gender || "—",
      r.District || "—",
      r.Age ?? "—",
      r.Blood_Group || "—",
      (r.Diseases || []).join(", "),
      (r.Tests || []).map(t => `${t.Test_Name}: ${t.Result_Value}`).join("; "),
      (r.Medicines || []).map(m => `${m.Medicine_Name} (${m.Quantity})`).join("; "),
      r.First_Visit_Date ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB") : "—",
      r.Last_Visit_Date ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB") : "—"
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [33, 37, 41] }
  });

  doc.save("Institute_Analytics_Report.pdf");
};

/* ===============================
   MAIN COMPONENT
=================================*/
export default function InstituteAnalytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* -------- Filters -------- */
  const [roleFilter, setRoleFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [medicineFilter, setMedicineFilter] = useState("");
  const [testFilter, setTestFilter] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 10;
  useEffect(() => {
    const institute = JSON.parse(localStorage.getItem("institute"));
    if (!institute) {
      setError("Institute not found in local storage");
      setLoading(false);
      return;
    }

    axios
      .get(`${process.env.REACT_APP_API_URL}/institute-api/analytics/${institute._id}`)
      .then(res => {
        setRows(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Analytics load error:", err);
        setError("Failed to load analytics data");
        setLoading(false);
      });
  }, []);

  

  const filteredRows = rows.filter(r => {
  const match = (v, f) =>
    !f || (v && v.toString().toLowerCase().includes(f.toLowerCase()));

  return (
    (!roleFilter || r.Role === roleFilter) &&
    (!genderFilter || r.Gender === genderFilter) &&
    (!bloodGroupFilter || r.Blood_Group === bloodGroupFilter) &&
    match(r.Name, nameFilter) &&
    match(r.District, districtFilter)
  );
});


  /* -------- Filtering Logic -------- */
const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

const indexOfLast = currentPage * rowsPerPage;
const indexOfFirst = indexOfLast - rowsPerPage;

const currentRows = filteredRows.slice(indexOfFirst, indexOfLast);


  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading analytics…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4" role="alert">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h2 className="fw-bold">Institute Medical Analytics Dashboard</h2>
        <p className="text-muted">Comprehensive health records and medical data analysis</p>
      </div>

      {/* =============================== FILTER PANEL ================================*/}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Filters</h5>
          <div className="row g-3">
            {/* Role Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Role</label>
              <select 
                className="form-select" 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="Employee">Employee</option>
                <option value="Family">Family</option>
              </select>
            </div>

            {/* Gender Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Gender</label>
              <select 
                className="form-select" 
                value={genderFilter} 
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Blood Group Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Blood Group</label>
              <select 
                className="form-select" 
                value={bloodGroupFilter} 
                onChange={(e) => setBloodGroupFilter(e.target.value)}
              >
                <option value="">All Blood Groups</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            {/* Name Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>

            {/* District Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">District</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by district"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
              />
            </div>

            {/* Disease Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Disease</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by disease"
                value={diseaseFilter}
                onChange={(e) => setDiseaseFilter(e.target.value)}
              />
            </div>

            {/* Medicine Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Medicine</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by medicine"
                value={medicineFilter}
                onChange={(e) => setMedicineFilter(e.target.value)}
              />
            </div>

            {/* Test Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Test</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by test name"
                value={testFilter}
                onChange={(e) => setTestFilter(e.target.value)}
              />
            </div>

            {/* Age Min */}
            <div className="col-md-2">
              <label className="form-label fw-semibold">Age Min</label>
              <input
                type="number"
                className="form-control"
                placeholder="Min"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
              />
            </div>

            {/* Age Max */}
            <div className="col-md-2">
              <label className="form-label fw-semibold">Age Max</label>
              <input
                type="number"
                className="form-control"
                placeholder="Max"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
              />
            </div>

            {/* Abnormal Tests Checkbox */}
            <div className="col-md-8 d-flex align-items-end">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="abnormalCheckbox"
                  checked={abnormalOnly}
                  onChange={(e) => setAbnormalOnly(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="abnormalCheckbox">
                  Show only patients with abnormal test results
                </label>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="mt-3 d-flex gap-2">
            <button 
              className="btn btn-success btn-sm"
              onClick={() => downloadCSV(filteredRows)}
              disabled={filteredRows.length === 0}
            >
              📥 Download CSV
            </button>
            <button 
              className="btn btn-danger btn-sm"
              onClick={() => downloadPDF(filteredRows)}
              disabled={filteredRows.length === 0}
            >
              📄 Download PDF
            </button>
            <span className="ms-auto text-muted align-self-center">
              Showing {filteredRows.length} of {rows.length} records
            </span>
          </div>
        </div>
      </div>

      {/* =============================== TABLE ================================*/}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-striped mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Role</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Blood Group</th>
                  <th>District</th>
                  <th>Age</th>
                  <th>Diseases</th>
                  <th>Tests</th>
                  <th>Medicines</th>
                  <th>First Visit</th>
                  <th>Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan="11" className="text-center py-4 text-muted">
                      No records found matching the current filters
                    </td>
                  </tr>
                )}
                {currentRows.map((r, i) => (

                  <tr key={i}>
                    <td>
                      <span className={`badge ${r.Role === "Employee" ? "bg-primary" : "bg-info"}`}>
                        {r.Role}
                      </span>
                    </td>
                    <td className="fw-semibold">{r.Name}</td>
                    <td>{r.Gender || "—"}</td>
                    <td>{r.Blood_Group || "—"}</td>
                    <td>{r.District || "—"}</td>
                    <td>{r.Age ?? "—"}</td>
                    <td>
                      {r.Diseases?.length ? (
                        <div className="d-flex flex-column gap-1">
                          {r.Diseases.map((disease, idx) => (
                            <span key={idx} className="badge bg-warning text-dark">
                              {disease}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {r.Tests?.length ? (
                        <div className="d-flex flex-column gap-1">
                          {r.Tests.map((t, idx) => {
                            const abnormal = isAbnormal(t.Result_Value, t.Reference_Range);
                            return (
                              <small 
                                key={idx} 
                                className={abnormal ? "text-danger fw-bold" : ""}
                              >
                                {t.Test_Name}: {t.Result_Value} {t.Units || ""}
                                {abnormal && " ⚠️"}
                              </small>
                            );
                          })}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {r.Medicines?.length ? (
                        <div className="d-flex flex-column gap-1">
                          {r.Medicines.map((m, idx) => (
                            <small key={idx}>
                              {m.Medicine_Name} ({m.Quantity})
                            </small>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {r.First_Visit_Date
                        ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                    <td>
                      {r.Last_Visit_Date
                        ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="d-flex justify-content-center align-items-center gap-2 py-3">
  <button
    className="btn btn-outline-dark btn-sm"
    disabled={currentPage === 1}
    onClick={() => setCurrentPage(prev => prev - 1)}
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
    onClick={() => setCurrentPage(prev => prev + 1)}
  >
    Next
  </button>
</div>

          </div>
        </div>
      </div>
    </div>
  );
}