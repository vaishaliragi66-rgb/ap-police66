import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const PrescriptionReport = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || "6100";
  const employeeId = localStorage.getItem("employeeId");

  useEffect(() => {
    if (employeeId) fetchPrescriptions();
  }, [employeeId]);

  const fetchPrescriptions = async () => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT_NO}/prescription-api/employee/${employeeId}`
      );
      setPrescriptions(res.data || []);
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="container mt-4">
      <button
        className="btn btn-secondary mb-3"
        onClick={() => window.history.back()}
      >
        ← Back
      </button>

      <div className="card shadow p-3">
        <h4 className="text-center mb-3">All Prescriptions</h4>

        <div className="table-responsive">
          <table className="table table-bordered table-striped align-middle">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Institute</th>
                <th>Person</th>
                <th>Medicine</th>
                <th>Quantity</th>
                <th>Date Given</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length > 0 ? (
                prescriptions.map((p, idx) =>
                  p.Medicines.map((m, i) => (
                    <tr key={`${p._id}-${i}`}>
                      {i === 0 && (
                        <>
                          <td rowSpan={p.Medicines.length}>{idx + 1}</td>
                          {/* ✅ FIXED INSTITUTE NAME */}
                          <td rowSpan={p.Medicines.length}>
                            {p.Institute?.Institute_Name || "—"}
                          </td>
                          <td rowSpan={p.Medicines.length}>
                            {p.IsFamilyMember
                              ? `${p.FamilyMember?.Name} (${p.FamilyMember?.Relationship})`
                              : `${p.Employee?.Name} (Employee)`}
                          </td>
                        </>
                      )}
                      <td>{m.Medicine_Name}</td>
                      <td>{m.Quantity}</td>
                      <td>{formatDate(p.Timestamp)}</td>
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">
                    No prescriptions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionReport;
