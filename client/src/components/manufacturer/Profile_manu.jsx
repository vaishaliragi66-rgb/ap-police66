import React, { useEffect, useState } from "react";
import { FaIndustry, FaEdit } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

const Profile_manu = () => {
  const [manufacturer, setManufacturer] = useState(null);
  const [formData, setFormData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem("manufacturer");

    if (!storedData || storedData === "undefined") {
      alert("⚠️ No manufacturer data found. Please log in again.");
      window.location.href = "/manufacturer-login";
      return;
    }

    try {
      const parsed = JSON.parse(storedData);
      const manu = parsed.manufacturer ? parsed.manufacturer : parsed;
      setManufacturer(manu);
      setFormData({
        Manufacturer_Name: manu.Manufacturer_Name || "",
        Email_ID: manu.Email_ID || "",
        Contact_No: manu.Contact_No || "",
        Street: manu.Address?.Street || "",
        District: manu.Address?.District || "",
        State: manu.Address?.State || "",
        Pincode: manu.Address?.Pincode || "",
      });
    } catch (error) {
      console.error("Error parsing manufacturer data:", error);
      localStorage.removeItem("manufacturer");
      alert("⚠️ Invalid session. Please log in again.");
      window.location.href = "/manufacturer-login";
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!manufacturer?._id) return alert("Manufacturer ID missing!");

    setIsUpdating(true);
    try {
      const response = await fetch(
        `http://localhost:6100/manufacturer-api/manufacturer_update/${manufacturer._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Manufacturer_Name: formData.Manufacturer_Name,
            Email_ID: formData.Email_ID,
            Contact_No: formData.Contact_No,
            Address: {
              Street: formData.Street,
              District: formData.District,
              State: formData.State,
              Pincode: formData.Pincode,
            },
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert("✅ Profile updated successfully!");
        setManufacturer(data);
        localStorage.setItem("manufacturer", JSON.stringify(data));
        window.location.reload();
      } else {
        alert(`❌ Update failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("⚠️ Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!manufacturer) {
    return (
      <div className="text-center text-gray-500 mt-10">
        Loading profile...
      </div>
    );
  }

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-start"
      style={{
        backgroundColor: "#f5f6f7",
        paddingTop: "70px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h2
          className="fw-bold text-dark mb-2"
          style={{ fontSize: "2.3rem", letterSpacing: "0.4px" }}
        >
          <FaIndustry className="me-2 mb-1 text-dark" />
          Manufacturer Profile
        </h2>
        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
          View or edit your registered manufacturer details
        </p>
      </div>

      {/* Profile Card */}
      <div
        className="bg-white rounded-4 shadow-sm p-5 w-100"
        style={{
          maxWidth: "700px",
          border: "1px solid #e5e5e5",
          boxShadow:
            "0 8px 25px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Manufacturer Name — Now Uppercase */}
        <div className="text-center mb-4">
          <h2
            className="fw-bold text-dark mb-1"
            style={{
              fontSize: "2rem",
              letterSpacing: "0.3px",
              textTransform: "uppercase",
            }}
          >
            {manufacturer.Manufacturer_Name}
          </h2>
          <p className="text-muted small mb-0">
            ID: <span className="font-monospace">{manufacturer._id}</span>
          </p>
        </div>

        <hr />

        <div className="row mb-3">
          <div className="col-sm-6 mb-3">
            <p className="text-muted mb-1 small">📧 Email</p>
            <p className="fw-medium text-dark">{manufacturer.Email_ID}</p>
          </div>
          <div className="col-sm-6 mb-3">
            <p className="text-muted mb-1 small">📞 Contact No</p>
            <p className="fw-medium text-dark">{manufacturer.Contact_No}</p>
          </div>
        </div>

        <div>
          <p className="text-muted mb-1 small">🏠 Address</p>
          <p className="fw-medium text-dark mb-0">
            {manufacturer.Address?.Street}
          </p>
          <p className="fw-medium text-dark mb-0">
            {manufacturer.Address?.District}, {manufacturer.Address?.State}
          </p>
          <p className="fw-medium text-dark">
            Pincode: {manufacturer.Address?.Pincode}
          </p>
        </div>

        {/* Edit Button */}
        <div className="text-end mt-4">
          <button
            className="btn btn-dark d-flex align-items-center justify-content-center gap-2"
            data-bs-toggle="modal"
            data-bs-target="#editModal"
            style={{
              backgroundColor: "#000",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "0.9rem",
            }}
          >
            <FaEdit /> Edit Profile
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <div
        className="modal fade"
        id="editModal"
        tabIndex="-1"
        aria-labelledby="editModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow rounded-3">
            <form onSubmit={handleUpdate}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title text-dark fw-semibold">
                  Edit Manufacturer Details
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                ></button>
              </div>

              <div className="modal-body pt-2">
                {[
                  { name: "Manufacturer_Name", label: "Manufacturer Name" },
                  { name: "Email_ID", label: "Email" },
                  { name: "Contact_No", label: "Contact Number" },
                  { name: "Street", label: "Street" },
                  { name: "District", label: "District" },
                  { name: "State", label: "State" },
                  { name: "Pincode", label: "Pincode" },
                ].map((field) => (
                  <div className="mb-3" key={field.name}>
                    <label className="form-label small text-muted">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleChange}
                      required
                      className="form-control"
                      style={{
                        backgroundColor: "#f9f9f9",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light"
                  data-bs-dismiss="modal"
                  style={{
                    border: "1px solid #ccc",
                    color: "#333",
                    fontWeight: "500",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn btn-dark"
                  style={{
                    backgroundColor: "#000",
                    borderRadius: "8px",
                    fontWeight: "500",
                  }}
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile_manu;
