import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const XrayReport = () => {
  const [reports, setReports] = useState([]);
  const [showType, setShowType] = useState("ALL"); // ALL | SELF | FAMILY
  const [familyFilter, setFamilyFilter] = useState("ALL");

  const navigate = useNavigate();
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const employeeObjectId = localStorage.getItem("employeeObjectId");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!employeeObjectId) return;

    axios
      .get(
        `${import.meta.env.REACT_APP_API_URL}/xray-api/records/${employeeObjectId}`
      )
      .then((res) => {
        console.log("X-ray records fetched", res.data);
        setReports(res.data || []);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setReports([]);
        } else {
          console.error(err);
        }
      });
  }, [employeeObjectId, refreshKey]);

  const formatDate = (record) => {
    if (record?.Xrays?.length > 0 && record.Xrays[0].Timestamp) {
      const d = new Date(record.Xrays[0].Timestamp);
      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("en-IN");
    }
    if (record.Timestamp) {
      const d = new Date(record.Timestamp);
      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("en-IN");
    }
    if (record.createdAt) {
      const d = new Date(record.createdAt);
      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("en-IN");
    }
    return "N/A";
  };

  const splitReportsByDate = (records) => {
    const rows = [];

    records.forEach((record) => {
      if (!record.Xrays || record.Xrays.length === 0) return;

      const grouped = {};

      record.Xrays.forEach((x) => {
        if (!x.Timestamp) return;
        const dateKey = new Date(x.Timestamp).toISOString().split("T")[0];
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(x);
      });

      Object.values(grouped).forEach((xraysForDate) => {
        rows.push({
          ...record,
          Xrays: xraysForDate // override only the xrays for that date
        });
      });
    });

    return rows.sort(
      (a, b) =>
        new Date(b.Xrays[0].Timestamp) - new Date(a.Xrays[0].Timestamp)
    );
  };

  // derive filtered list
  const filteredReports = React.useMemo(() => {
    let list = reports || [];

    if (showType === "SELF") {
      list = list.filter(r => !r.IsFamilyMember);
    } else if (showType === "FAMILY") {
      list = list.filter(r => r.IsFamilyMember);
    }

    if (familyFilter !== "ALL") {
      list = list.filter(r => r.FamilyMember?._id === familyFilter);
    }

    return list;
  }, [reports, showType, familyFilter]);

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
        <button
          className="btn mb-3"
          onClick={() => navigate(-1)}
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

        <div
          className="card border-0"
          style={{
            borderRadius: "16px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div className="card-body">
            <div
              style={{
                background: "linear-gradient(90deg, #F8FAFC, #F3F7FF)",
                padding: "16px 24px",
                borderBottom: "1px solid #D6E0F0",
                borderRadius: "16px 16px 0 0",
              }}
              className="d-flex flex-column gap-2"
            >
              <div className="d-flex justify-content-between align-items-center">
                <h4 style={{ fontWeight: 600, color: "#1F2933", margin: 0 }}>
                  X‑ray Reports
                </h4>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm"
                    style={{
                      backgroundColor: "#4A70A9",
                      color: "#FFFFFF",
                      borderRadius: "999px",
                      padding: "6px 16px",
                      fontWeight: 500,
                      border: "none",
                    }}
                    onClick={() => setRefreshKey((p) => p + 1)}
                  >
                    Refresh
                  </button>

                  </div>
              </div>

              {/* filter section */}
              <div className="d-flex gap-3 align-items-center">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 140 }}
                  value={showType}
                  onChange={(e) => setShowType(e.target.value)}
                >
                  <option value="ALL">Show: All</option>
                  <option value="SELF">Self</option>
                  <option value="FAMILY">Family</option>
                </select>

                {showType !== "SELF" && (
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 200 }}
                    value={familyFilter}
                    onChange={(e) => setFamilyFilter(e.target.value)}
                  >
                    <option value="ALL">Any family member</option>
                    {reports
                      .map(r => r.FamilyMember)
                      .filter(Boolean)
                      .filter((v, i, a) => a.findIndex(x => x._id === v._id) === i)
                      .map(fm => (
                        <option key={fm._id} value={fm._id}>
                          {fm.Name} ({fm.Relationship})
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            {/* summary count */}
            <div className="mt-2 mb-3 text-muted small">
              Showing {filteredReports.length} of {reports.length} report{reports.length === 1 ? "" : "s"}
            </div>

            {filteredReports.length === 0 ? (
              <p className="text-center text-muted">
                No x‑ray reports found.
              </p>
            ) : (
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
                      <th>#</th>
                      <th>Patient</th>
                      <th>Report For</th>
                      <th>Institute</th>
                      <th>No. of X‑rays</th>
                      <th>Report Date</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {splitReportsByDate(filteredReports).map((report, index) => (
                      <tr key={report._id + report.Xrays[0]?.Timestamp}>
                        <td>{index + 1}</td>

                        <td>
                          {report.Employee?.Name}
                          {report.Employee?.ABS_NO &&
                            ` (${report.Employee.ABS_NO})`}
                        </td>

                        <td>
                          {report.IsFamilyMember
                            ? `${report.FamilyMember?.Name} (${report.FamilyMember?.Relationship})`
                            : "Self"}
                        </td>

                        <td>
                          {report.Institute?.Institute_Name ||
                            "Medical Institute"}
                        </td>

                        <td>{report.Xrays.length}</td>

                        <td>{formatDate(report)}</td>

                        <td>
                          <button
                            className="btn btn-sm"
                            style={{
                              borderRadius: "999px",
                              border: "1px solid #4A70A9",
                              backgroundColor: "#4A70A9",
                              color: "#FFFFFF",
                              fontWeight: 500,
                            }}
                            onClick={() => {
                              setSelectedReport(report);
                              setShowModal(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && selectedReport && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">X‑ray Details</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                />
              </div>

              <div className="modal-body">
                <p><strong>Employee:</strong> {selectedReport.Employee?.Name}</p>
                <p>
                  <strong>Report For:</strong>{" "}
                  {selectedReport.IsFamilyMember
                    ? `${selectedReport.FamilyMember?.Name} (${selectedReport.FamilyMember?.Relationship})`
                    : "Self"}
                </p>
                <p><strong>Institute:</strong> {selectedReport.Institute?.Institute_Name}</p>
                <p><strong>Date:</strong> {formatDate(selectedReport)}</p>

                <hr />

                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Type</th>
                      <th>Body Part</th>
                      <th>Side</th>
                      <th>View</th>
                      <th>Size</th>
                      <th>Findings</th>
                      <th>Impression</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.Xrays.map((x, i) => (
                      <tr key={i}>
                        <td>{x.Xray_Type}</td>
                        <td>{x.Body_Part}</td>
                        <td>{x.Side}</td>
                        <td>{x.View || "-"}</td>
                        <td>{x.Film_Size || "-"}</td>
                        <td>{x.Findings || "-"}</td>
                        <td>{x.Impression || "-"}</td>
                        <td>{x.Remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XrayReport;
