import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import PatientSelector from "../institutes/PatientSelector";
import "./PharmacyPrescriptionForm.css";

const PharmacyPrescriptionForm = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [visitId, setVisitId] = useState(null); 
  const [medicineSearch, setMedicineSearch] = useState("");
  const [activeMedicineIndex, setActiveMedicineIndex] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [instituteName, setInstituteName] = useState("");
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [diseases, setDiseases] = useState([]);
  const [medicineErrors, setMedicineErrors] = useState({});
  const [doctorPrescription, setDoctorPrescription] = useState([]);
  const [lastTwoVisits, setLastTwoVisits] = useState([]);
  const [showDoctorPrescription, setShowDoctorPrescription] = useState(true);
  const [filteredDoctorPrescription, setFilteredDoctorPrescription] = useState([]);

  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Medicines: [{ medicineId: "", medicineName: "", expiryDate: "", quantity: 0 }],
    Notes: ""
  });

  /* ================= FILTER DOCTOR PRESCRIPTIONS ================= */
  useEffect(() => {
    if (doctorPrescription.length > 0) {
      const filtered = doctorPrescription.filter(p => {
        const isFamily = p.data?.IsFamilyMember === true;
        const familyId = p.data?.FamilyMember_ID || null;

        if (!formData.IsFamilyMember) {
          return isFamily === false;
        }

        return (
          isFamily === true &&
          String(familyId) === String(formData.FamilyMember_ID)
        );
      });
      setFilteredDoctorPrescription(filtered);
    } else {
      setFilteredDoctorPrescription([]);
    }
  }, [doctorPrescription, formData.IsFamilyMember, formData.FamilyMember_ID]);

  const fetchDoctorActions = async (employeeId, visitId) => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT}/api/medical-actions/visit/${visitId}`
      );
      const actions = res.data || [];
      
      const doctorPrescriptions = actions.filter(a => a.action_type === "DOCTOR_PRESCRIPTION");
      setDoctorPrescription(doctorPrescriptions);
    } catch (error) {
      console.error("Error fetching doctor actions:", error);
      setDoctorPrescription([]);
    }
  };

  const fetchLastTwoPrescriptions = async (employeeId) => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT}/prescription-api/employee/${employeeId}`
      );
      const sorted = [...res.data].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setLastTwoVisits(sorted.slice(0, 2));
    } catch (err) {
      console.error("Error fetching previous prescriptions:", err);
      setLastTwoVisits([]);
    }
  };

  const formatDateDMY = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    const instituteId = localStorage.getItem("instituteId");
    if (!instituteId) return;

    setFormData((f) => ({ ...f, Institute_ID: instituteId }));
    fetchInstitute(instituteId);
    fetchInventory(instituteId);
  }, []);

  /* ================= API CALLS ================= */
  const fetchInstitute = async (id) => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT}/institute-api/institution/${id}`
      );
      setInstituteName(res.data?.Institute_Name || "");
    } catch (error) {
      console.error("Error fetching institute:", error);
    }
  };

  const fetchInventory = async (id) => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT}/institute-api/inventory/${id}`
      );
      setInventory(res.data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      setInventory([]);
    }
  };

  const fetchDiseases = async (employeeId) => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT}/disease-api/employee/${employeeId}`
      );
      setDiseases(res.data || []);
    } catch {
      setDiseases([]);
    }
  };

  /* ================= MEDICINE SEARCH ================= */
  useEffect(() => {
    if (!medicineSearch.trim()) {
      setFilteredMedicines([]);
      return;
    }

    const results = inventory
      .filter((m) =>
        m.Medicine_Name?.toLowerCase().includes(medicineSearch.toLowerCase())
      )
      .sort((a, b) => {
        // Sub-store medicines first
        if (a.Source?.subStore > 0 && b.Source?.subStore === 0) return -1;
        if (a.Source?.subStore === 0 && b.Source?.subStore > 0) return 1;
        return 0;
      });

    setFilteredMedicines(results);
  }, [medicineSearch, inventory]);

  /* ================= EMPLOYEE PROFILE ================= */
  useEffect(() => {
    if (!formData.Employee_ID) return;

    axios
      .get(
        `http://localhost:${BACKEND_PORT}/employee-api/profile/${formData.Employee_ID}`
      )
      .then((res) => setEmployeeProfile(res.data))
      .catch(() => setEmployeeProfile(null));
  }, [formData.Employee_ID]);

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
      .then((res) => setFamilyMembers(res.data || []))
      .catch(() => setFamilyMembers([]));
  }, [formData.Employee_ID]);

  /* ================= DISEASE FILTER ================= */
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const relevantDiseases = diseases.filter((d) => {
    if (formData.IsFamilyMember) {
      return String(d.FamilyMember_ID?._id) === String(formData.FamilyMember_ID);
    }
    return !d.IsFamilyMember;
  });

  const communicableRecent = relevantDiseases.filter(
    (d) =>
      d.Category === "Communicable" &&
      new Date(d.createdAt) >= twoMonthsAgo
  );

  /* ================= MEDICINE VALIDATION ================= */
  const validateMedicineQuantity = async (index, medicineName, quantity) => {
    try {
      await axios.post(
        `http://localhost:${BACKEND_PORT}/medicine-limit-api/validate-medicine-quantity`,
        {
          medicine_name: medicineName.trim(),
          quantity: Number(quantity)
        }
      );

      setMedicineErrors((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    } catch (err) {
      const max = err?.response?.data?.max_quantity;
      setMedicineErrors((prev) => ({
        ...prev,
        [index]: `Maximum allowed quantity is ${max}`
      }));
    }
  };

  /* ================= MEDICINE HANDLERS ================= */
  const handleMedicineChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.Medicines];

      if (field === "medicineId") {
        const selected = inventory.find(
          (m) => m.Medicine_Code === value
        );

        if (!selected) return prev;

        if (selected.Source?.subStore === 0) {
          alert(
            "❌ This medicine is not available in sub-store. Please collect it from the main store."
          );
          return prev;
        }

        updated[index] = {
          medicineId: selected.Medicine_Code,
          medicineName: selected.Medicine_Name,
          expiryDate: selected.Expiry_Date,
          quantity: 0
        };

        setMedicineErrors((prevErr) => {
          const e = { ...prevErr };
          delete e[index];
          return e;
        });
      }

      if (field === "quantity") {
        updated[index].quantity = value;
        const selectedMedicine = inventory.find(
          (m) => m.Medicine_Code === updated[index].medicineId
        );

        if (selectedMedicine) {
          const availableQty = selectedMedicine.Quantity || 0;
          const threshold = selectedMedicine.Threshold_Qty || 0;
          const requestedQty = Number(value);

          if (requestedQty > availableQty) {
            setMedicineErrors((prev) => ({
              ...prev,
              [index]: `❌ Only ${availableQty} units available in stock`
            }));
            return { ...prev, Medicines: updated };
          }

          if (availableQty - requestedQty < threshold) {
            setMedicineErrors((prev) => {
              if (prev[index]?.startsWith("❌")) return prev;
              return {
                ...prev,
                [index]: `⚠️ Warning: Stock will fall below threshold (${threshold}). Remaining: ${availableQty - requestedQty}`
              };
            });
          } else {
            setMedicineErrors((prev) => {
              const copy = { ...prev };
              delete copy[index];
              return copy;
            });
          }
        }

        if (updated[index].medicineName && value > 0) {
          validateMedicineQuantity(
            index,
            updated[index].medicineName,
            value
          );
        }
      }

      return { ...prev, Medicines: updated };
    });
  };

  /* ================= ADD DOCTOR PRESCRIBED MEDICINE TO FORM ================= */
