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
    <div className="container mt-4">
      <div className="card shadow">
        <div className="card-header bg-dark text-white">
          <h5 className="mb-0">Disease Report</h5>
        </div>

        <div className="card-body">
          {/* FILTERS */}
          <div className="row g-2 mb-3">
            <div className="col-md-3">
              <label className="form-label">Show</label>
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
              <label className="form-label">Family Member</label>
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
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value)
                }
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

          {/* TABLE */}
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-dark">
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
                    <td colSpan="7" className="text-center">
                      No disease records found
                    </td>
                  </tr>
                )}

                {filteredDiseases.map((d, i) => (
                  <tr key={i}>
                    <td>
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {d.IsFamilyMember
                        ? `${d.FamilyMember_ID?.Name} (${d.FamilyMember_ID?.Relationship})`
                        : "Self"}
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
  );
};

export default EmployeeDiseaseReport;
