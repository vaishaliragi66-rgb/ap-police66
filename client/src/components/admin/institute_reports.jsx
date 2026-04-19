import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./AdminDashboard.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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
      .get(`${BACKEND_URL}/admin-api/analytics/institutes`)
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
      className="container-fluid mt-4 institute-reports-page"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(191,219,254,0.62), transparent 28%), radial-gradient(circle at right center, rgba(224,242,254,0.66), transparent 30%), linear-gradient(180deg, #F5FAFF, #EEF6FF)",
        padding: "24px",
      }}
    >
      <style>
        {`
          .institute-reports-page .health-card,
          .institute-reports-page .modal-content {
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.76);
            border: 1px solid rgba(255, 255, 255, 0.85);
            box-shadow: 0 24px 44px rgba(148, 184, 255, 0.16);
            backdrop-filter: blur(18px);
          }

          .institute-reports-page .form-control {
            min-height: 46px;
            border-radius: 14px;
            border: 1px solid rgba(191, 219, 254, 0.72);
            background: rgba(248, 250, 252, 0.96);
            box-shadow: 0 10px 22px rgba(148, 163, 184, 0.10);
          }

          .institute-reports-page .form-control:focus {
            border-color: #60A5FA;
            box-shadow: 0 0 0 0.18rem rgba(96, 165, 250, 0.14);
          }

          .institute-reports-page .table {
            --bs-table-bg: transparent;
          }

          .institute-reports-page .table thead th {
            background: #eff6ff;
            color: #1e3a8a;
            border-color: rgba(191, 219, 254, 0.78);
            white-space: nowrap;
          }

          .institute-reports-page .table tbody tr:hover {
            background: rgba(239, 246, 255, 0.72);
          }

          .institute-reports-page .page-link {
            border-radius: 12px;
            margin: 0 4px;
            border-color: rgba(191, 219, 254, 0.8);
            color: #2563eb;
            box-shadow: 0 10px 20px rgba(191, 219, 254, 0.12);
          }

          .institute-reports-page .page-item.active .page-link {
            background: linear-gradient(135deg, #2563EB, #38BDF8);
            border-color: transparent;
          }
        `}
      </style>

      <div className="text-center mb-4">
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 14px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(255,255,255,0.85)",
            color: "#2563EB",
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            marginBottom: 14,
            boxShadow: "0 12px 26px rgba(147,197,253,0.18)",
          }}
        >
          Institute Monitoring
        </div>
        <h4 className="mb-2" style={{ color: "#0F172A", fontWeight: 600, letterSpacing: "-0.03em" }}>Institute Reports (Admin)</h4>
      </div>

      {/* ===============================
          FILTERS
      ================================*/}
      <div className="card mb-3 health-card border-0">
        <div className="card-body row g-2">
          <div className="col-md-3">
            <input
              className="form-control"
              placeholder="Institute Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="col-md-3">
            <input
              className="form-control"
              placeholder="District"
              value={district}
              onChange={e => setDistrict(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ===============================
          TABLE
      ================================*/}
      <div className="table-responsive health-card p-2">
        <table className="table table-bordered table-hover align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Institute</th>
              <th>Email</th>
              <th>District</th>
              <th>Total Medicine Types</th>
              <th>Total Quantity</th>
              <th>Total Visits</th>
              <th>Low Stock</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center">
                  No records found
                </td>
              </tr>
            )}

            {paginated.map((r, i) => (
              <tr key={i}>
                <td>{r.Institute_ID}</td>
                <td>{r.Institute_Name}</td>

                <td>
                  <button
                    className="btn btn-link p-0"
                    onClick={() => setMailInstitute(r)}
                    style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}
                  >
                    {r.Email_ID}
                  </button>
                </td>

                <td>{r.Address?.District || "—"}</td>
                <td>{r.Total_Medicine_Types}</td>
                <td>{r.Total_Quantity}</td>
                <td>{r.Total_Visits}</td>

                <td className={r.LowStock_Count > 0 ? "text-danger fw-bold" : ""}>
                  {r.LowStock_Count}
                </td>

                <td>
                  <button
                    className="btn btn-sm admin-view-btn"
                    onClick={() => setSelectedInstitute(r)}
                  >
                    View Medicines
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===============================
          PAGINATION
      ================================*/}
      <ul className="pagination justify-content-center mt-3">
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

      {/* ===============================
          MEDICINES MODAL
      ================================*/}
      {selectedInstitute && (
        <div className="modal show fade d-block admin-modal-backdrop">
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content admin-modal-content">
              <div className="modal-header">
                <h5>{selectedInstitute.Institute_Name} – Medicines Inventory</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedInstitute(null)}
                />
              </div>

              <div className="modal-body">
                <h6 className="text-primary">Combined Medicines</h6>
                <h6 className="text-success">Normal Stock</h6>
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInstitute.medicines
                      ?.filter(m => !m.isLowStock)
                      .map((m, i) => (
                        <tr key={i}>
                          <td>{m.Medicine_Name}</td>
                          <td>{m.Total_Qty}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                <h6 className="text-danger mt-4">Low Stock</h6>
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInstitute.medicines
                      ?.filter(m => m.isLowStock)
                      .map((m, i) => (
                        <tr key={i} className="table-danger">
                          <td>{m.Medicine_Name}</td>
                          <td>{m.Total_Qty}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>


              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===============================
          COMPOSE MAIL MODAL
      ================================*/}
      {mailInstitute && (
        <div className="modal show fade d-block admin-modal-backdrop">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content admin-modal-content">
              <div className="modal-header">
                <h5>Compose Mail – {mailInstitute.Institute_Name}</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setMailInstitute(null);
                    setMailSubject("");
                    setMailBody("");
                  }}
                />
              </div>

              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label">From (Admin)</label>
                  <input className="form-control" value={adminEmail || ""} disabled />
                </div>

                <div className="mb-2">
                  <label className="form-label">To</label>
                  <input className="form-control" value={mailInstitute.Email_ID} disabled />
                </div>

                <div className="mb-2">
                  <label className="form-label">Subject</label>
                  <input
                    className="form-control"
                    value={mailSubject}
                    onChange={e => setMailSubject(e.target.value)}
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-control"
                    rows={6}
                    value={mailBody}
                    onChange={e => setMailBody(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn"
                  onClick={() => setMailInstitute(null)}
                  style={{
                    borderRadius: "14px",
                    padding: "10px 16px",
                    background: "rgba(255,255,255,0.84)",
                    border: "1px solid rgba(191,219,254,0.8)",
                    color: "#2563EB",
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>

                <button
                  className="btn"
                  disabled={sending || !mailSubject || !mailBody || !adminEmail}
                  onClick={async () => {
                    try {
                      setSending(true);
                      await axios.post(
                        `${BACKEND_URL}/admin-api/send-mail`,
                        {
                          from: adminEmail,
                          to: mailInstitute.Email_ID,
                          subject: mailSubject,
                          message: mailBody
                        }
                      );
                      alert("Mail sent successfully");
                      setMailInstitute(null);
                      setMailSubject("");
                      setMailBody("");
                    } catch {
                      alert("Failed to send mail");
                    } finally {
                      setSending(false);
                    }
                  }}
                  style={{
                    borderRadius: "14px",
                    padding: "10px 16px",
                    background: "linear-gradient(135deg, #2563EB, #38BDF8)",
                    border: "none",
                    color: "#fff",
                    fontWeight: 600,
                    boxShadow: "0 14px 28px rgba(96,165,250,0.24)"
                  }}
                >
                  {sending ? "Sending..." : "Send Mail"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
