import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

export default function InstituteReports() {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Filters */
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  /* Modals */
  const [selectedInstitute, setSelectedInstitute] = useState(null);
  const [mailInstitute, setMailInstitute] = useState(null);

  /* Mail */
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [sending, setSending] = useState(false);
  const adminEmail = localStorage.getItem("adminEmail");

  /* ===============================
     FETCH DATA
  ================================*/
  useEffect(() => {
    axios
      .get(`http://localhost:${BACKEND_PORT}/admin-api/analytics/institutes`)
      .then(res => {
        setRows(res.data || []);
        setFiltered(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ===============================
     FILTERING
  ================================*/
  useEffect(() => {
    let temp = [...rows];

    if (name) {
      temp = temp.filter(i =>
        i.Institute_Name.toLowerCase().includes(name.toLowerCase())
      );
    }

    if (district) {
      temp = temp.filter(i =>
        i.Address?.District?.toLowerCase().includes(district.toLowerCase())
      );
    }

    setFiltered(temp);
    setCurrentPage(1);
  }, [name, district, rows]);

  /* ===============================
     PAGINATION
  ================================*/
  const last = currentPage * rowsPerPage;
  const first = last - rowsPerPage;
  const paginated = filtered.slice(first, last);
  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  if (loading) {
    return <div className="text-center mt-5">Loading…</div>;
  }

  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        padding: "32px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="container-fluid">
  
        {/* PAGE HEADER */}
        <div className="mb-4">
          <h3 style={{ fontWeight: 600, color: "#1F2933" }}>
            Institute Reports
          </h3>
          <p style={{ color: "#6B7280", marginBottom: 0 }}>
            Monitor institute inventory, stock status and communication
          </p>
        </div>
  
        {/* FILTER CARD */}
        <div
          className="card border-0 mb-4"
          style={{
            borderRadius: "14px",
            boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
          }}
        >
          <div className="card-body">
            <div className="row g-3 align-items-end">
  
              <div className="col-md-3">
                <label className="form-label small text-muted">
                  Institute Name
                </label>
                <input
                  className="form-control"
                  placeholder="Search by institute"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
  
              <div className="col-md-3">
                <label className="form-label small text-muted">
                  District
                </label>
                <input
                  className="form-control"
                  placeholder="Search by district"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                />
              </div>
  
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
          <div className="card-body p-0">
  
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead
                  style={{
                    backgroundColor: "#F3F7FF",
                    color: "#1F2933",
                    fontWeight: 600,
                  }}
                >
                  <tr>
                    <th>ID</th>
                    <th>Institute</th>
                    <th>Email</th>
                    <th>District</th>
                    <th>Main</th>
                    <th>Sub</th>
                    <th>Low Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
  
                <tbody>
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-muted">
                        No records found
                      </td>
                    </tr>
                  )}
  
                  {paginated.map((r, i) => (
                    <tr key={i}>
                      <td>{r.Institute_ID}</td>
                      <td className="fw-semibold">{r.Institute_Name}</td>
  
                      <td>
                        <button
                          className="btn btn-link p-0"
                          style={{ color: "#4A70A9" }}
                          onClick={() => setMailInstitute(r)}
                        >
                          {r.Email_ID}
                        </button>
                      </td>
  
                      <td>{r.Address?.District || "—"}</td>
                      <td>{r.MainStore_Count}</td>
                      <td>{r.SubStore_Count}</td>
  
                      <td
                        style={{
                          color:
                            r.LowStock_Count > 0 ? "#D14343" : "#1F2933",
                          fontWeight:
                            r.LowStock_Count > 0 ? 600 : 400,
                        }}
                      >
                        {r.LowStock_Count}
                      </td>
  
                      <td>
                        <button
                          className="btn btn-sm"
                          style={{
                            backgroundColor: "#4A70A9",
                            color: "#fff",
                            borderRadius: "999px",
                            padding: "6px 14px",
                            border: "none",
                          }}
                          onClick={() => setSelectedInstitute(r)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
  
          </div>
        </div>

        {selectedInstitute && (
  <div
    className="modal show d-block"
    style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
  >
    <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div className="modal-content" style={{ borderRadius: "14px" }}>
        
        {/* HEADER */}
        <div
          className="modal-header"
          style={{
            backgroundColor: "#F3F7FF",
            borderBottom: "1px solid #D6E0F0",
          }}
        >
          <div>
            <h5 className="mb-0 fw-semibold text-dark">
              {selectedInstitute.Institute_Name}
            </h5>
            <small className="text-muted">
              Medicines Inventory Overview
            </small>
          </div>

          <button
            className="btn-close"
            onClick={() => setSelectedInstitute(null)}
          />
        </div>

        {/* BODY */}
        <div className="modal-body" style={{ backgroundColor: "#F8FAFC" }}>
          
          {/* MAIN STORE */}
          <div className="mb-4">
            <h6 className="fw-semibold text-primary mb-2">
              Main Store Medicines
            </h6>

            {selectedInstitute.mainStore?.length ? (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead style={{ backgroundColor: "#EAF2FF" }}>
                    <tr>
                      <th>Medicine</th>
                      <th>Batch</th>
                      <th>Quantity</th>
                      <th>Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInstitute.mainStore.map((m, i) => (
                      <tr key={i}>
                        <td>{m.Medicine_Name || "-"}</td>
                        <td>{m.Batch_No || "-"}</td>
                        <td
                          className={
                            m.Quantity < 10
                              ? "text-danger fw-semibold"
                              : ""
                          }
                        >
                          {m.Quantity}
                        </td>
                        <td>
                          {m.Expiry_Date
                            ? new Date(m.Expiry_Date).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted small">
                No medicines in main store
              </p>
            )}
          </div>

          {/* SUB STORE */}
          <div>
            <h6 className="fw-semibold text-success mb-2">
              Sub Store Medicines
            </h6>

            {selectedInstitute.subStore?.length ? (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead style={{ backgroundColor: "#EAFBEA" }}>
                    <tr>
                      <th>Medicine</th>
                      <th>Batch</th>
                      <th>Quantity</th>
                      <th>Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInstitute.subStore.map((m, i) => (
                      <tr key={i}>
                        <td>{m.Medicine_Name || "-"}</td>
                        <td>{m.Batch_No || "-"}</td>
                        <td
                          className={
                            m.Quantity < 10
                              ? "text-danger fw-semibold"
                              : ""
                          }
                        >
                          {m.Quantity}
                        </td>
                        <td>
                          {m.Expiry_Date
                            ? new Date(m.Expiry_Date).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted small">
                No medicines in sub store
              </p>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div
          className="modal-footer"
          style={{ borderTop: "1px solid #D6E0F0" }}
        >
          <button
            className="btn btn-outline-secondary"
            onClick={() => setSelectedInstitute(null)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}

  
        {/* PAGINATION */}
        <ul className="pagination justify-content-center mt-4">
          {[...Array(totalPages)].map((_, i) => (
            <li
              key={i}
              className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
            >
              <button
                className="page-link"
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ul>
  
      </div>
    </div>
  );
  
}