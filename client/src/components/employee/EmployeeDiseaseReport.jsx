import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { fetchMasterDataMap, getMasterOptions } from "../../utils/masterData_clean";
import PersonFilterDropdown from "../common/PersonFilterDropdown";
import { usePersonFilter } from "../../context/PersonFilterContext";
import DateRangeFilter from "../common/DateRangeFilter";
import PDFDownloadButton from "../common/PDFDownloadButton";

const EmployeeDiseaseReport = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:6100";
  const employeeObjectId = localStorage.getItem("employeeObjectId");
  const employeeId = localStorage.getItem("employeeId") || employeeObjectId;

  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [masterMap, setMasterMap] = useState({});
  const { selectedPersonId, setSelectedPersonId, options, loadingFamily } = usePersonFilter(employeeObjectId || employeeId);

  const diseaseCategoryOptions = getMasterOptions(masterMap, "Disease Categories");

  useEffect(() => {
    let mounted = true;
    const loadMaster = async () => {
      try {
        const data = await fetchMasterDataMap({ force: true });
        if (mounted) setMasterMap(data || {});
      } catch {
        if (mounted) setMasterMap({});
      }
    };

    loadMaster();
    const onMasterUpdated = () => loadMaster();
    window.addEventListener("master-data-updated", onMasterUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("master-data-updated", onMasterUpdated);
    };
  }, []);

  useEffect(() => {
    if (!employeeObjectId) return;

    setLoading(true);

    axios
      .get(`${BACKEND_URL}/disease-api/employee/${employeeObjectId}`, {
        params: {
          employeeId: employeeObjectId,
          personId: selectedPersonId,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        },
      })
      .then((res) => {
        const incoming = Array.isArray(res.data) ? res.data : [];
        const filtered =
          selectedPersonId === "all"
            ? incoming
            : selectedPersonId === "self"
            ? incoming.filter((d) => !d.IsFamilyMember)
            : incoming.filter(
                (d) =>
                  d.IsFamilyMember &&
                  String(d.FamilyMember_ID?._id || d.FamilyMember_ID || "") === String(selectedPersonId)
              );
        setDiseases(filtered);
      })
      .catch(() => setDiseases([]))
      .finally(() => setLoading(false));
  }, [employeeObjectId, selectedPersonId, fromDate, toDate]);

  const filteredDiseases = useMemo(() => {
    return diseases.filter((d) => {
      if (
        categoryFilter !== "ALL" &&
        d.Category !== categoryFilter
      )
        return false;

      return true;
    });
  }, [diseases, categoryFilter]);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <strong>Loading disease records...</strong>
      </div>
    );
  }

  const extractSymptomsFromNotes = (notes) => {
  if (!notes) return [];

  const match = notes.match(/Symptoms\s*:\s*(.*)/i);
  if (!match) return [];

  // take only first line after Symptoms:
  const line = match[1].split("\n")[0];

  return line.split(",").map(s => s.trim()).filter(Boolean);
};


