import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

const isPresent = (value) => {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim();
  return normalized !== "" && normalized !== "N/A" && normalized !== "-" && normalized !== "—";
};

const pickFirstPresent = (...values) => values.find(isPresent);

const parseAddressParts = (address) => {
  if (!address || typeof address !== "string") {
    return { district: "", state: "" };
  }

  const parts = address.split(",").map(part => part.trim());
  const district = parts[1] || "";
  const state = (parts[2] || "").split("-")[0].trim();
  

  return { district, state };
};

const normalizeAnalyticsRow = (row, employeeIndex) => {
  const employee =
    employeeIndex.byAbs.get(String(row.ABS_NO || "").trim()) ||
    employeeIndex.byName.get(String(row.Name || "").trim().toLowerCase()) ||
    null;

  const parsedAddress = parseAddressParts(employee?.Address);

  return {
    ...row,
    ABS_NO: pickFirstPresent(row.ABS_NO, employee?.ABS_NO) || "",
    Name: pickFirstPresent(row.Name, employee?.Name) || "",
    District: pickFirstPresent(row.District, row.Address?.District, parsedAddress.district) || "",
    State: pickFirstPresent(row.State, row.Address?.State, parsedAddress.state) || "",
    Gender: pickFirstPresent(row.Gender, employee?.Gender) || "",
    Blood_Group: pickFirstPresent(row.Blood_Group, employee?.Blood_Group) || "",
    Phone_No: pickFirstPresent(row.Phone_No, employee?.Phone_No) || "",
    Height: pickFirstPresent(row.Height, employee?.Height) || "",
    Weight: pickFirstPresent(row.Weight, employee?.Weight) || ""
  };
};


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
    "ABS Number",
    "Name",
    "Gender",
    "District",
    "State",
    "Age",
    "Blood Group",
    "Phone Number",
    "Height",
    "Weight",
    "Diseases",
    "Tests",
    "Medicines",
    "First Visit",
    "Last Visit"
  ];

  const rows = data.map(r => [
    r.Role,
    r.ABS_NO || "",
    r.Name,
    r.Gender || "",
    r.District || "",
    r.State || "",
    r.Age ?? "",
    r.Blood_Group || "",
    r.Phone_No || "",
    r.Height || "",
    r.Weight || "",
    [...(r.Communicable_Diseases || []), ...(r.NonCommunicable_Diseases || [])].join("; "),
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
      "ABS Number",
      "Name",
      "Gender",
      "District",
      "State",
      "Age",
      "Blood Group",
      "Phone Number",
      "Height",
      "Weight",
      "Diseases",
      "Tests",
      "Medicines",
      "First Visit",
      "Last Visit"
    ]],
    body: data.map(r => [
      r.Role,
      r.ABS_NO || "—",
      r.Name,
      r.Gender || "—",
      r.District || "—",
      r.State || "—",
      r.Age ?? "—",
      r.Blood_Group || "—",
      r.Phone_No || "—",
      r.Height || "—",
      r.Weight || "—",
      [...(r.Communicable_Diseases || []), ...(r.NonCommunicable_Diseases || [])].join(", "),
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
  const [stateFilter, setStateFilter] = useState("");
  const [absFilter, setAbsFilter] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [commonDiseases, setCommonDiseases] = useState([]);
  const [medicineFilter, setMedicineFilter] = useState("");
  const [testFilter, setTestFilter] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [heightFilter, setHeightFilter] = useState("");
const [weightFilter, setWeightFilter] = useState("");
const [currentPage, setCurrentPage] = useState(1);
const [showFilters, setShowFilters] = useState(false);
const rowsPerPage = 10;
  useEffect(() => {
    const institute = JSON.parse(localStorage.getItem("institute"));
    if (!institute) {
      setError("Institute not found in local storage");
      setLoading(false);
      return;
    }

    const loadAnalytics = async () => {
      try {
        const [analyticsRes, employeesRes] = await Promise.all([
          axios.get(`http://localhost:${BACKEND_PORT}/institute-api/analytics/${institute._id}`),
          axios.get(`http://localhost:${BACKEND_PORT}/institute-api/employees-detailed`).catch(() => ({ data: { employees: [] } }))
        ]);

        const employees = employeesRes?.data?.employees || [];
        const employeeIndex = {
          byAbs: new Map(
            employees
              .filter(emp => isPresent(emp.ABS_NO))
              .map(emp => [String(emp.ABS_NO).trim(), emp])
          ),
          byName: new Map(
            employees
              .filter(emp => isPresent(emp.Name))
              .map(emp => [String(emp.Name).trim().toLowerCase(), emp])
          )
        };

        const analyticsRows = Array.isArray(analyticsRes.data) ? analyticsRes.data : [];
        setRows(analyticsRows.map(row => normalizeAnalyticsRow(row, employeeIndex)));
        setLoading(false);
      } catch (err) {
        console.error("Analytics load error:", err);
        setError("Failed to load analytics data");
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    roleFilter,
    genderFilter,
    nameFilter,
    districtFilter,
    stateFilter,
    absFilter,
    diseaseFilter,
    medicineFilter,
    testFilter,
    bloodGroupFilter,
    abnormalOnly,
    ageMin,
    ageMax
  ]);

  

  const filteredRows = rows.filter(r => {
    const match = (v, f) =>
      !f || (v && v.toString().toLowerCase().includes(f.toLowerCase()));

    const ageOK =
      (!ageMin || r.Age >= Number(ageMin)) &&
      (!ageMax || r.Age <= Number(ageMax));

      const heightOK = !heightFilter || Number(r.Height) <= Number(heightFilter);
    const weightOK = !weightFilter || Number(r.Weight) <= Number(weightFilter);

    const hasAbnormal =
      r.Tests?.some(t => isAbnormal(t.Result_Value, t.Reference_Range));

const diseases = [
  ...(r.Communicable_Diseases || []),
  ...(r.NonCommunicable_Diseases || [])
];

const commonDiseaseMatch =
  commonDiseases.length === 0 ||
  commonDiseases.every(d =>
    diseases.map(x => x.toLowerCase()).includes(d.toLowerCase())
  );


return (
  (!roleFilter || r.Role === roleFilter) &&
  (!genderFilter || r.Gender === genderFilter) &&
  (!bloodGroupFilter || r.Blood_Group === bloodGroupFilter) &&
  match(r.Name, nameFilter) &&
  match(r.District, districtFilter) &&
  match(r.State, stateFilter) &&
  match(r.ABS_NO, absFilter) &&
 match(
  !diseaseFilter ||
  [...(r.Communicable_Diseases || []), ...(r.NonCommunicable_Diseases || [])]
    .map(d => d.toLowerCase())
    .includes(diseaseFilter.toLowerCase())
)&&
  commonDiseaseMatch &&
  match((r.Medicines || []).map(m => m.Medicine_Name).join(" "), medicineFilter) &&
  match((r.Tests || []).map(t => t.Test_Name).join(" "), testFilter) &&
  ageOK &&
  heightOK &&
  weightOK &&
  (!abnormalOnly || hasAbnormal)
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
    <div
    className="container-fluid py-4"
    style={{
      maxWidth: "100%",
      overflowX: "hidden",
     
    }}
  >
      <div className="mb-4">
        <h2 className="fw-bold">Institute Medical Analytics Dashboard</h2>
        <p className="text-muted">Comprehensive health records and medical data analysis</p>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
      

        <button
          className="btn btn-outline-primary"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {/* =============================== FILTER PANEL ================================*/}
      {showFilters && (
  <div className="card shadow-sm mb-4">
    <div className="card-body">
      <h5 className="card-title mb-3">Filters</h5>

      <div
        className="row g-3"
        style={{
          maxHeight: "350px",
          overflowY: "auto",
          overflowX: "hidden"
        }}
      >
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

            {/* Height Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Height ≤</label>
              <input
                type="number"
                className="form-control"
                placeholder="cm"
                value={heightFilter}
                onChange={(e) => setHeightFilter(e.target.value)}
              />
            </div>

            {/* Weight Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Weight ≤</label>
              <input
                type="number"
                className="form-control"
                placeholder="kg"
                value={weightFilter}
                onChange={(e) => setWeightFilter(e.target.value)}
              />
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

            {/* State Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">State</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by state"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
              />
            </div>

            {/* ABS Number Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">ABS Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by ABS number"
                value={absFilter}
                onChange={(e) => setAbsFilter(e.target.value)}
              />
            </div>

            {/* Disease Filter */}
            {/* Disease Filter */}


<div className="col-md-6">
  <label className="form-label fw-semibold">Common Diseases</label>

  <div
    style={{
      maxHeight: "120px",
      overflowY: "auto",
      border: "1px solid #ddd",
      borderRadius: "6px",
      padding: "8px",
      background: "#fafafa"
    }}
  >
    {[...new Set(
      rows.flatMap(r => [
        ...(r.Communicable_Diseases || []),
        ...(r.NonCommunicable_Diseases || [])
      ])
    )].map((disease, i) => (
      <div className="form-check" key={i}>
        <input
          className="form-check-input"
          type="checkbox"
          value={disease}
          id={`disease-${i}`}
          checked={commonDiseases.includes(disease)}
          onChange={(e) => {
            if (e.target.checked) {
              setCommonDiseases(prev => [...prev, disease]);
            } else {
              setCommonDiseases(prev => prev.filter(d => d !== disease));
            }
          }}
        />

        <label className="form-check-label" htmlFor={`disease-${i}`}>
          {disease}
        </label>
      </div>
    ))}
  </div>

  <small className="text-muted">
    Select multiple diseases to find people who have ALL of them
  </small>
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

          <button
          className="btn btn-outline-secondary btn-sm mt-2"
          onClick={() => {
            setRoleFilter("");
            setGenderFilter("");
            setNameFilter("");
            setDistrictFilter("");
            setStateFilter("");
            setAbsFilter("");
            setDiseaseFilter("");
            setCommonDiseases([]);
            setMedicineFilter("");
            setTestFilter("");
            setBloodGroupFilter("");
            setAgeMin("");
            setAgeMax("");
            setHeightFilter("");
        setWeightFilter("");
            setAbnormalOnly(false);
          }}
        >
          Reset Filters
        </button>

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
)}
      {/* =============================== TABLE ================================*/}
      <div className="card shadow-sm">
        <div className="card-body p-0">
        <div
  style={{
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden"
  }}
>
                    <table
          className="table table-hover table-striped mb-0"
          style={{
            minWidth: "1600px",
            whiteSpace: "nowrap"
          }}
> 
      <thead className="table-dark sticky-top">
                <tr>
                  <th>Role</th>
                  <th>ABS Number</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>District</th>
                  <th>State</th>
                  <th>Age</th>
                  <th>Blood Group</th>
                  <th>Phone Number</th>
                  <th>Height</th>
                  <th>Weight</th>
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
                    <td colSpan="16" className="text-center py-4 text-muted">
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
                    <td>{r.ABS_NO || "—"}</td>
                    <td className="fw-semibold">{r.Name}</td>
                    <td>{r.Gender || "—"}</td>
                    <td>{r.District || "—"}</td>
                    <td>{r.State || "—"}</td>
                    <td>{r.Age ?? "—"}</td>
                    <td>{r.Blood_Group || "—"}</td>
                    <td>{r.Phone_No || "—"}</td>
                    <td>{r.Height || "—"}</td>
                    <td>{r.Weight || "—"}</td>
                    <td>
                      {([...(r.Communicable_Diseases || []), ...(r.NonCommunicable_Diseases || [])]).length ? (
                        <div className="d-flex flex-column gap-1">
                          {([...(r.Communicable_Diseases || []), ...(r.NonCommunicable_Diseases || [])]).map((disease, idx) => (
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