/* ================= ADD DOCTOR PRESCRIBED MEDICINE TO FORM (FIXED FOR SPACES) ================= */
const addDoctorPrescribedMedicine = (medicine) => {
  console.log("Doctor medicine to add:", medicine);
  
  // Normalize the medicine name - trim and clean
  const doctorMedicineName = medicine.Medicine_Name?.trim();
  
  if (!doctorMedicineName) {
    alert("Doctor prescription has no medicine name");
    return;
  }

  console.log("Looking for medicine (trimmed):", `"${doctorMedicineName}"`);

  // Find match with trimmed comparison
  const inventoryItem = inventory.find(
    (item) => {
      const itemName = item.Medicine_Name?.trim();
      return itemName?.toLowerCase() === doctorMedicineName.toLowerCase();
    }
  );

  if (inventoryItem) {
    console.log("Match found:", inventoryItem.Medicine_Name);
    addMedicineToForm(inventoryItem, medicine.Quantity);
    return;
  }

  // Try code matching (also trimmed)
  const codeMatch = inventory.find(
    (item) => {
      const itemCode = item.Medicine_Code?.trim();
      return itemCode?.toLowerCase() === doctorMedicineName.toLowerCase();
    }
  );

  if (codeMatch) {
    console.log("Code match found:", codeMatch.Medicine_Code);
    addMedicineToForm(codeMatch, medicine.Quantity);
    return;
  }

  // Show error with available medicines (trimmed for display)
  const availableMedicines = inventory
    .map(item => {
      const name = item.Medicine_Name?.trim();
      const code = item.Medicine_Code?.trim();
      return `• ${name} (${code})`;
    })
    .join('\n');
    
  alert(`❌ Medicine "${doctorMedicineName}" not found in inventory.\n\nAvailable medicines:\n${availableMedicines}`);
};

