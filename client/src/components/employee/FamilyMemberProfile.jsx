import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const FamilyMemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

  const [member, setMember] = useState(null);

  useEffect(() => {
    axios
      .get(`http://localhost:${BACKEND_PORT}/family-api/family-report/${id}`)
      .then((res) => setMember(res.data));
  }, [id, BACKEND_PORT]);

  if (!member)
    return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container mt-4">
      <button className="btn btn-outline-dark mb-3" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="card shadow p-4">
        <h4 className="mb-3">{member.Name}</h4>

        <div className="row">
          <div className="col-md-6">
            <p><strong>Relationship:</strong> {member.Relationship}</p>
            <p><strong>Gender:</strong> {member.Gender}</p>
            <p><strong>Blood Group:</strong> {member.Blood_Group}</p>
          </div>

          <div className="col-md-6">
            <p><strong>DOB:</strong> {member.DOB ? new Date(member.DOB).toLocaleDateString() : "-"}</p>
            <p><strong>Height:</strong> {member.Height} cm</p>
            <p><strong>Weight:</strong> {member.Weight} kg</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyMemberProfile;
