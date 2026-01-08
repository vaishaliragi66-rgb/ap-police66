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
  // const [employees, setEmployees] = useState([]);
  // const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [inventory, setInventory] = useState([]);
  // const [searchTerm, setSearchTerm] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [diseases, setDiseases] = useState([]);
  const [medicineErrors, setMedicineErrors] = useState({});
  const [doctorPrescription, setDoctorPrescription] = useState([]);

  const fetchDoctorActions = async (employeeId, visitId) => {
  const res = await axios.get(
      `http://localhost:${BACKEND_PORT}/api/medical-actions/visit/${visitId}`
    );

    const actions = res.data || [];

    setDoctorPrescription(
      actions.filter(a => a.action_type === "DOCTOR_PRESCRIPTION")
    );
  };

  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Medicines: [{ medicineId: "", medicineName: "", expiryDate: "", quantity: 0 }],
    Notes: ""
  });
  const formatDateDMY = (value) => {
    if (!value) return "—";

    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
  };

  const filteredDoctorPrescription = doctorPrescription.filter(p => {
  const isFamily = p.data?.IsFamilyMember === true;
  const familyId = p.data?.FamilyMember_ID || null;

  // Employee case
  if (!formData.IsFamilyMember) {
    return isFamily === false;
  }

  // Family member case
  return (
    isFamily === true &&
    String(familyId) === String(formData.FamilyMember_ID)
  );
});



  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    const instituteId = localStorage.getItem("instituteId");
    if (!instituteId) return;

    setFormData((f) => ({ ...f, Institute_ID: instituteId }));
    fetchInstitute(instituteId);
    // fetchEmployees();
    fetchInventory(instituteId);
  }, []);

  /* ================= API CALLS ================= */
  const fetchInstitute = async (id) => {
    const res = await axios.get(
      `http://localhost:${BACKEND_PORT}/institute-api/institution/${id}`
    );
    setInstituteName(res.data?.Institute_Name || "");
  };

  // const fetchEmployees = async () => {
  //   const res = await axios.get(
  //     `http://localhost:${BACKEND_PORT}/employee-api/all`
  //   );
  //   setEmployees(res.data.employees || []);
  // };

  useEffect(() => {
  if (!medicineSearch.trim()) {
    setFilteredMedicines([]);
    return;
  }

  const results = inventory
    .filter((m) =>
      m.medicineName
        ?.toLowerCase()
        .includes(medicineSearch.toLowerCase())
    )
    .sort(
      (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
    );

  setFilteredMedicines(results);
}, [medicineSearch, inventory]);


  const fetchInventory = async (id) => {
    const res = await axios.get(
      `http://localhost:${BACKEND_PORT}/institute-api/inventory/${id}`
    );
    setInventory(res.data || []);
    console.log("PRESCRIPTION INVENTORY RESPONSE:", res.data);
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

  /* ================= EMPLOYEE SEARCH ================= */
  // useEffect(() => {
  //   if (!searchTerm) {
  //     setFilteredEmployees([]);
  //     return;
  //   }

  //   setFilteredEmployees(
  //     employees.filter((e) => String(e.ABS_NO).includes(searchTerm))
  //   );
  // }, [searchTerm, employees]);

  // const selectEmployee = (emp) => {
  //   setFormData((f) => ({
  //     ...f,
  //     Employee_ID: emp._id,
  //     IsFamilyMember: false,
  //     FamilyMember_ID: ""
  //   }));

  //   setSearchTerm(emp.ABS_NO);
  //   setFilteredEmployees([]);
  //   fetchDiseases(emp._id);
  // };

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
      .then((res) => setFamilyMembers(res.data || []));
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

  /* ================= MEDICINE LIMIT VALIDATION (FIXED) ================= */
  const validateMedicineQuantity = async (index, medicineName, quantity) => {
  try {
    const res = await axios.post(
      `http://localhost:${BACKEND_PORT}/medicine-limit-api/validate-medicine-quantity`,
      {
        medicine_name: medicineName.trim(),
        quantity: Number(quantity)
      }
    );

    // clear error
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
        const selected = inventory.find((m) => m.medicineId === value);
        updated[index] = {
          medicineId: selected?.medicineId || "",
          medicineName: selected?.medicineName || "",
          expiryDate: selected?.expiryDate || "",
          quantity: 0
        };

        // clear error when medicine changes
        setMedicineErrors((prevErr) => {
          const e = { ...prevErr };
          delete e[index];
          return e;
        });
      }

      if (field === "quantity") {
        updated[index].quantity = value;
        const selectedMedicine = inventory.find(
          (m) => m.medicineId === updated[index].medicineId
        );

        if (selectedMedicine) {
            const availableQty = selectedMedicine.quantity;
            const threshold = selectedMedicine.threshold;
            const requestedQty = Number(value);

            // ❌ HARD ERROR: insufficient stock
            if (requestedQty > availableQty) {
              setMedicineErrors((prev) => ({
                ...prev,
                [index]: `❌ Only ${availableQty} units available in stock`
              }));
              return { ...prev, Medicines: updated };
            }

            // ⚠️ SOFT WARNING: below threshold
            if (availableQty - requestedQty < threshold) {
              setMedicineErrors((prev) => {
                // if a hard error already exists, do NOT override it
                if (prev[index]?.startsWith("❌")) return prev;

                return {
                  ...prev,
                  [index]: `⚠️ Warning: Stock will fall below threshold (${threshold}). Remaining: ${availableQty - requestedQty}`
                };
              });
            } else {
              // clear stock warnings if safe
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

    const hasHardError = Object.values(medicineErrors).some(
      (msg) => msg.startsWith("❌")
    );

    if (hasHardError) {
      alert("❌ Fix stock / quantity errors before submitting");
      return;
    }

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
      FamilyMember_ID: formData.IsFamilyMember ? formData.FamilyMember_ID : null,
      Medicines: formData.Medicines.map(m => ({
        Medicine_ID: m.medicineId,
        Medicine_Name: m.medicineName,
        Quantity: Number(m.quantity),
        source: "PHARMACY"
      })),
      Notes: formData.Notes,
      visit_id: visitId
    };

    await axios.post(
      `http://localhost:${BACKEND_PORT}/prescription-api/add`,
      payload
    );

    alert("✅ Prescription saved successfully");
  };
  // const filteredAndSortedInventory = inventory
  // .filter((m) =>
  //   m.medicineName
  //     ?.toLowerCase()
  //     .includes(medicineSearch.toLowerCase())
  // )
  // .sort(
  //   (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
  // );


  /* ================= UI ================= */
  return (
    <div className="container-fluid mt-4">
      <div className="row justify-content-center">
        {/* FORM */}
        <div className="col-lg-8">
        <div className="card shadow border-0 pharmacy-card">

            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Pharmacy Prescription</h5>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Institute</label>
                  <input className="form-control" value={instituteName} readOnly />
                </div>
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
                  }}
                />
                {/* FAMILY MEMBER */}
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

                {communicableRecent.length > 0 && (
                  <div className="alert alert-warning">
                    <strong>Disease History (Reference Only)</strong>
                    <ul className="mb-0 mt-2">
                      {communicableRecent.map((d, i) => (
                        <li key={i}>{d.Disease_Name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <h6 className="fw-bold mt-4">Medicines</h6>

                {formData.Medicines.map((med, i) => (
                 <div key={i} className="mb-3 medicine-row">
                    <div className="d-flex gap-2 align-items-start">
                      <div className="d-flex flex-column w-100">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Type medicine name..."
                          value={
                            activeMedicineIndex === i
                              ? medicineSearch
                              : med.medicineName
                                ? `${med.medicineName} (Exp: ${formatDateDMY(med.expiryDate)})`
                                : ""
                          }
                            
                          onFocus={() => setActiveMedicineIndex(i)}
                          onChange={(e) => setMedicineSearch(e.target.value)}
                        />

                        {filteredMedicines.length > 0 && (
                         <div className="list-group w-100 mt-1 medicine-dropdown">
                            {filteredMedicines.map((m) => (
                              <button
                                type="button"
                                key={m.medicineId}
                                className="list-group-item list-group-item-action"
                                onClick={() => {
                                  handleMedicineChange(i, "medicineId", m.medicineId);
                                  setMedicineSearch("");
                                setFilteredMedicines([]);
                                setActiveMedicineIndex(null);

                                }}
                              >
                                {m.medicineName} | Exp: {formatDateDMY(m.expiryDate)} | Qty: {m.quantity}
                              </button>
                            ))}
                          </div>
                        )}
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

                <div className="mt-3">
                  <label className="form-label fw-semibold">Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.Notes}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, Notes: e.target.value }))
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-dark w-100 mt-4"
                  disabled={Object.values(medicineErrors).some(
                    (msg) => msg.startsWith("❌")
                  )}
                >
                  Submit Prescription
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* EMPLOYEE CARD */}
        {employeeProfile && (
  <div className="col-lg-3 d-none d-lg-block">
    
    {/* PROFILE CARD */}
    <div className="card shadow-sm border-0 text-center p-4 employee-card mb-3">
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
      />
      <h6 className="fw-bold mb-1">{employeeProfile.Name}</h6>
      <div className="text-muted">
        ABS No: {employeeProfile.ABS_NO}
      </div>
    </div>

        {/* DOCTOR PRESCRIPTION BELOW PROFILE */}
        {filteredDoctorPrescription.length > 0 && (
              <div className="card border-0 doctor-card">
                <div className="card-header">
                  Doctor Prescribed Medicines
                </div>

                <div className="card-body">
                  {filteredDoctorPrescription.map((p, i) => (
                    <ul key={i} className="mb-2 ps-3">
                      {p.data.medicines.map((m, idx) => (
                        <li key={idx}>
                        {m.Medicine_Name} — {m.Quantity}
                        <span className="badge bg-success ms-2">
                          Doctor Prescribed
                        </span>
                      </li>
                      ))}
                    </ul>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        

      </div>
    </div>
  );
};

export default PharmacyPrescriptionForm;