// Helper function with trimmed logging
const addMedicineToForm = (inventoryItem, quantity) => {
  const itemName = inventoryItem.Medicine_Name?.trim();
  const itemCode = inventoryItem.Medicine_Code?.trim();
  
  if (inventoryItem.Source?.subStore === 0) {
    alert(
      `❌ "${itemName}" is not available in sub-store. Please collect from main store.`
    );
    return;
  }

  // Check if already in prescription (using trimmed code)
  const isAlreadyAdded = formData.Medicines.some(
    med => med.medicineId === itemCode
  );
  
  if (isAlreadyAdded) {
    const confirmAddMore = window.confirm(
      `"${itemName}" is already in the prescription. Do you want to add more?`
    );
    
    if (!confirmAddMore) return;
  }

  // Add to form with trimmed values
  setFormData((prev) => ({
    ...prev,
    Medicines: [
      ...prev.Medicines,
      {
        medicineId: itemCode,
        medicineName: itemName,
        expiryDate: inventoryItem.Expiry_Date,
        quantity: quantity || 1
      }
    ]
  }));
  
  console.log("Medicine added to form (trimmed):", itemName);
};

  const addMedicine = () =>
    setFormData((prev) => ({
      ...prev,
      Medicines: [
        ...prev.Medicines,
        { medicineId: "", medicineName: "", quantity: 0 }
      ]
    }));

  const removeMedicine = (index) =>
    setFormData((prev) => ({
      ...prev,
      Medicines: prev.Medicines.filter((_, i) => i !== index)
    }));

  /* ================= SUBMIT ================= */
