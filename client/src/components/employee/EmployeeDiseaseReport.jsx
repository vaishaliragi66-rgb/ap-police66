import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const EmployeeDiseaseReport = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const employeeId = localStorage.getItem("employeeId");

  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [showType, setShowType] = useState("ALL"); // ALL | SELF | FAMILY
  const [familyFilter, setFamilyFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  useEffect(() => {
    if (!employeeId) return;

    axios
      .get(
        `http://localhost:${BACKEND_PORT}/disease-api/employee/${employeeId}`
      )
      .then((res) => {
        setDiseases(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [employeeId]);

  const familyMembers = useMemo(() => {
    const set = new Map();
    diseases.forEach((d) => {
      if (d.FamilyMember_ID) {
        set.set(d.FamilyMember_ID._id, d.FamilyMember_ID);
      }
    });
    return Array.from(set.values());
  }, [diseases]);

  const filteredDiseases = useMemo(() => {
    return diseases.filter((d) => {
      if (showType === "SELF" && d.IsFamilyMember) return false;
      if (showType === "FAMILY" && !d.IsFamilyMember) return false;

      if (
        familyFilter !== "ALL" &&
        d.FamilyMember_ID?._id !== familyFilter
      )
        return false;

      if (
        categoryFilter !== "ALL" &&
        d.Category !== categoryFilter
      )
        return false;

      return true;
    });
  }, [diseases, showType, familyFilter, categoryFilter]);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <strong>Loading disease records...</strong>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        padding: "40px 0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="container">
  
        {/* BACK */}
        <button
          className="btn mb-4"
          onClick={() => window.history.back()}
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #D6E0F0",
            borderRadius: "8px",
            padding: "6px 14px",
            fontSize: "14px",
            color: "#1F2933",
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
          className="mb-4"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "14px",
            border: "1px solid #D6E0F0",
            padding: "20px",
            boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
          }}
        >
          <div className="row g-3">
  
            <div className="col-md-3">
              <label className="form-label fw-semibold">Show</label>
              <select
                className="form-select"
                value={showType}
                onChange={(e) => setShowType(e.target.value)}
              >
                <option value="ALL">Self & Family</option>
                <option value="SELF">Self</option>
                <option value="FAMILY">Family</option>
              </select>
            </div>
  
            <div className="col-md-3">
              <label className="form-label fw-semibold">
                Family Member
              </label>
              <select
                className="form-select"
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                {familyMembers.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.Name} ({f.Relationship})
                  </option>
                ))}
              </select>
            </div>
  
            <div className="col-md-3">
              <label className="form-label fw-semibold">Category</label>
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="Non-Communicable">
                  Non-Communicable (Chronic)
                </option>
                <option value="Communicable">
                  Communicable (Recent)
                </option>
              </select>
            </div>
  
          </div>
        </div>
  
        {/* TABLE CARD */}
        <div
          className="card border-0"
          style={{
            borderRadius: "16px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
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
                        No disease records found
                      </td>
                    </tr>
                  )}
  
                  {filteredDiseases.map((d, i) => (
                    <tr
                      key={i}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "#F8FAFC")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "transparent")
                      }
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
                      <td>{d.Severity_Level}</td>
                      <td>{d.Symptoms.join(", ")}</td>
                      <td>{d.Notes || "-"}</td>
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
