import React, { useState } from "react";

const MedicineRequestForm = () => {
  const [formData, setFormData] = useState({
    instituteId: "",
    medicineCode: "",
    quantity: "",
  });
  const [showModal, setShowModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100"
      style={{
        backgroundColor: "#f5f6f7",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Form Card */}
      <div
        className="bg-white rounded-4 shadow-sm p-5"
        style={{
          width: "100%",
          maxWidth: "480px",
          border: "1px solid #e5e5e5",
          boxShadow:
            "0 8px 25px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)",
        }}
      >
        <h2
          className="fw-bold text-center mb-4"
          style={{ fontSize: "2rem", color: "#111", letterSpacing: "0.3px" }}
        >
          Medicine Request
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Institute ID */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold">
              Institute ID
            </label>
            <input
              type="text"
              name="instituteId"
              value={formData.instituteId}
              onChange={handleChange}
              required
              className="form-control border-0 shadow-sm"
              style={{
                backgroundColor: "#f8f8f8",
                borderRadius: "10px",
                height: "42px",
              }}
            />
          </div>

          {/* Medicine Code */}
          <div className="mb-3">
            <label className="form-label text-muted small fw-semibold">
              Medicine Code
            </label>
            <input
              type="text"
              name="medicineCode"
              value={formData.medicineCode}
              onChange={handleChange}
              required
              className="form-control border-0 shadow-sm"
              style={{
                backgroundColor: "#f8f8f8",
                borderRadius: "10px",
                height: "42px",
              }}
            />
          </div>

          {/* Quantity */}
          <div className="mb-4">
            <label className="form-label text-muted small fw-semibold">
              Quantity
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              className="form-control border-0 shadow-sm"
              style={{
                backgroundColor: "#f8f8f8",
                borderRadius: "10px",
                height: "42px",
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn w-100 fw-semibold"
            style={{
              background: "linear-gradient(180deg, #1c1c1c, #000)",
              color: "#fff",
              borderRadius: "10px",
              height: "42px",
              fontSize: "0.95rem",
              letterSpacing: "0.3px",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) =>
              (e.target.style.background =
                "linear-gradient(180deg, #000, #1c1c1c)")
            }
            onMouseOut={(e) =>
              (e.target.style.background =
                "linear-gradient(180deg, #1c1c1c, #000)")
            }
          >
            Submit Request
          </button>
        </form>
      </div>

      {/* Success Modal */}
      {showModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 9999 }}
        >
          <div
            className="bg-white rounded-4 shadow-lg text-center p-5"
            style={{
              width: "100%",
              maxWidth: "400px",
              border: "1px solid #e5e5e5",
            }}
          >
            <h3
              className="fw-bold text-dark mb-3"
              style={{ fontSize: "1.5rem" }}
            >
              ✅ Request Sent
            </h3>
            <p className="text-muted">
              Your request has been sent and is waiting for approval.
            </p>
            <button
              onClick={closeModal}
              className="btn fw-semibold mt-4"
              style={{
                background: "linear-gradient(180deg, #1c1c1c, #000)",
                color: "#fff",
                borderRadius: "10px",
                width: "120px",
              }}
              onMouseOver={(e) =>
                (e.target.style.background =
                  "linear-gradient(180deg, #000, #1c1c1c)")
              }
              onMouseOut={(e) =>
                (e.target.style.background =
                  "linear-gradient(180deg, #1c1c1c, #000)")
              }
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineRequestForm;