const handleSubmit = async (e) => {
  e.preventDefault();

  // Build payload with PROPER Medicine_ID
  const payload = {
    Institute_ID: formData.Institute_ID,
    Employee_ID: formData.Employee_ID,
    IsFamilyMember: formData.IsFamilyMember,
    FamilyMember_ID: formData.IsFamilyMember ? formData.FamilyMember_ID : null,
    Medicines: formData.Medicines.map(m => {
      // Find medicine in inventory - IMPORTANT: Get the _id!
      const invItem = inventory.find(item => 
        item.Medicine_Code === m.medicineId
      );
      
      console.log(`Medicine ${m.medicineId}:`, {
        found: !!invItem,
        inventoryItem: invItem  // Log full object
      });
      
      // Send Medicine_ID as string (ObjectId from inventory)
      return {
        Medicine_ID: invItem?._id || null,  // THIS MUST BE THE _id FROM DATABASE
        Medicine_Code: m.medicineId,
        Medicine_Name: m.medicineName,
        Quantity: Number(m.quantity),
        source: "PHARMACY"
      };
    }),
    Notes: formData.Notes,
    visit_id: visitId
  };

  console.log("Final payload with IDs:", payload);

  try {
    const response = await axios.post(
      `http://localhost:${BACKEND_PORT}/prescription-api/add`,
      payload
    );
    
    alert("✅ Prescription saved successfully!");
    
    // Reset form
    setFormData({
      Institute_ID: formData.Institute_ID,
      Employee_ID: "",
      IsFamilyMember: false,
      FamilyMember_ID: "",
      Medicines: [{ medicineId: "", medicineName: "", expiryDate: "", quantity: 0 }],
      Notes: ""
    });
    setSelectedEmployee(null);
    setEmployeeProfile(null);
    setVisitId(null);
    setDoctorPrescription([]);
    setLastTwoVisits([]);
    setFilteredDoctorPrescription([]);
    
  } catch (error) {
    console.error("❌ Error details:", error.response?.data);
    alert("❌ Failed to save: " + (error.response?.data?.message || error.message));
  }
};

  /* ================= UI ================= */
  return (
    <div className="container-fluid mt-4">
      <div className="row justify-content-center">
        {/* FORM - MAIN CONTENT */}
        <div className="col-lg-8">
          <div className="card shadow border-0 pharmacy-card">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Pharmacy Prescription</h5>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Institute Info */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Institute</label>
                  <input className="form-control" value={instituteName} readOnly />
                </div>

                {/* Patient Selector */}
                <PatientSelector
                  onSelect={({ employee, visit_id }) => {
                    setSelectedEmployee(employee);
                    setVisitId(visit_id);

                    setFormData(prev => ({
                      ...prev,
                      Employee_ID: employee._id,
                      IsFamilyMember: false,
                      FamilyMember_ID: ""
                    }));

                    fetchDiseases(employee._id);
                    if (visit_id) {
                      fetchDoctorActions(employee._id, visit_id);
                    }
                    fetchLastTwoPrescriptions(employee._id);
                  }}
                />

                {/* Family Member Selection */}
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

                {formData.IsFamilyMember && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Select Family Member
                    </label>
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

                {/* Disease History Warning */}
                {communicableRecent.length > 0 && (
                  <div className="alert alert-warning">
                    <strong>⚠️ Disease History (Reference Only)</strong>
                    <ul className="mb-0 mt-2">
                      {communicableRecent.map((d, i) => (
                        <li key={i}>{d.Disease_Name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ================= DOCTOR PRESCRIPTION SECTION ================= */}
                {filteredDoctorPrescription.length > 0 && (
                  <div className="card mb-4 border-primary">
                    <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">👨‍⚕️ Doctor Prescribed Medicines</h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() => setShowDoctorPrescription(!showDoctorPrescription)}
                      >
                        {showDoctorPrescription ? "Hide" : "Show"}
                      </button>
                    </div>
                    
                    {showDoctorPrescription && (
                      <div className="card-body">
                        {filteredDoctorPrescription.map((prescription, pIdx) => (
                          <div key={pIdx} className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <small className="text-muted">
                                Prescribed on: {formatDateDMY(prescription.createdAt)}
                              </small>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => {
                                  // Add all doctor prescribed medicines to form
                                  prescription.data.medicines.forEach(med => {
                                    addDoctorPrescribedMedicine(med);
                                  });
                                }}
                              >
                                Add All to Pharmacy Prescription
                              </button>
                            </div>
                            
                            <table className="table table-sm table-bordered">
                              <thead>
                                <tr>
                                  <th>Medicine</th>
                                  <th>Doctor Prescribed Qty</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {prescription.data.medicines.map((medicine, mIdx) => (
                                  <tr key={mIdx}>
                                    <td>{medicine.Medicine_Name}</td>
                                    <td>{medicine.Quantity}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-success"
                                        onClick={() => addDoctorPrescribedMedicine(medicine)}
                                      >
                                        Add to Prescription
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            
                            {prescription.data.notes && (
                              <div className="alert alert-info mt-2 mb-0 p-2">
                                <small><strong>Doctor Notes:</strong> {prescription.data.notes}</small>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ================= PHARMACY PRESCRIPTION SECTION ================= */}
                <h6 className="fw-bold mt-4 mb-3">
                  📋 Pharmacy Prescription
                  <small className="text-muted ms-2">(Dispensing Medicines)</small>
                </h6>

                {formData.Medicines.map((med, i) => (
                  <div key={i} className="mb-3 medicine-row">
                    <div className="d-flex gap-2 align-items-start">
                      <div className="d-flex flex-column w-100">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Type medicine name..."
                          // When displaying medicine in the input field:
value={
  activeMedicineIndex === i
    ? medicineSearch
    : med.medicineName
      ? `${med.medicineName.trim()} (Exp: ${formatDateDMY(med.expiryDate)})`
      : ""
}
                          onFocus={() => setActiveMedicineIndex(i)}
                          onChange={(e) => setMedicineSearch(e.target.value)}
                        />

// In your medicine dropdown display:
{filteredMedicines.map((m) => {
  const displayName = m.Medicine_Name?.trim();
  const displayCode = m.Medicine_Code?.trim();
  
  return (
    <button
      type="button"
      key={m.Medicine_Code}
      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
        m.Source?.subStore === 0 ? "disabled text-muted" : ""
      }`}
      onClick={() => {
        if (m.Source?.subStore === 0) return;
        handleMedicineChange(i, "medicineId", displayCode);
        setMedicineSearch("");
        setFilteredMedicines([]);
        setActiveMedicineIndex(null);
      }}
    >
      <div>
        <strong>{displayName}</strong>
        <div className="small text-muted">
          Exp: {formatDateDMY(m.Expiry_Date)}
        </div>
      </div>

      {m.Source?.subStore > 0 ? (
        <span className="badge bg-success">
          Available: {m.Source.subStore}
        </span>
      ) : (
        <span className="badge bg-warning text-dark">
          Not in sub-store
        </span>
      )}
    </button>
  );
})}
                      </div>

                      <input
                        type="number"
                        className="form-control"
                        value={med.quantity}
                        onChange={(e) =>
                          handleMedicineChange(i, "quantity", e.target.value)
                        }
                        placeholder="Qty"
                        required
                        min="1"
                      />

                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => removeMedicine(i)}
                      >
                        ✕
                      </button>
                    </div>
                    {medicineErrors[i] && (
                      <div
                        className={`fw-bold mt-1 ${
                          medicineErrors[i].startsWith("⚠️")
                            ? "text-warning"
                            : "text-danger"
                        }`}
                      >
                        {medicineErrors[i]}
                      </div>
                    )}
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
                <div className="mt-4">
                  <label className="form-label fw-semibold">Pharmacy Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.Notes}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, Notes: e.target.value }))
                    }
                    placeholder="Any additional notes from pharmacy..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-dark w-100 mt-4"
                  disabled={Object.values(medicineErrors).some(
                    (msg) => msg.startsWith("❌")
                  )}
                >
                  Submit Pharmacy Prescription
                </button>
              </form>
            </div>
          </div>

          {/* Previous Prescriptions */}
          {lastTwoVisits.length > 0 && (
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-header bg-light fw-semibold">
                📜 Previous 2 Pharmacy Prescriptions
              </div>
              <div className="card-body">
                {lastTwoVisits.map((p, idx) => (
                  <div key={idx} className="mb-3 pb-2 border-bottom">
                    <div className="fw-semibold mb-1">
                      Date: {formatDateDMY(p.createdAt)}
                    </div>
                    {p.FamilyMember && (
                      <div className="text-muted mb-1">
                        Family Member: {p.FamilyMember.Name} ({p.FamilyMember.Relationship})
                      </div>
                    )}
                    <ul className="mb-1 ps-3">
                      {p.Medicines.map((m, i) => (
                        <li key={i}>
                          {m.Medicine_Name || m.Medicine_ID?.Medicine_Name}
                          {" — "}
                          Qty: {m.Quantity}
                        </li>
                      ))}
                    </ul>
                    {p.Notes && (
                      <div className="fst-italic text-muted">
                        Notes: {p.Notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* EMPLOYEE PROFILE SIDEBAR */}
        {employeeProfile && (
          <div className="col-lg-3 d-none d-lg-block">
            <div className="card shadow-sm border-0 text-center p-4 employee-card sticky-top" style={{ top: "90px" }}>
              <img
  src={`http://localhost:${BACKEND_PORT}${employeeProfile.Photo}`}
  alt="Employee"
  className="rounded-circle mx-auto mb-3"
  style={{
    width: "120px",
    height: "120px",
    objectFit: "cover",
    border: "2px solid #ddd"
  }}
  onError={(e) => {
    // Use a data URI or local fallback
    e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iNTgiIHN0cm9rZT0iI2RkZCIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iNjAiIHk9IjY1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Vc2VyPC90ZXh0Pjwvc3ZnPg==";
  }}
/>
              <h6 className="fw-bold mb-1">{employeeProfile.Name}</h6>
              <div className="text-muted">
                ABS No: {employeeProfile.ABS_NO}
              </div>
              <div className="mt-2">
                <small className="text-muted">
                  {employeeProfile.Designation || "Employee"}
                </small>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyPrescriptionForm;