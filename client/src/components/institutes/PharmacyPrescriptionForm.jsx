import React, { useEffect, useState } from "react";
import axios from "axios";

const PharmacyPrescriptionForm = () => {
  const [employees, setEmployees] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [instituteName, setInstituteName] = useState("");

  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Medicines: [{ medicineId: "", medicineName: "", quantity: 0 }],
    Notes: "",
  });

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || "6100";

  // Load institute info and employees on mount
  useEffect(() => {
    const localInstituteId = localStorage.getItem("instituteId");
    if (localInstituteId) {
      setFormData((s) => ({ ...s, Institute_ID: localInstituteId }));
      fetchInstituteName(localInstituteId);
      fetchInventory(localInstituteId);
    } else {
      console.warn("No instituteId found in localStorage");
    }

    fetchEmployees();
  }, []);

  // Fetch institute name
  const fetchInstituteName = async (id) => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/institution/${id}`
      );
      setInstituteName(res.data?.Institute_Name || "Unknown Institute");
    } catch (err) {
      console.error("Error fetching institute name:", err);
      setInstituteName("Unknown Institute");
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT_NO}/employee-api/employees`
      );
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  // Fetch institute inventory
  const fetchInventory = async (id) => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/inventory/${id}`
      );
      setInventory(res.data || []);
      console.log("Fetched inventory:", res.data);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    }
  };

  // Filter employees based on ABS_NO
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEmployees([]);
    } else {
      const filtered = employees.filter((emp) =>
        String(emp.ABS_NO || "").toLowerCase().startsWith(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  // Fetch family members
  useEffect(() => {
    const fetchFamily = async () => {
      if (!formData.Employee_ID) return setFamilyMembers([]);
      try {
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/family-api/family/${formData.Employee_ID}`
        );
        setFamilyMembers(res.data || []);
      } catch (err) {
        console.error("Error fetching family members:", err);
      }
    };
    fetchFamily();
  }, [formData.Employee_ID]);

  // Handle employee select
  const handleEmployeeSelect = (emp) => {
    setFormData((prev) => ({ ...prev, Employee_ID: emp._id }));
    setSearchTerm(emp.ABS_NO || "");
    setFilteredEmployees([]);
  };

  // Handle medicine select or quantity change
  const handleMedicineChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.Medicines];

      if (field === "medicineId") {
        const selected = inventory.find((m) => m.medicineId === value);
        if (selected) {
          updated[index] = {
            medicineId: selected.medicineId,
            medicineName: selected.medicineName,
            quantity: 0,
          };
        }
      } else if (field === "quantity") {
        updated[index].quantity = value;
        const selected = inventory.find(
          (m) => m.medicineId === updated[index].medicineId
        );
        if (selected) {
          const newStock = selected.quantity - Number(value);
          if (newStock < 0) {
            alert(`❌ Not enough stock for ${selected.medicineName}. Available: ${selected.quantity}`);
            updated[index].quantity = 0;
          } else if (newStock <= selected.threshold) {
            alert(`⚠️ Low stock warning: Only ${newStock} left for ${selected.medicineName}`);
          }
        }
      }

      return { ...prev, Medicines: updated };
    });
  };

  // Add / Remove medicines
  const addMedicine = () =>
    setFormData((prev) => ({
      ...prev,
      Medicines: [...prev.Medicines, { medicineId: "", medicineName: "", quantity: 0 }],
    }));

  const removeMedicine = (index) =>
    setFormData((prev) => ({
      ...prev,
      Medicines: prev.Medicines.filter((_, i) => i !== index),
    }));

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.Institute_ID || !formData.Employee_ID) {
      alert("Please fill all required fields.");
      return;
    }

    const payload = {
      Institute_ID: formData.Institute_ID,
      Employee_ID: formData.Employee_ID,
      IsFamilyMember: formData.IsFamilyMember,
      FamilyMember_ID: formData.FamilyMember_ID || null,
      Medicines: formData.Medicines.map((m) => ({
        Medicine_ID: m.medicineId, // ✅ correct ObjectId
        Medicine_Name: m.medicineName,
        Quantity: Number(m.quantity),
      })),
      Notes: formData.Notes,
    };

    console.log("Submitting payload:", payload);

    try {
      const res = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/prescription-api/add`,
        payload
      );
      alert("✅ Prescription saved successfully!");

      setFormData({
        ...formData,
        Employee_ID: "",
        IsFamilyMember: false,
        FamilyMember_ID: "",
        Medicines: [{ medicineId: "", medicineName: "", quantity: 0 }],
        Notes: "",
      });
      setSearchTerm("");
      setFamilyMembers([]);
    } catch (err) {
      console.error("Error saving prescription:", err?.response?.data || err);
      alert("❌ Error saving prescription: " + (err?.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 8 }}>
      <h2 style={{ textAlign: "center" }}>Pharmacy Prescription Entry</h2>

      <form onSubmit={handleSubmit} autoComplete="off">
        <label>Institute</label>
        <input
          type="text"
          value={instituteName || "Loading..."}
          readOnly
          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", marginBottom: 10 }}
        />

        <label>Employee ABS_NO</label>
        <input
          type="text"
          placeholder="Type ABS_NO..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: "100%", padding: 8, borderRadius: 6 }}
        />

        {searchTerm && filteredEmployees.length > 0 && (
          <div style={{ border: "1px solid #ccc", maxHeight: 150, overflowY: "auto", marginTop: 6 }}>
            {filteredEmployees.map((emp) => (
              <div
                key={emp._id}
                onClick={() => handleEmployeeSelect(emp)}
                style={{ padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid #eee" }}
              >
                {emp.ABS_NO} — {emp.Name}
              </div>
            ))}
          </div>
        )}

        <label style={{ marginTop: 12 }}>
          <input
            type="checkbox"
            name="IsFamilyMember"
            checked={formData.IsFamilyMember}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, IsFamilyMember: e.target.checked }))
            }
          />{" "}
          Prescription for Family Member?
        </label>

        {formData.IsFamilyMember && (
          <>
            <label style={{ marginTop: 10 }}>Select Family Member</label>
            <select
              name="FamilyMember_ID"
              value={formData.FamilyMember_ID}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, FamilyMember_ID: e.target.value }))
              }
              style={{ width: "100%", padding: 8, borderRadius: 6 }}
            >
              <option value="">Select Family Member</option>
              {familyMembers.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.Name} ({f.Relationship})
                </option>
              ))}
            </select>
          </>
        )}

        <h4 style={{ marginTop: 20 }}>Medicines</h4>
        {formData.Medicines.map((med, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <select
              value={med.medicineId}
              onChange={(e) => handleMedicineChange(i, "medicineId", e.target.value)}
              required
              style={{ width: "70%", padding: 8, borderRadius: 6, marginRight: 8 }}
            >
              <option value="">Select Medicine</option>
              {inventory.map((m) => (
                <option key={m.medicineId} value={m.medicineId}>
                  {m.medicineName} ({m.manufacturerName}) — Available: {m.quantity}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={med.quantity}
              placeholder="Qty"
              onChange={(e) => handleMedicineChange(i, "quantity", e.target.value)}
              required
              style={{ width: "20%", padding: 8, borderRadius: 6 }}
            />
            <button
              type="button"
              onClick={() => removeMedicine(i)}
              style={{ marginLeft: 5, background: "red", color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px" }}
            >
              X
            </button>
          </div>
        ))}
        <button type="button" onClick={addMedicine} style={{ background: "#007bff", color: "#fff", border: "none", padding: 8, borderRadius: 6 }}>
          + Add Medicine
        </button>

        <label style={{ display: "block", marginTop: 16 }}>Notes</label>
        <textarea
          name="Notes"
          value={formData.Notes}
          onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
          rows={3}
          style={{ width: "100%", padding: 8, borderRadius: 6 }}
        />

        <button type="submit" style={{ marginTop: 20, width: "100%", padding: 10, background: "black", color: "white", border: "none", borderRadius: 8 }}>
          Submit Prescription
        </button>
      </form>
    </div>
  );
};

export default PharmacyPrescriptionForm;