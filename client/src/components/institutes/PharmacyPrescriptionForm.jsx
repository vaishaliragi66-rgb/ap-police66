import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import PatientSelector from "../institutes/PatientSelector";
import "./PharmacyPrescriptionForm.css";
import { useNavigate } from "react-router-dom";

const PharmacyPrescriptionForm = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [visitId, setVisitId] = useState(null); 
  const [medicineSearch, setMedicineSearch] = useState({});
  const [activeMedicineIndex, setActiveMedicineIndex] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [instituteName, setInstituteName] = useState("");
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [medicineErrors, setMedicineErrors] = useState({});
  const [doctorPrescription, setDoctorPrescription] = useState([]);
  const [lastTwoVisits, setLastTwoVisits] = useState([]);
  const [showDoctorPrescription, setShowDoctorPrescription] = useState(true);
  const [filteredDoctorPrescription, setFilteredDoctorPrescription] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [employeeReport, setEmployeeReport] = useState(null);
  const [showReports, setShowReports] = useState(false);

  const navigate = useNavigate();

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
        `${process.env.REACT_APP_API_URL}/api/medical-actions/visit/${visitId}`
      );
      const actions = res.data || [];
      
      const doctorPrescriptions = actions.filter(a => a.action_type === "DOCTOR_PRESCRIPTION");
      setDoctorPrescription(doctorPrescriptions);
    } catch (error) {
      console.error("Error fetching doctor actions:", error);
      setDoctorPrescription([]);
    }
  };

  const fetchLastTwoPrescriptions = async (employeeId, familyId = null) => {
  try {
    const res = await axios.get(
      `${process.env.REACT_APP_API_URL}/prescription-api/employee/${employeeId}`
    );

    let data = res.data || [];

    // 🔥 SAME FILTER AS DOCTOR FORM
    if (familyId) {
      data = data.filter(p =>
        p.IsFamilyMember &&
        String(p.FamilyMember?._id) === String(familyId)
      );
    } else {
      data = data.filter(p => !p.IsFamilyMember);
    }

    // 🔥 SAME SORT AS DOCTOR FORM
    data.sort(
      (a, b) => new Date(b.Timestamp) - new Date(a.Timestamp)
    );

    setLastTwoVisits(data.slice(0, 2));

  } catch (err) {
    console.error("Error fetching previous prescriptions:", err);
    setLastTwoVisits([]);
  }
};
const checkStockAvailability = (medicineCode, requestedQty) => {
  const item = inventory.find(
    m => m.Medicine_Code === medicineCode
  );

  const availableQty = item?.Quantity || 0;

  if (requestedQty <= availableQty) {
    return { status: "AVAILABLE", maxQty: availableQty };
  }

  return { status: "EXCEEDS", maxQty: availableQty };
};


const loadEmployeeReports = async () => {
  if (!selectedEmployee || !selectedEmployee.ABS_NO) {
    alert("No employee selected");
    return;
  }

  try {
      const reportRes = await axios.get(
  `${process.env.REACT_APP_API_URL}/employee-api/health-report`,
  { params: { absNo: selectedEmployee.ABS_NO } }
);

    const diseaseRes = await axios.get(
      `${process.env.REACT_APP_API_URL}/disease-api/employee/${selectedEmployee._id}`
    );


    setEmployeeReport({
      ...reportRes.data,
      allDiseases: diseaseRes.data || []
    });

    setShowReports(true);

  } catch (err) {
    console.error("Report fetch error:", err);
    alert("Unable to fetch reports");
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

  const formatExpiryMY = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";

    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${mm}-${yyyy}`;
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
        `${process.env.REACT_APP_API_URL}/institute-api/institution/${id}`
      );
      setInstituteName(res.data?.Institute_Name || "");
    } catch (error) {
      console.error("Error fetching institute:", error);
    }
  };

  const fetchInventory = async (id) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/institute-api/inventory/${id}`
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
        `${process.env.REACT_APP_API_URL}/disease-api/employee/${employeeId}`
      );
      setDiseases(res.data || []);
    } catch {
      setDiseases([]);
    }
  };

  /* ================= MEDICINE SEARCH ================= */
