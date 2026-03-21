import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AddPasswords = () => {
  const [formData, setFormData] = useState({
    doctor: "",
    pharmacist: "",
    diagnosis: "",
    xray: "",
    frontdesk: ""
  });

  const [roleStatus, setRoleStatus] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem("instituteToken");

        const res = await axios.get(
          "${BACKEND_URL}/institute-auth/get-role-status",
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        setRoleStatus(res.data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchStatus();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (role) => {
    try {
      const token = localStorage.getItem("instituteToken");

      const endpoint = roleStatus[role]
        ? "update-role"
        : "setup-role";

      await axios({
        method: roleStatus[role] ? "put" : "post",
        url: `${BACKEND_URL}/institute-auth/${endpoint}`,
        data: {
  role: role === "frontdesk" ? "front_desk" : role,
  password: formData[role]
},
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      alert(`${role} password ${roleStatus[role] ? "updated" : "added"} successfully`);
      navigate("/institutes/home");

    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: "500px" }}>
      <h3>Configure Role Passwords</h3>

      {Object.keys(formData).map((role) => (
        <div className="mb-3" key={role}>
          <label className="form-label">
            {role.charAt(0).toUpperCase() + role.slice(1)} Password
          </label>

          <input
            type="password"
            className="form-control"
            name={role}
            value={formData[role]}
            onChange={handleChange}
          />

          <button
            className="btn btn-primary w-100 mt-2"
            onClick={() => handleSubmit(role)}
          >
            {roleStatus[role] ? "Update Password" : "Add Password"}
          </button>
        </div>
      ))}
    </div>
  );
};

export default AddPasswords;
