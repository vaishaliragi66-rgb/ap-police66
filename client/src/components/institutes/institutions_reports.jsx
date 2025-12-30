import React, { useEffect, useState } from "react";
import axios from "axios";

const InstituteReports = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [employeeData, setEmployeeData] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [familyReport, setFamilyReport] = useState(null);

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || "6100";

  // 🟩 Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/employee-api/employees`
        );
        setEmployees(res.data || []);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    fetchEmployees();
  }, []);

  // 🟩 Filter employees based on ABS_NO
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEmployees([]);
    } else {
      const filtered = employees.filter((emp) =>
        String(emp.ABS_NO || "")
          .toLowerCase()
          .startsWith(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  // 🟩 Fetch selected employee report
  const fetchEmployeeReport = async (emp) => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT_NO}/employee-api/by-abs/${emp.ABS_NO}`
      );
      setEmployeeData(res.data);
      setFamilyMembers(res.data.FamilyMembers || []);
      setFamilyReport(null);
      setSelectedEmployee(emp);
      setSearchTerm(emp.ABS_NO);
      setFilteredEmployees([]);
    } catch (err) {
      console.error("Error fetching employee report:", err);
      alert("❌ Employee not found or server error");
    }
  };

  // 🟩 Fetch selected family member report
  const fetchFamilyReport = async (id) => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT_NO}/family-api/family-report/${id}`
      );
      setFamilyReport(res.data);
    } catch (err) {
      console.error("Error fetching family report:", err);
      alert("❌ Error fetching family report");
    }
  };

  return (
    <div
      className="container bg-white shadow-sm rounded-4 p-4 mt-4"
      style={{ maxWidth: "800px" }}
    >
      <h3 className="fw-bold mb-4">📋 Employee & Family Health Reports</h3>

      {/* Search Field (with dynamic ABS_NO search) */}
      <label className="fw-semibold mb-2">Employee ABS_NO</label>
      <input
        type="text"
        placeholder="Type ABS_NO..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          borderRadius: 6,
          border: "1px solid #ccc",
        }}
      />

      {/* Dropdown suggestions */}
      {searchTerm && filteredEmployees.length > 0 && (
        <div
          style={{
            border: "1px solid #ccc",
            maxHeight: 150,
            overflowY: "auto",
            marginTop: 6,
            borderRadius: 6,
          }}
        >
          {filteredEmployees.map((emp) => (
            <div
              key={emp._id}
              onClick={() => fetchEmployeeReport(emp)}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {emp.ABS_NO} — {emp.Name}
            </div>
          ))}
        </div>
      )}

      {/* Show Employee Data */}
      {employeeData && (
        <div className="mt-4">
          <h5>
            🧑‍💼 Employee: <b>{employeeData.Name}</b> ({employeeData.ABS_NO})
          </h5>
          <p>Email: {employeeData.Email}</p>

          <h6 className="mt-3">🩺 Medical History:</h6>
          {employeeData.Medical_History?.length > 0 ? (
            <table className="table table-bordered mt-2">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Disease</th>
                  <th>Category</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {employeeData.Medical_History.map((mh, i) => (
                  <tr key={i}>
                    <td>{new Date(mh.Date).toLocaleDateString()}</td>
                    <td>
                      {mh.Disease.map((d) => d.Disease_Name).join(", ") || "—"}
                    </td>
                    <td>
                      {mh.Disease.map((d) => d.Category).join(", ") || "—"}
                    </td>
                    <td>
                      {mh.Disease.map((d) => d.Severity_Level).join(", ") ||
                        "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No diseases recorded.</p>
          )}

          {/* Family Members Section */}
          {familyMembers.length > 0 && (
            <div className="mt-4">
              <h6>👨‍👩‍👧 Family Members:</h6>
              <select
                className="form-select mt-2"
                value={selectedFamilyId}
                onChange={(e) => {
                  setSelectedFamilyId(e.target.value);
                  if (e.target.value) fetchFamilyReport(e.target.value);
                }}
              >
                <option value="">Select Family Member</option>
                {familyMembers.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.Name} ({f.Relationship})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Family Member Report */}
      {familyReport && (
        <div className="mt-5">
          <h5>
            👩‍👧 Family Member: <b>{familyReport.Name}</b> (
            {familyReport.Relationship})
          </h5>

          {familyReport.Medical_History?.length > 0 ? (
            <table className="table table-bordered mt-2">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Disease</th>
                  <th>Category</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {familyReport.Medical_History.map((mh, i) => (
                  <tr key={i}>
                    <td>{new Date(mh.Date).toLocaleDateString()}</td>
                    <td>
                      {mh.Disease.map((d) => d.Disease_Name).join(", ") || "—"}
                    </td>
                    <td>
                      {mh.Disease.map((d) => d.Category).join(", ") || "—"}
                    </td>
                    <td>
                      {mh.Disease.map((d) => d.Severity_Level).join(", ") ||
                        "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No disease history found for this family member.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default InstituteReports;