useEffect(() => {
  const searchText = medicineSearch[activeMedicineIndex] || "";

  if (!searchText.trim()) {
    setFilteredMedicines([]);
    return;
  }

  console.log("Inventory sample:", inventory[0]);

const results = inventory.filter(m =>
  m.Medicine_Name?.toLowerCase().includes(searchText.toLowerCase())
);


  setFilteredMedicines(results);
  console.log("Search text:", searchText);
console.log("Results:", results);

}, [medicineSearch, activeMedicineIndex, inventory]);


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
        `${process.env.REACT_APP_API_URL}/medicine-limit-api/validate-medicine-quantity`,
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
  setFormData(prev => {
    const updated = [...prev.Medicines];
    if (field === "medicineId") {
      const selected = inventory.find(m => m.Medicine_Code === value);
      if (!selected) return prev;

      updated[index] = {
        ...updated[index],   // 🔥 keep existing quantity
        medicineId: selected.Medicine_Code,
        medicineName: selected.Medicine_Name,
        expiryDate: selected.Expiry_Date
      };
    }

if (field === "quantity") {
  const requestedQty = Number(value);
  const medicineCode = updated[index].medicineId;

  if (!medicineCode) {
    updated[index].quantity = requestedQty;
    return { ...prev, Medicines: updated };
  }

  const stockCheck = checkStockAvailability(medicineCode, requestedQty);

if (stockCheck.status === "AVAILABLE")
{
    updated[index].quantity = requestedQty;

    setMedicineErrors(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  }


else {
  updated[index].quantity = stockCheck.maxQty;

  setMedicineErrors(prev => ({
    ...prev,
    [index]: `❌ Only ${stockCheck.maxQty} available`
  }));
}

}


    if (field === "searchText") {
      updated[index] = {
        ...updated[index],
        medicineId: "",
        medicineName: "",
        expiryDate: ""
      };
    }


    return { ...prev, Medicines: updated };
  });
};

const calculateQuantity = (dosage, duration) => {
  if (!dosage || !duration) return 1;

  // Example dosage: "1-0-1"
  const parts = dosage.split("-").map(n => Number(n) || 0);
  const perDay = parts.reduce((a, b) => a + b, 0);

  // Example duration: "5 days"
  const daysMatch = duration.match(/\d+/);
  const days = daysMatch ? Number(daysMatch[0]) : 1;

  return perDay * days;
};

  /* ================= ADD DOCTOR PRESCRIBED MEDICINE TO FORM ================= */
const addDoctorPrescribedMedicine = (medicine) => {
  const baseName = medicine.Medicine_Name?.trim();
  const calculatedQty = calculateQuantity(medicine.Dosage, medicine.Duration);

  setFormData(prev => {
    const medicinesCopy = [...prev.Medicines];

    // 🔥 Find first empty row
    const emptyIndex = medicinesCopy.findIndex(
      m => !m.medicineName
    );


    if (emptyIndex !== -1) {
      // Use existing empty row
      medicinesCopy[emptyIndex] = {
        ...medicinesCopy[emptyIndex],
        medicineName: baseName,
        quantity: calculatedQty
      };

      // Pre-fill search for that index
      setMedicineSearch(prevSearch => ({
        ...prevSearch,
        [emptyIndex]: baseName
      }));

      setActiveMedicineIndex(emptyIndex);
    } else {
      // Otherwise add new row
      medicinesCopy.push({
        medicineId: "",
        medicineName: baseName,
        expiryDate: "",
        quantity: calculatedQty
      });

      const newIndex = medicinesCopy.length - 1;

      setMedicineSearch(prevSearch => ({
        ...prevSearch,
        [newIndex]: baseName
      }));

      setActiveMedicineIndex(newIndex);
    }

    return { ...prev, Medicines: medicinesCopy };
  });
};


