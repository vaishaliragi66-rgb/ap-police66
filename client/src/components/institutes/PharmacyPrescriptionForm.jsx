import React, { useEffect, useState } from "react";
import axios from "axios";

const PharmacyPrescriptionForm = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [instituteName, setInstituteName] = useState("");

  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Medicines: [{ Medicine_ID: "", Medicine_Name: "", Quantity: "" }],
    Notes: ""
  });

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    const instituteId = localStorage.getItem("instituteId");
    if (!instituteId) return;

    setFormData((f) => ({ ...f, Institute_ID: instituteId }));
    fetchInstitute(instituteId);
    fetchEmployees();
    fetchInventory(instituteId);
  }, []);

  /* ================= API CALLS ================= */
  const fetchInstitute = async (id) => {
    const res = await axios.get(
      `http://localhost:${BACKEND_PORT}/institute-api/institution/${id}`
    );
    setInstituteName(res.data?.Institute_Name || "");
  };

  const fetchEmployees = async () => {
    const res = await axios.get(
      `http://localhost:${BACKEND_PORT}/employee-api/all`
    );
    setEmployees(res.data.employees || []);
  };

  const fetchInventory = async (id) => {
    const res = await axios.get(
      `http://localhost:${BACKEND_PORT}/institute-api/inventory/${id}`
    );

    const normalized = res.data.map((item) => ({
      Medicine_ID: item.Medicine_ID._id,
      Medicine_Name: item.Medicine_ID.Medicine_Name,
      Quantity: item.Quantity,
      Threshold: item.Medicine_ID.Threshold_Qty
    }));

    setInventory(normalized);
  };

  /* ================= EMPLOYEE SEARCH ================= */
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEmployees([]);
      return;
    }

    setFilteredEmployees(
      employees.filter((e) => String(e.ABS_NO).includes(searchTerm))
    );
  }, [searchTerm, employees]);

  const selectEmployee = (emp) => {
    setFormData((f) => ({
      ...f,
      Employee_ID: emp._id,
      IsFamilyMember: false,
      FamilyMember_ID: ""
    }));
    setSearchTerm(emp.ABS_NO);
    setFilteredEmployees([]);
  };

  /* ================= FAMILY MEMBERS ================= */
  useEffect(() => {
    if (!formData.Employee_ID) {
      setFamilyMembers([]);
      return;
    }

    axios
      .get(
        `http://localhost:${BACKEND_PORT}/family-api/family/${formData.Employee_ID}`
      )
      .then((res) => setFamilyMembers(res.data || []));
  }, [formData.Employee_ID]);

  /* ================= MEDICINES ================= */
  const handleMedicineChange = (i, field, value) => {
    setFormData((prev) => {
      const meds = [...prev.Medicines];
      meds[i][field] = value;
      return { ...prev, Medicines: meds };
    });
  };

  const addMedicine = () => {
    setFormData((f) => ({
      ...f,
      Medicines: [
        ...f.Medicines,
        { Medicine_ID: "", Medicine_Name: "", Quantity: "" }
      ]
    }));
  };

  const removeMedicine = (i) => {
    setFormData((f) => ({
      ...f,
      Medicines: f.Medicines.filter((_, idx) => idx !== i)
    }));
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.Employee_ID) {
      alert("Please select an employee");
      return;
    }

    if (formData.IsFamilyMember && !formData.FamilyMember_ID) {
      alert("Please select a family member");
      return;
    }

    const payload = {
      Institute_ID: formData.Institute_ID,
      Employee_ID: formData.Employee_ID,
      IsFamilyMember: formData.IsFamilyMember,
      FamilyMember_ID: formData.IsFamilyMember
        ? formData.FamilyMember_ID
        : null,
      Medicines: formData.Medicines.map((m) => ({
        Medicine_ID: m.Medicine_ID,
        Medicine_Name: m.Medicine_Name,
        Quantity: Number(m.Quantity)
      })),
      Notes: formData.Notes
    };

    try {
      await axios.post(
        `http://localhost:${BACKEND_PORT}/prescription-api/add`,
        payload
      );

      alert("✅ Prescription saved successfully");

      setFormData({
        ...formData,
        Employee_ID: "",
        IsFamilyMember: false,
        FamilyMember_ID: "",
        Medicines: [{ Medicine_ID: "", Medicine_Name: "", Quantity: "" }],
        Notes: ""
      });
      setSearchTerm("");
      setFamilyMembers([]);
    } catch (err) {
      alert(err?.response?.data?.message || "Prescription failed");
    }
  };

  /* ================= UI ================= */
  return (
    <div className="container mt-4">
      <div className="card shadow">
        <div className="card-header bg-dark text-white">
          <h5 className="mb-0">Pharmacy Prescription</h5>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Institute */}
            <div className="mb-3">
              <label className="form-label">Institute</label>
              <input className="form-control" value={instituteName} readOnly />
            </div>

            {/* Employee */}
            <div className="mb-3 position-relative">
              <label className="form-label">Employee ABS_NO</label>
              <input
                className="form-control"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type ABS_NO"
              />

              {filteredEmployees.length > 0 && (
                <div className="list-group position-absolute w-100 z-3">
                  {filteredEmployees.map((e) => (
                    <button
                      type="button"
                      key={e._id}
                      className="list-group-item list-group-item-action"
                      onClick={() => selectEmployee(e)}
                    >
                      {e.ABS_NO} — {e.Name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Family Member Checkbox */}
            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={formData.IsFamilyMember}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    IsFamilyMember: e.target.checked,
                    FamilyMember_ID: ""
                  }))
                }
              />
              <label className="form-check-label">
                Prescription for Family Member
              </label>
            </div>

            {/* Family Member Dropdown */}
            {formData.IsFamilyMember && (
              <div className="mb-3">
                <label className="form-label">Select Family Member</label>
                <select
                  className="form-select"
                  value={formData.FamilyMember_ID}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      FamilyMember_ID: e.target.value
                    }))
                  }
                >
                  <option value="">Select Family Member</option>
                  {familyMembers.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.Name} ({f.Relationship})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Medicines */}
            <h6 className="mt-4">Medicines</h6>
            {formData.Medicines.map((m, i) => (
              <div className="row g-2 mb-2" key={i}>
                <div className="col-md-6">
                  <select
                    className="form-select"
                    value={m.Medicine_ID}
                    onChange={(e) => {
                      const med = inventory.find(
                        (x) => x.Medicine_ID === e.target.value
                      );
                      handleMedicineChange(i, "Medicine_ID", e.target.value);
                      handleMedicineChange(
                        i,
                        "Medicine_Name",
                        med?.Medicine_Name || ""
                      );
                    }}
                  >
                    <option value="">Select Medicine</option>
                    {inventory.map((med) => (
                      <option key={med.Medicine_ID} value={med.Medicine_ID}>
                        {med.Medicine_Name} (Stock: {med.Quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Qty"
                    value={m.Quantity}
                    onChange={(e) =>
                      handleMedicineChange(i, "Quantity", e.target.value)
                    }
                  />
                </div>

                <div className="col-md-3">
                  <button
                    type="button"
                    className="btn btn-danger w-100"
                    onClick={() => removeMedicine(i)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn btn-outline-primary mt-2"
              onClick={addMedicine}
            >
              + Add Medicine
            </button>

            {/* Notes */}
            <div className="mt-3">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.Notes}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, Notes: e.target.value }))
                }
              />
            </div>

            {/* Submit */}
            <button type="submit" className="btn btn-dark w-100 mt-4">
              Submit Prescription
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PharmacyPrescriptionForm;
