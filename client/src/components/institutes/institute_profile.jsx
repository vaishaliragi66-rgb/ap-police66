import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaUniversity } from "react-icons/fa";

const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT;

export default function InstituteProfile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch profile
  useEffect(() => {
    const stored = localStorage.getItem("institute");
    if (!stored) {
      setLoading(false);
      return;
    }

    const institute = JSON.parse(stored);
    const id = institute._id;

    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/institute-api/profile/${id}`
        );
        setProfile(res.data.profile);
        setForm({
          Institute_Name: res.data.profile.Institute_Name || "",
          Email_ID: res.data.profile.Email_ID || "",
          Contact_No: res.data.profile.Contact_No || "",
          Address: res.data.profile.Address || {},
        });
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (key, value) => {
    if (key.startsWith("address.")) {
      const addrKey = key.split(".")[1];
      setForm((prev) => ({
        ...prev,
        Address: { ...(prev.Address || {}), [addrKey]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    const stored = localStorage.getItem("institute");
    if (!stored) return alert("No institute logged in");

    const id = JSON.parse(stored)._id;
    const payload = {
      Institute_Name: form.Institute_Name,
      Email_ID: form.Email_ID,
      Contact_No: form.Contact_No,
      Address: form.Address,
    };

    try {
      const res = await axios.put(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/profile/${id}`,
        payload
      );
      setProfile(res.data.profile);
      setEditing(false);
      alert("✅ Profile updated successfully");
    } catch (err) {
      console.error("Error updating profile", err);
      alert("❌ Update failed: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading)
    return (
      <div
        className="d-flex justify-content-center align-items-center vh-100 text-muted"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        Loading...
      </div>
    );

  if (!profile)
    return (
      <div
        className="d-flex justify-content-center align-items-center vh-100 text-muted"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        No institute profile available. Please login.
      </div>
    );

  return (
    <div
      className="d-flex flex-column justify-content-start align-items-center min-vh-100"
      style={{
        fontFamily: "Inter, sans-serif",
        backgroundColor: "#fafafa",
        padding: "60px 20px 40px",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        
        <h2 className="fw-bold text-dark mb-2" style={{ fontSize: "3rem" }}>
          Institute Profile
        </h2>
        <div
          style={{
            width: "80px",
            height: "3px",
            backgroundColor: "#000",
            borderRadius: "3px",
            margin: "0 auto 15px auto",
          }}
        ></div>
        <p className="text-muted" style={{ fontSize: "0.95rem" }}>
          View and update your institute’s information
        </p>
      </div>

      {/* Profile Card */}
      <div
        className="p-4 rounded-4 shadow-sm mb-4 w-100"
        style={{
          backgroundColor: "#fff",
          border: "1px solid #eee",
          maxWidth: "700px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold text-dark mb-0 text-uppercase">
            {profile.Institute_Name}
          </h4>
          <button
            onClick={() => setEditing((s) => !s)}
            className="btn fw-semibold"
            style={{
              backgroundColor: "#000",
              color: "#fff",
              borderRadius: "8px",
              padding: "6px 14px",
              transition: "0.3s ease",
            }}
            onMouseOver={(e) => (e.target.style.opacity = "0.8")}
            onMouseOut={(e) => (e.target.style.opacity = "1")}
          >
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        <div>
          <p className="text-muted mb-1">
            <strong>Email:</strong> {profile.Email_ID}
          </p>
          <p className="text-muted mb-1">
            <strong>Contact:</strong> {profile.Contact_No || "—"}
          </p>
          <div className="mt-3">
            <h6 className="fw-semibold mb-1 text-dark">Address</h6>
            <p className="text-muted">
              {profile.Address?.Street || "—"},{" "}
              {profile.Address?.District || "—"},{" "}
              {profile.Address?.State || "—"} -{" "}
              {profile.Address?.Pincode || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <form
          onSubmit={submitEdit}
          className="p-4 rounded-4 shadow-sm w-100"
          style={{
            backgroundColor: "#fff",
            border: "1px solid #eee",
            maxWidth: "700px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
          }}
        >
          <h5 className="fw-bold text-dark mb-4">Edit Profile</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">
                Institute Name
              </label>
              <input
                value={form.Institute_Name || ""}
                onChange={(e) => handleChange("Institute_Name", e.target.value)}
                className="form-control border-0 shadow-sm"
                style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Email</label>
              <input
                value={form.Email_ID || ""}
                onChange={(e) => handleChange("Email_ID", e.target.value)}
                className="form-control border-0 shadow-sm"
                style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">
                Contact Number
              </label>
              <input
                value={form.Contact_No || ""}
                onChange={(e) => handleChange("Contact_No", e.target.value)}
                className="form-control border-0 shadow-sm"
                style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Pincode</label>
              <input
                value={form.Address?.Pincode || ""}
                onChange={(e) =>
                  handleChange("address.Pincode", e.target.value)
                }
                className="form-control border-0 shadow-sm"
                style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Street</label>
              <input
                value={form.Address?.Street || ""}
                onChange={(e) =>
                  handleChange("address.Street", e.target.value)
                }
                className="form-control border-0 shadow-sm"
                style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">District</label>
              <input
                value={form.Address?.District || ""}
                onChange={(e) =>
                  handleChange("address.District", e.target.value)
                }
                className="form-control border-0 shadow-sm"
                style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">State</label>
              <input
                value={form.Address?.State || ""}
                onChange={(e) => handleChange("address.State", e.target.value)}
                className="form-control border-0 shadow-sm"
                style={{ backgroundColor: "#f8f8f8", borderRadius: "10px" }}
              />
            </div>
          </div>

          <div className="mt-4 d-flex justify-content-center gap-3">
            <button
              type="submit"
              className="btn fw-semibold"
              style={{
                backgroundColor: "#000",
                color: "#fff",
                borderRadius: "10px",
                padding: "8px 20px",
              }}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn border fw-semibold"
              style={{
                borderRadius: "10px",
                padding: "8px 20px",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
