import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const employeeId = localStorage.getItem("employeeId");
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

  const [employee, setEmployee] = useState(null);
  const [family, setFamily] = useState([]);

  useEffect(() => {
    if (!employeeId) return;

    axios
      .get(`http://localhost:${BACKEND_PORT}/employee-api/profile/${employeeId}`)
      .then((res) => setEmployee(res.data));

    axios
      .get(`http://localhost:${BACKEND_PORT}/family-api/family/${employeeId}`)
      .then((res) => setFamily(res.data || []));
  }, [employeeId, BACKEND_PORT]);

  if (!employee)
    return <div className="text-center mt-5">Loading profile...</div>;

  return (
    <div className="container mt-4">
      <button className="btn btn-outline-dark mb-3" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="card shadow p-4">
        <div className="row align-items-center">
          <div className="col-md-3 text-center">
            <img
                src={
                    employee.Profile_Pic
                    ? `http://localhost:${BACKEND_PORT}${employee.Profile_Pic}`
                    : employee.Photo
                    ? `http://localhost:${BACKEND_PORT}${employee.Photo}`
                    : "/default-avatar.png"
                }
                alt="Profile"
                className="rounded-circle mb-3"
                style={{ width: 150, height: 150, objectFit: "cover" }}
                />
          </div>

          <div className="col-md-9">
            <h4 className="mb-2">{employee.Name}</h4>

            <div className="row">
              <div className="col-md-6">
                <p><strong>ABS No:</strong> {employee.ABS_NO}</p>
                <p><strong>Email:</strong> {employee.Email}</p>
                <p><strong>Designation:</strong> {employee.Designation}</p>
                <p><strong>DOB:</strong> {employee.DOB ? new Date(employee.DOB).toLocaleDateString() : "-"}</p>
              </div>

              <div className="col-md-6">
                <p><strong>Blood Group:</strong> {employee.Blood_Group}</p>
                <p><strong>Height:</strong> {employee.Height} cm</p>
                <p><strong>Weight:</strong> {employee.Weight} kg</p>
                <p>
                  <strong>Address:</strong>{" "}
                  {employee.Address?.District}, {employee.Address?.State}
                </p>
              </div>
            </div>
          </div>
        </div>

        <hr />

        <h5 className="mt-3 mb-3">Family Members</h5>

        {family.length === 0 ? (
          <p className="text-muted">No family members registered.</p>
        ) : (
          <div className="row">
            {family.map((f) => (
              <div className="col-md-4 mb-3" key={f._id}>
                <div
                  className="card p-3 h-100 shadow-sm"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/employee/family/${f._id}`)}
                >
                  <h6 className="mb-1">{f.Name}</h6>
                  <p className="mb-1 text-muted">{f.Relationship}</p>
                  <p className="mb-1">Blood: {f.Blood_Group}</p>
                  <p className="mb-0">
                    Height: {f.Height} cm | Weight: {f.Weight} kg
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeProfile;