const cleanNotesWithoutSymptoms = (notes) => {
  if (!notes) return "-";

  // Remove the Symptoms line completely
  const cleaned = notes.replace(/Symptoms\s*:\s*.*(\r?\n)?/i, "").trim();

  return cleaned || "-";
};


  return (
    <div
      className="employee-disease-page"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(191,219,254,0.62), transparent 24%), radial-gradient(circle at right center, rgba(224,242,254,0.74), transparent 28%), linear-gradient(180deg, #F5FAFF, #EEF6FF)",
        minHeight: "100vh",
        padding: "40px 0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>
        {`
          .employee-disease-page .health-card {
            background: rgba(255,255,255,0.78);
            border: 1px solid rgba(255,255,255,0.88);
            border-radius: 24px;
            box-shadow: 0 24px 44px rgba(148,184,255,0.18);
            backdrop-filter: blur(18px);
          }

          .employee-disease-page .form-select {
            min-height: 44px;
            border-radius: 14px;
            border: 1px solid rgba(191,219,254,0.75);
            background: rgba(248,250,252,0.96);
            box-shadow: 0 10px 20px rgba(148,163,184,0.08);
          }

          .employee-disease-page .table {
            --bs-table-bg: transparent;
          }

          .employee-disease-page .table thead th {
            background: #EFF6FF;
            color: #1E3A8A;
            border-color: rgba(191,219,254,0.78);
            white-space: nowrap;
          }

          .employee-disease-page .table tbody tr:hover {
            background: rgba(239,246,255,0.72);
          }
        `}
      </style>
      <div className="container">
  
        {/* BACK */}
        <button
          className="btn mb-4"
          onClick={() => window.history.back()}
          style={{
            backgroundColor: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(191,219,254,0.82)",
            borderRadius: "14px",
            padding: "6px 14px",
            fontSize: "14px",
            color: "#1F2933",
            boxShadow: "0 12px 20px rgba(191,219,254,0.14)",
          }}
        >
          ← Back
        </button>
  
        {/* PAGE HEADER */}
        <div className="mb-4">
          <h3 style={{ fontWeight: 600, color: "#1F2933" }}>
            Disease History
          </h3>
          <p style={{ color: "#6B7280", marginBottom: 0 }}>
            View chronic and recent disease records for you and your family
          </p>
        </div>
  
        {/* FILTER CARD */}
        <div
          className="mb-4 health-card"
          style={{
            borderRadius: "24px",
            padding: "20px",
          }}
        >
          <div className="row g-3">
  
            <div className="col-md-3">
              <PersonFilterDropdown
                options={options}
                value={selectedPersonId}
                onChange={setSelectedPersonId}
                loading={loadingFamily}
              />
            </div>
  
            <div className="col-md-3">
              <label className="form-label fw-semibold">Category</label>
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                {diseaseCategoryOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="col-md-6 d-flex align-items-end gap-3">
              <div style={{ minWidth: 320 }}>
                <label className="form-label fw-semibold">Date Range</label>
                <DateRangeFilter fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} onApply={() => {
                  if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) return alert('From Date cannot be after To Date');
                  // setSelectedPersonId no-op to trigger effect
                  setSelectedPersonId((s) => s);
                }} />
              </div>
              <div className="ms-auto mb-2">
                <PDFDownloadButton modulePath="disease-api" params={{ employeeId: employeeObjectId, personId: selectedPersonId, fromDate, toDate }} filenamePrefix={`DiseaseHistory_${employeeId}`} />
              </div>
            </div>
  
          </div>
        </div>
  
        {/* TABLE CARD */}
        <div
          className="card border-0 health-card"
          style={{
            borderRadius: "24px",
          }}
        >
          <div className="card-body">
  
            <div className="table-responsive">
              <table
                className="table align-middle"
                style={{
                  border: "1px solid #D6E0F0",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <thead
                  style={{
                    backgroundColor: "#F3F7FF",
                    color: "#1F2933",
                    fontWeight: 600,
                  }}
                >
                  <tr>
                    <th>Date</th>
                    <th>Person</th>
                    <th>Disease</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Symptoms</th>
                    <th>Notes</th>
                  </tr>
                </thead>
  
                <tbody>
                  {filteredDiseases.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center text-muted">
                        No records found for selected person
                      </td>
                    </tr>
                  )}
  
                  {filteredDiseases.map((d, i) => (
                    <tr
                      key={i}
                    >
                      <td>
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
  
                      <td>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 600,
                            backgroundColor: d.IsFamilyMember
                              ? "#FFF4E5"
                              : "#EAF2FF",
                            color: d.IsFamilyMember
                              ? "#92400E"
                              : "#1D4ED8",
                          }}
                        >
                          {d.IsFamilyMember
                            ? `${d.FamilyMember_ID?.Name} (${d.FamilyMember_ID?.Relationship})`
                            : "Self"}
                        </span>
                      </td>
  
                      <td>{d.Disease_Name}</td>
                      <td>{d.Category}</td>
                      <td>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 600,
                            backgroundColor:
                              d.Severity_Level === "Mild"
                                ? "#D1FAE5"
                                : d.Severity_Level === "Moderate"
                                ? "#FEF08A"
                                : d.Severity_Level === "Severe"
                                ? "#FECACA"
                                : "#DDD6FE",
                            color: "#1F2933",
                          }}
                        >
                          {d.Severity_Level}
                        </span>
                      </td>
                      <td>
                        {d.Symptoms.length > 0
                          ? d.Symptoms.join(", ")
                          : extractSymptomsFromNotes(d.Notes).join(", ") || "-"}
                      </td>
                      <td>{cleanNotesWithoutSymptoms(d.Notes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
  
          </div>
        </div>
      </div>
    </div>
  );
  
};

export default EmployeeDiseaseReport;
