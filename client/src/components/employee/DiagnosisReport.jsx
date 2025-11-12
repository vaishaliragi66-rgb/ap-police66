import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const DiagnosisReport = () => {
  const [reports, setReports] = useState([]);
  const navigate = useNavigate();
  const employeeId = localStorage.getItem("employeeId");
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

  console.log("Employee ID from localStorage:", employeeId);

  useEffect(() => {
    axios
      .get(`http://localhost:${BACKEND_PORT_NO}/diagnosis-api/records/${employeeId}`)
      .then((res) => setReports(res.data))
      .catch((err) => console.error("Error fetching reports:", err));
  }, [employeeId, BACKEND_PORT_NO]);

  // Function to check if result is in normal range
  const getStatusStyle = (result, range) => {
    try {
      const num = parseFloat(result);
      const matches = range.match(/(\d+\.?\d*)-(\d+\.?\d*)/);

      if (matches && num) {
        const low = parseFloat(matches[1]);
        const high = parseFloat(matches[2]);
        if (num >= low && num <= high)
          return {
            label: "Normal",
            style: {
              backgroundColor: "#dff0d8", // light green
              color: "#155724",
              fontWeight: "600",
              borderRadius: "6px",
              padding: "4px 10px",
              display: "inline-block",
            },
          };
      }
      return {
        label: "Risk",
        style: {
          backgroundColor: "#f8d7da", // light red
          color: "#721c24",
          fontWeight: "600",
          borderRadius: "6px",
          padding: "4px 10px",
          display: "inline-block",
        },
      };
    } catch {
      return {
        label: "N/A",
        style: {
          backgroundColor: "#e2e3e5",
          color: "#383d41",
          borderRadius: "6px",
          padding: "4px 10px",
          display: "inline-block",
        },
      };
    }
  };

  const formatDate = (report) => {
    const lastTest = report.Tests?.[report.Tests.length - 1];
    if (lastTest?.Timestamp)
      return new Date(lastTest.Timestamp).toLocaleString("en-IN");
    return report.createdAt
      ? new Date(report.createdAt).toLocaleString("en-IN")
      : "N/A";
  };

  return (
    <div
      className="container mt-5"
      style={{
        fontFamily: "'Inter', sans-serif",
        color: "#111",
      }}
    >
      <button
        className="btn btn-outline-dark mb-3"
        onClick={() => navigate(-1)}
        style={{ borderRadius: "8px" }}
      >
        ← Back
      </button>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h4
            className="text-center mb-4 fw-bold"
            style={{ color: "#111", letterSpacing: "0.5px" }}
          >
            Diagnosis Report
          </h4>

          {reports.length === 0 ? (
            <p className="text-center text-muted">No reports found.</p>
          ) : (
            <div className="table-responsive">
              <table
                className="table align-middle"
                style={{
                  borderCollapse: "separate",
                  borderSpacing: "0 10px",
                }}
              >
                <thead
                  style={{
                    backgroundColor: "#f1f1f1",
                    color: "#111",
                    fontWeight: "600",
                    borderBottom: "2px solid #ccc",
                  }}
                >
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Institute</th>
                    <th>Test Name</th>
                    <th>Result</th>
                    <th>Reference Range</th>
                    <th>Status</th>
                    <th>Test Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, index) =>
                    report.Tests.map((test, tIndex) => {
                      const status = getStatusStyle(
                        test.Result_Value,
                        test.Reference_Range
                      );
                      return (
                        <tr
                          key={`${report._id}-${tIndex}`}
                          style={{
                            backgroundColor: "#fff",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                            borderRadius: "8px",
                          }}
                        >
                          <td>{index + 1}</td>
                          <td>
                            {report.IsFamilyMember && report.FamilyMember
                              ? `${report.FamilyMember.Name} (${report.FamilyMember.Relationship})`
                              : report.Employee?.Name || "Employee"}
                          </td>
                          <td>
                            {report.IsFamilyMember ? (
                              <span
                                style={{
                                  backgroundColor: "#e9ecef",
                                  borderRadius: "6px",
                                  padding: "4px 8px",
                                  fontSize: "0.85rem",
                                }}
                              >
                                Family Member
                              </span>
                            ) : (
                              <span
                                style={{
                                  backgroundColor: "#f1f3f5",
                                  borderRadius: "6px",
                                  padding: "4px 8px",
                                  fontSize: "0.85rem",
                                }}
                              >
                                Employee
                              </span>
                            )}
                          </td>
                          <td>{report.Institute?.Institute_Name || "Apollo"}</td>
                          <td>{test.Test_Name}</td>
                          <td>
                            {test.Result_Value} {test.Units}
                          </td>
                          <td>{test.Reference_Range}</td>
                          <td>
                            <span style={status.style}>{status.label}</span>
                          </td>
                          <td>{formatDate(report)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosisReport;
