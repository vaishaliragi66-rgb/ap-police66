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
    <div className="container-fluid mt-4">
      <h4 className="text-center mb-3">
        Institute Reports (Admin)
      </h4>

      {/* ===============================
          FILTERS
      ================================*/}
      <div className="card mb-3">
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
      <div className="table-responsive">
        <table className="table table-bordered table-hover align-middle">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Institute</th>
              <th>Email</th>
              <th>District</th>
              <th>Main Store</th>
              <th>Sub Store</th>
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

                {/* CLICKABLE EMAIL */}
                <td>
                  <button
                    className="btn btn-link p-0"
                    onClick={() => setMailInstitute(r)}
                  >
                    {r.Email_ID}
                  </button>
                </td>

                <td>{r.Address?.District || "—"}</td>
                <td>{r.MainStore_Count}</td>
                <td>{r.SubStore_Count}</td>

                <td className={r.LowStock_Count > 0 ? "text-danger fw-bold" : ""}>
                  {r.LowStock_Count}
                </td>

                <td>
                  <button
                    className="btn btn-sm btn-outline-primary"
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
     {/* ===============================
    MEDICINES MODAL
================================*/}
{selectedInstitute && (
  <div
    className="modal show fade d-block"
    style={{ background: "#00000080" }}
  >
    <div className="modal-dialog modal-xl">
      <div className="modal-content">
        <div className="modal-header">
          <h5>
            {selectedInstitute.Institute_Name} – Medicines Inventory
          </h5>
          <button
            className="btn-close"
            onClick={() => setSelectedInstitute(null)}
          />
        </div>

        <div className="modal-body">
          {/* MAIN STORE */}
          <h6 className="text-primary">Main Store Medicines</h6>
          <div className="table-responsive mb-4">
            <table className="table table-bordered table-sm">
              <thead className="table-secondary">
                <tr>
                  <th>Medicine ID</th>
                  <th>Medicine Name</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {selectedInstitute.mainStore?.length ? (
                  selectedInstitute.mainStore.map((m, i) => (
                    <tr key={i}>
                      <td>{m.Medicine_Code|| m.Medicine_Code || "—"}</td>
                      <td>{m.Medicine_Name}</td>
                      <td>{m.Type || "—"}</td>
                      <td>{m.Quantity}</td>
                      <td>{m.Expiry_Date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">
                      No medicines in Main Store
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SUB STORE */}
          <h6 className="text-success">Sub Store Medicines</h6>
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-secondary">
                <tr>
                  <th>Medicine ID</th>
                  <th>Medicine Name</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {selectedInstitute.subStore?.length ? (
                  selectedInstitute.subStore.map((m, i) => (
                    <tr key={i}>
                      <td>{m.Medicine_Code|| m.Medicine_Code || "—"}</td>
                      <td>{m.Medicine_Name}</td>
                      <td>{m.Type || "—"}</td>
                      <td>{m.Quantity}</td>
                      <td>{m.Expiry_Date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">
                      No medicines in Sub Store
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
)}


      {/* ===============================
          COMPOSE MAIL MODAL
      ================================*/}
      {mailInstitute && (
        <div className="modal show fade d-block" style={{ background: "#00000080" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5>
                  Compose Mail – {mailInstitute.Institute_Name}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setMailInstitute(null);
                    setMailSubject("");
                    setMailBody("");
                  }}
                />
              </div>

              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label">To</label>
                  <input
                    className="form-control"
                    value={mailInstitute.Email_ID}
                    disabled
                  />
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
                  className="btn btn-secondary"
                  onClick={() => setMailInstitute(null)}
                >
                  Cancel
                </button>

                <button
                  className="btn btn-primary"
                  disabled={sending || !mailSubject || !mailBody}
                  onClick={async () => {
                    try {
                      setSending(true);
                      await axios.post(
                        `http://localhost:${BACKEND_PORT}/admin-api/send-mail`,
                        {
                          to: mailInstitute.Email_ID,
                          subject: mailSubject,
                          message: mailBody
                        }
                      );
                      alert("Mail sent successfully");
                      setMailInstitute(null);
                      setMailSubject("");
                      setMailBody("");
                    } catch (err) {
                      alert("Failed to send mail");
                    } finally {
                      setSending(false);
                    }
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
