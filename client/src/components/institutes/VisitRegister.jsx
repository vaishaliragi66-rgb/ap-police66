import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const VisitRegister = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ---------------- Fetch Employees ---------------- */
  useEffect(() => {
    axios
      .get(`http://localhost:${BACKEND_PORT}/employee-api/all`)
      .then(res => setEmployees(res.data.employees || []))
      .catch(err => console.error(err));
  }, []);

  /* ---------------- Search Filter ---------------- */
  useEffect(() => {
    if (!search.trim()) {
      setFiltered([]);
      return;
    }

    const q = search.toLowerCase();
    setFiltered(
      employees.filter(e =>
        String(e.ABS_NO).includes(q) ||
        e.Name?.toLowerCase().includes(q)
      )
    );
  }, [search, employees]);

  /* ---------------- Register Visit ---------------- */
  const registerVisit = async () => {
    if (!selectedEmployee) {
      alert("Select an employee");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `http://localhost:${BACKEND_PORT}/api/visits/register`,
        { employee_id: selectedEmployee._id }
      );

      alert("✅ Visit registered successfully");
      setSearch("");
      setSelectedEmployee(null);
      setFiltered([]);
    } catch (err) {
      alert(
        err?.response?.data?.error ||
        "❌ Failed to register visit"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">📝 Register Today Visit</h5>
            </div>

            <div className="card-body">
              <label className="form-label fw-semibold">
                Employee ABS No / Name
              </label>

              <input
                className="form-control"
                placeholder="Type ABS No or Name"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              {filtered.length > 0 && (
                <div className="list-group mt-1">
                  {filtered.map(emp => (
                    <button
                      key={emp._id}
                      type="button"
                      className="list-group-item list-group-item-action"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setSearch(`${emp.ABS_NO} - ${emp.Name}`);
                        setFiltered([]);
                      }}
                    >
                      {emp.ABS_NO} — {emp.Name}
                    </button>
                  ))}
                </div>
              )}

              {selectedEmployee && (
                <div className="alert alert-success mt-3">
                  Selected: <strong>{selectedEmployee.Name}</strong>
                </div>
              )}

              <button
                className="btn btn-dark w-100 mt-3"
                onClick={registerVisit}
                disabled={loading}
              >
                {loading ? "Registering..." : "Register Visit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitRegister;