// Helper function with trimmed logging
const addMedicineToForm = (inventoryItem, quantity) => {
  const itemName = inventoryItem.Medicine_Name?.trim();
  const itemCode = inventoryItem.Medicine_Code?.trim();
  
  if (inventoryItem.Quantity === 0) {
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

  const selectedRows = formData.Medicines.filter((medicine) => medicine.medicineId);

  if (selectedRows.length === 0) {
    alert("Please select at least one medicine from the sub-store list.");
    return;
  }

  const hasManualEntry = formData.Medicines.some((medicine, index) => {
    const typedText = (medicineSearch[index] || "").trim();
    const hasTypedOrQty = typedText.length > 0 || Number(medicine.quantity) > 0;
    return hasTypedOrQty && !medicine.medicineId;
  });

  if (hasManualEntry) {
    alert("Please select medicine from suggestions only. Manual entry is not allowed.");
    return;
  }

  const invalidSelected = selectedRows.some((medicine) => {
    const invItem = inventory.find((item) => item.Medicine_Code === medicine.medicineId);
    return !invItem || Number(medicine.quantity) <= 0;
  });

  if (invalidSelected) {
    alert("Please select valid medicine and quantity from sub-store.");
    return;
  }

  // Build payload with PROPER Medicine_ID
  const payload = {
    Institute_ID: formData.Institute_ID,
    Employee_ID: formData.Employee_ID,
    IsFamilyMember: formData.IsFamilyMember,
    FamilyMember_ID: formData.IsFamilyMember ? formData.FamilyMember_ID : null,
    Medicines: selectedRows.map(m => {
      // Find medicine in inventory - IMPORTANT: Get the _id!
      const invItem = inventory.find(item => 
        item.Medicine_Code === m.medicineId
      );
      
      
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

  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/prescription-api/add`,
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
    <div className="container-fluid mt-2">
       
      {/* Back Button */}
      <button
        className="btn mb-3"
        onClick={() => navigate(-1)}
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #D6E0F0",
          borderRadius: "8px",
          padding: "6px 14px",
          fontSize: "14px",
          color: "#1F2933",
        }}
      >
        ← Back
      </button>
      <div className="row">
        {/* LEFT REPORTS */}
{showReports && (
  <div className="col-lg-3 mb-3">
    <div className="card shadow border-0 h-100">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <strong>Employee Reports</strong>

                <button
                  className="btn btn-sm btn-light"
                  onClick={() => setShowReports(false)}
                >
                  ✕
                </button>
              </div>

              <div
  className="card-body"
  style={{ maxHeight: "70vh", overflowY: "auto" }}
>

  {!employeeReport ? (
    <div className="text-muted">No reports available</div>
  ) : (
    <>
      {/* BASIC DETAILS */}
      <div className="mb-3">
  <div>
    <strong>Name:</strong> {employeeReport.employee?.Name}
  </div>
  <div>
    <strong>ABS No:</strong> {employeeReport.employee?.ABS_NO}
  </div>
  <div>
    <strong>Age:</strong> {employeeReport.employee?.Age}
  </div>
  <div>
    <strong>Blood Group:</strong> {employeeReport.employee?.Blood_Group}
  </div>
</div>


      {/* DISEASE HISTORY */}
      {employeeReport.allDiseases?.length > 0 && (
        <div className="mb-3">
          <h6 className="fw-bold">Disease History</h6>
          <ul className="small ps-3">
            {employeeReport.allDiseases.map((d, i) => (
              <li key={i}>
                {d.Disease_Name} 
                {d.Category && ` (${d.Category})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* LAB TEST REPORTS */}
      {employeeReport.tests?.length > 0 && (
        <div>
          <h6 className="fw-bold">Lab Reports</h6>

          {employeeReport.tests.map((t, idx) => (
            <div key={idx} className="border rounded p-2 mb-2 small">
              <div><strong>{t.Test_Name}</strong></div>
              <div>Result: {t.Result_Value}</div>
              {t.Reference_Range && (
                <div>Ref Range: {t.Reference_Range}</div>
              )}
              {t.Units && (
                <div>Units: {t.Units}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )}
</div>

            </div>
          </div>
        )}

        {/* FORM - MAIN CONTENT */}
        <div className={`${showReports ? "col-lg-6" : "col-lg-9"} mb-3`}>
          {/* ===== TOP BAR WITH INVENTORY BUTTON ===== */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="fw-bold mb-0">Pharmacy Prescription</h4>
              <small className="text-muted">
                Issue medicines to employees
              </small>
            </div>

            <button
              className="btn btn-outline-primary"
              onClick={() => navigate("/institutes/inventory?mode=embedded")}
            >
              🏥 Inventory
            </button>
          </div>
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
                  instituteId={formData.Institute_ID}
                  onlyPharmacyQueue={true}
                  onSelect={({ employee, visit }) => {
                    setSelectedEmployee(employee);
                    setSelectedVisit(visit);
                    setVisitId(visit?._id || null);
                    const isFamily = visit?.IsFamilyMember || false;
                    const familyId = visit?.FamilyMember?._id || null;

                    setFormData(prev => ({
                      ...prev,
                      Employee_ID: employee._id,
                      IsFamilyMember: isFamily,
                      FamilyMember_ID: familyId
                    }));

                    fetchDiseases(employee._id);

                    if (visit?._id) {
                      fetchDoctorActions(employee._id, visit._id);
                    }

                    fetchLastTwoPrescriptions(employee._id, familyId);
                  }}
                />

                {selectedVisit && (
                  <div className="alert alert-info mt-3 d-flex justify-content-between align-items-center">
                    <div>
                      <strong>
                        Token {selectedVisit.token_no} —
                      </strong>{" "}
                      {selectedVisit.IsFamilyMember
                        ? `${selectedVisit.FamilyMember?.Name} (${selectedVisit.FamilyMember?.Relationship})`
                        : selectedVisit.employee_id?.Name}
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-dark"
                      onClick={()=>{
                        loadEmployeeReports()}}
                    >
                      View Reports
                    </button>
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
                                  <th>Dosage</th>
                                  <th>Duration</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {prescription.data.medicines.map((medicine, mIdx) => (
                                  <tr key={mIdx}>
                                    <td>{medicine.Medicine_Name}</td>
                                    <td>{medicine.Dosage || "-"}</td>
                                    <td>{medicine.Duration || "-"}</td>
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
                          className={`form-control ${
                              med.medicineName ? "medicine-auto-filled" : ""
                            }`}
                          placeholder="Type medicine name..."
                          // When displaying medicine in the input field:
                          value={
                              (() => {
                                const typedValue = medicineSearch[i];
                                const hasTypedValue = typeof typedValue === "string" && typedValue.length > 0;

                                if (hasTypedValue) {
                                  return typedValue;
                                }

                                return med.medicineName
                                  ? `${med.medicineName.trim()} (Exp: ${formatExpiryMY(med.expiryDate)})`
                                  : "";
                              })()
                            }

                          onFocus={() => setActiveMedicineIndex(i)}
                          onChange={(e) => {
                            const value = e.target.value;
                            setMedicineSearch(prev => ({
                              ...prev,
                              [i]: value
                            }));
                            handleMedicineChange(i, "searchText", value);
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              if (activeMedicineIndex === i) {
                                setActiveMedicineIndex(null);
                              }
                            }, 150);
                          }}

                        />

                        {activeMedicineIndex === i && filteredMedicines.map((m) => {
                          const displayName = m.Medicine_Name?.trim();
                          const displayCode = m.Medicine_Code?.trim();
  
                          return (
                            <button
                              type="button"
                              key={m._id}
                              className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                                m.Quantity === 0 ? "disabled text-muted" : ""
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (m.Quantity === 0) return;
                                handleMedicineChange(i, "medicineId", displayCode);
                                setMedicineSearch(prev => {
                                  const updated = { ...prev };
                                  delete updated[i];
                                  return updated;
                                });

                                setFilteredMedicines([]);
                                setActiveMedicineIndex(null);
                              }}
                            >
                              <div>
                                <strong>{displayName}</strong>
                                <div className="small text-muted">
                                  Exp: {formatExpiryMY(m.Expiry_Date)}
                                </div>
                              </div>

                              {m.Quantity > 0 ? (
                                <span className="badge bg-success">
                                  Available: {m.Quantity}
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
                      setFormData((f) => ({ ...f, Notes: e.tar7.value }))
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
          </div>

          
          <div className="col-lg-3">
            {lastTwoVisits.length > 0 && (
              <div className="card shadow border-0 mb-3">
                <div className="card-header bg-secondary text-white">
                  <strong>Previous 2 Pharmacy Prescriptions</strong>
                </div>

                <div className="card-body">
                  {lastTwoVisits.map((p, idx) => {

                    const formattedDate = p.Timestamp
                      ? new Date(p.Timestamp).toLocaleDateString("en-GB")
                      : "-";

                    return (
                      <div key={idx} className="mb-3 border-bottom pb-2">

                        <div className="fw-semibold mb-1">
                          {formattedDate}
                        </div>

                        {p.FamilyMember && (
                          <div className="text-muted small mb-1">
                            {p.FamilyMember.Name} ({p.FamilyMember.Relationship})
                          </div>
                        )}

                        <ul className="small mb-2 ps-3">
                          {p.Medicines?.map((m, i) => (
                            <li key={i}>
                              {m.Medicine_Name || m.Medicine_ID?.Medicine_Name}
                              {" — "}
                              Qty: {m.Quantity}
                            </li>
                          ))}
                        </ul>

                        {p.Notes && (
                          <div className="fst-italic small text-muted">
                            {p.Notes}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyPrescriptionForm;