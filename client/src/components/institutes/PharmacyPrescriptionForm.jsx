import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import PatientSelector from "../institutes/PatientSelector";
import "./PharmacyPrescriptionForm.css";
import "./InstitutesTheme.css";
import { useNavigate } from "react-router-dom";
import { fetchMasterDataMap, getMasterMedicinesByTypeAndForm, getMasterOptions, getMasterMedicineEntries } from "../../utils/masterData_clean";

const { useMemo } = React;

const PharmacyPrescriptionForm = () => {                       
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [visitId, setVisitId] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [instituteName, setInstituteName] = useState("");
  const [diseases, setDiseases] = useState([]);
  const [medicineErrors, setMedicineErrors] = useState({});
  const [doctorPrescription, setDoctorPrescription] = useState([]);
  const [lastTwoVisits, setLastTwoVisits] = useState([]);
  const [showDoctorPrescription, setShowDoctorPrescription] = useState(true);
  const [filteredDoctorPrescription, setFilteredDoctorPrescription] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [employeeReport, setEmployeeReport] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [masterMap, setMasterMap] = useState({});
  const [showDoctorNotes, setShowDoctorNotes] = useState({});

  const medicineTypeOptions = getMasterOptions(masterMap, "Medicine Types");
  const dosageFormOptions = getMasterOptions(masterMap, "Dosage Forms");

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Medicines: [{ medicineId: "", medicineName: "", medicineType: "", dosageForm: "", type: "", strength: "", expiryDate: "", quantity: 0 }],
  });

  // Build options for medicine select combining inventory and master data
  const getPharmacyOptionsByTypeAndForm = (medicineTypeValue, dosageFormValue) => {
    const typeKey = normalizeText(medicineTypeValue);
    if (!typeKey) return [];

    const formKey = normalizeText(dosageFormValue);

    const masterEntries = getMasterMedicinesByTypeAndForm(masterMap, medicineTypeValue, dosageFormValue);
    const masterNames = masterEntries.map((e) => ({ name: e.value_name, strength: e.strength || "" }));

    const inventoryByForm = (inventory || []).filter((item) => {
      if (!typeKey) return false;
      if (normalizeText(item?.Medicine_Type) !== typeKey) return false;
      if (!formKey) return true;
      return normalizeText(item?.Dosage_Form) === formKey || normalizeText(item?.Type) === formKey;
    });

    const options = [];
    // Add inventory options first
    inventoryByForm.forEach((item) => {
      options.push({
        value: `code::${item.Medicine_Code}`,
        label: `${item.Medicine_Name}${item.Strength ? ` (${item.Strength})` : ""}${item.Expiry_Date ? ` - Exp ${formatExpiryMY(item.Expiry_Date)}` : ""} - Stock ${item.Quantity || 0}`,
        kind: "inventory",
        inventory: item
      });
    });

    // If no inventory entries, expose master entries as options
    if (!inventoryByForm.length) {
      masterNames.forEach((m) => {
        options.push({ value: `name::${m.name}`, label: `${m.name}${m.strength ? ` (${m.strength})` : ""} - Not in stock`, kind: "master", master: m });
      });
      return options;
    }

    // Add master-only names that are not already present in inventory
    masterNames.forEach((m) => {
      const exists = inventoryByForm.some((inv) => normalizeText(inv.Medicine_Name) === normalizeText(m.name) && (m.strength ? normalizeText(inv.Strength) === normalizeText(m.strength) : true));
      if (!exists) {
        options.push({ value: `name::${m.name}`, label: `${m.name}${m.strength ? ` (${m.strength})` : ""} - Not in stock`, kind: "master", master: m });
      }
    });

    return options;
  };
  

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
        `${BACKEND_URL}/api/medical-actions/visit/${visitId}`
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
      `${BACKEND_URL}/prescription-api/employee/${employeeId}`
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
  `${BACKEND_URL}/employee-api/health-report`,
  { params: { absNo: selectedEmployee.ABS_NO } }
);

    const diseaseRes = await axios.get(
      `${BACKEND_URL}/disease-api/employee/${selectedEmployee._id}`
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

  const isMedicineExpired = (value) => {
    if (!value) return false;

    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return false;

    const expiryEndOfDay = new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      23,
      59,
      59,
      999
    );

    return expiryEndOfDay < new Date();
  };

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    const instituteId = localStorage.getItem("instituteId");
    if (!instituteId) return;

    setFormData((f) => ({ ...f, Institute_ID: instituteId }));
    fetchInstitute(instituteId);
    fetchInventory(instituteId);

    let mounted = true;
    const loadMaster = async () => {
      try {
        const data = await fetchMasterDataMap({ force: false });
        if (mounted) setMasterMap(data || {});
      } catch {
        if (mounted) setMasterMap({});
      }
    };

    loadMaster();

    const onMasterUpdated = () => loadMaster();
    window.addEventListener("master-data-updated", onMasterUpdated);

    return () => {
      mounted = false;
      window.removeEventListener("master-data-updated", onMasterUpdated);
    };
  }, []);


  /* ================= API CALLS ================= */
  const fetchInstitute = async (id) => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/institute-api/institution/${id}`
      );
      setInstituteName(res.data?.Institute_Name || "");
    } catch (error) {
      console.error("Error fetching institute:", error);
    }
  };

  const fetchInventory = async (id) => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/institute-api/inventory/${id}`
      );
      const usableInventory = (res.data || []).filter(
        (item) => Number(item?.Quantity || 0) > 0 && !isMedicineExpired(item?.Expiry_Date)
      );
      setInventory(usableInventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      setInventory([]);
    }
  };

  const fetchDiseases = async (employeeId) => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/disease-api/employee/${employeeId}`
      );
      setDiseases(res.data || []);
    } catch {
      setDiseases([]);
    }
  };

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
        `${BACKEND_URL}/medicine-limit-api/validate-medicine-quantity`,
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
      // value can be 'code::<Medicine_Code>' for inventory or 'name::<Medicine Name>' for master-only
      if (String(value).startsWith("code::")) {
        const code = String(value).slice(6);
        const selected = inventory.find(m => String(m.Medicine_Code) === String(code));
        if (!selected) return prev;

        updated[index] = {
          ...updated[index],   // keep existing quantity
          medicineId: selected.Medicine_Code,
          medicineName: selected.Medicine_Name,
          dosageForm: selected.Type || updated[index].dosageForm || "",
          type: updated[index].medicineType || updated[index].type || updated[index].medicineType || "",
          strength: selected.Strength || updated[index].strength || "",
          expiryDate: selected.Expiry_Date
        };
      } else if (String(value).startsWith("name::")) {
        const name = String(value).slice(6);
        // find in master entries
        const masterEntry = (getMasterMedicineEntries(masterMap) || []).find(e => normalizeText(e.value_name) === normalizeText(name) && (updated[index].dosageForm ? normalizeText(e.dosageForm) === normalizeText(updated[index].dosageForm) : true));

        updated[index] = {
          ...updated[index],
          medicineId: "",
          medicineName: name,
          dosageForm: updated[index].dosageForm || (masterEntry ? masterEntry.dosageForm : ""),
          type: updated[index].medicineType || updated[index].type || (masterEntry ? masterEntry.medicineType : ""),
          strength: masterEntry ? masterEntry.strength || "" : "",
          expiryDate: masterEntry ? masterEntry.expiryDate || "" : ""
        };
      } else {
        // legacy: treat as code
        const selected = inventory.find(m => String(m.Medicine_Code) === String(value));
        if (!selected) return prev;
        updated[index] = {
          ...updated[index],
          medicineId: selected.Medicine_Code,
          medicineName: selected.Medicine_Name,
          dosageForm: selected.Type || updated[index].dosageForm || "",
          type: updated[index].medicineType || updated[index].type || "",
          strength: selected.Strength || updated[index].strength || "",
          expiryDate: selected.Expiry_Date
        };
      }
    }

    if (field === "medicineType") {
      const currentMedicineCode = updated[index].medicineId;
      const currentSelected = inventory.find(
        (item) => item.Medicine_Code === currentMedicineCode
      );

      updated[index] = {
        ...updated[index],
        medicineType: value,
        type: value
      };

      const allowed = getPharmacyOptionsByTypeAndForm(value, updated[index].dosageForm || "");
      const isStillValid = allowed.some((item) => String(item.Medicine_Code) === String(currentMedicineCode));

      if (currentSelected && !isStillValid) {
        updated[index] = {
          ...updated[index],
          medicineId: "",
          medicineName: "",
          strength: "",
          expiryDate: ""
        };
      }
    }

    if (field === "dosageForm") {
      const currentMedicineCode = updated[index].medicineId;

      updated[index] = {
        ...updated[index],
        dosageForm: value
      };

      const allowed = getPharmacyOptionsByTypeAndForm(updated[index].medicineType || "", value);
      const isStillValid = allowed.some((item) => String(item.Medicine_Code) === String(currentMedicineCode));
      if (!isStillValid) {
        updated[index] = {
          ...updated[index],
          medicineId: "",
          medicineName: "",
          strength: "",
          expiryDate: ""
        };
      }
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
  // Calculate quantity from Morning + Afternoon + Night over duration
  const perDay = (Number(medicine.Morning) || 0) + (Number(medicine.Afternoon) || 0) + (Number(medicine.Night) || 0);
  const daysMatch = medicine.Duration?.match(/\d+/);
  const days = daysMatch ? Number(daysMatch[0]) : 1;
  const calculatedQty = perDay * days;
  const matchedInventory = (inventory || []).find((item) => {
    const sameName = normalizeText(item.Medicine_Name) === normalizeText(baseName);
    const sameType = !medicine.Dosage_Form || normalizeText(item.Type) === normalizeText(medicine.Dosage_Form);
    const sameStrength =
      !medicine.Strength || normalizeText(item.Strength) === normalizeText(medicine.Strength);
    return sameName && sameType && sameStrength;
  });

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
        medicineId: matchedInventory?.Medicine_Code || "",
        medicineName: matchedInventory?.Medicine_Name || baseName,
        medicineType: medicine.Type || "",
        type: medicine.Type || "",
        dosageForm: matchedInventory?.Type || medicine.Dosage_Form || "",
        foodTiming: medicine.FoodTiming || "",
        strength: matchedInventory?.Strength || medicine.Strength || "",
        expiryDate: matchedInventory?.Expiry_Date || "",
        quantity: calculatedQty
      };
    } else {
      // Otherwise add new row
      medicinesCopy.push({
        medicineId: matchedInventory?.Medicine_Code || "",
        medicineName: matchedInventory?.Medicine_Name || baseName,
        medicineType: medicine.Type || "",
        type: medicine.Type || "",
        dosageForm: matchedInventory?.Type || medicine.Dosage_Form || "",
        foodTiming: medicine.FoodTiming || "",
        strength: matchedInventory?.Strength || medicine.Strength || "",
        expiryDate: matchedInventory?.Expiry_Date || "",
        quantity: calculatedQty
      });
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
        medicineType: "",
        type: "",
        dosageForm: inventoryItem.Type || "",
        strength: inventoryItem.Strength || "",
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
        { medicineId: "", medicineName: "", medicineType: "", dosageForm: "", type: "", strength: "", quantity: 0, _uid: `${Date.now()}-${Math.random().toString(36).slice(2,8)}` }
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

  const hasManualEntry = formData.Medicines.some((medicine) =>
    (medicine.medicineName?.trim() || Number(medicine.quantity) > 0) && !medicine.medicineId
  );

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
        Type: m.medicineType || m.type || "",
        Dosage_Form: m.dosageForm || "",
        Strength: m.strength || invItem?.Strength || "",
        Quantity: Number(m.quantity),
        source: "PHARMACY"
      };
    }),
    Notes: formData.Notes,
    visit_id: visitId
  };

  try {
    const response = await axios.post(
      `${BACKEND_URL}/prescription-api/add`,
      payload
    );

    alert("✅ Prescription saved successfully!");

    // Reset form
    setFormData({
      Institute_ID: formData.Institute_ID,
      Employee_ID: "",
      IsFamilyMember: false,
      FamilyMember_ID: "",
      Medicines: [{ medicineId: "", medicineName: "", medicineType: "", dosageForm: "", type: "", strength: "", expiryDate: "", quantity: 0 }],
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
    <div className="container-fluid mt-2 institutes-theme">

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
                      className="btn btn-sm btn-outline-primary view-action"
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
                    <strong>⚠ Disease History (Reference Only)</strong>
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
                      <h6 className="mb-0">👨⚕ Doctor Prescribed Medicines</h6>
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
                                  <th>Type</th>
                                  <th>Food Timing</th>
                                  <th>Strength</th>
                                  <th>Morning</th>
                                  <th>Afternoon</th>
                                  <th>Night</th>
                                  <th>Duration</th>
                                  <th>Remarks</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {prescription.data.medicines.map((medicine, mIdx) => (
                                  <tr key={mIdx}>
                                    <td>{medicine.Medicine_Name}</td>
                                    <td>{medicine.Type || "-"}</td>
                                    <td>{medicine.FoodTiming || "-"}</td>
                                    <td>{medicine.Strength || "-"}</td>
                                    <td>{medicine.Morning || "0"}</td>
                                    <td>{medicine.Afternoon || "0"}</td>
                                    <td>{medicine.Night || "0"}</td>
                                    <td>{medicine.Duration || "-"}</td>
                                    <td>{medicine.Remarks || "-"}</td>
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
                              <div className="mt-2">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-info"
                                  onClick={() => setShowDoctorNotes(prev => ({ ...prev, [pIdx]: !prev[pIdx] }))}
                                >
                                  {showDoctorNotes[pIdx] ? "Hide Doctor Notes" : "Show Doctor Notes"}
                                </button>
                                {showDoctorNotes[pIdx] && (
                                  <div className="alert alert-info mt-2 mb-0 p-2">
                                    <small><strong>Doctor Notes:</strong> {prescription.data.notes}</small>
                                  </div>
                                )}
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
                      <select
                        className="form-select"
                        value={med.medicineType || ""}
                        onChange={(e) => handleMedicineChange(i, "medicineType", e.target.value)}
                      >
                        <option value="">Select Medicine Type</option>
                        {medicineTypeOptions.map((typeOption) => (
                          <option key={typeOption} value={typeOption}>
                            {typeOption}
                          </option>
                        ))}
                      </select>

                      <select
                        className="form-select"
                        value={med.dosageForm || ""}
                        disabled={!med.medicineType}
                        onChange={(e) => handleMedicineChange(i, "dosageForm", e.target.value)}
                      >
                        <option value="">{med.medicineType ? "Select Dosage Form" : "Select Medicine Type First"}</option>
                        {dosageFormOptions.map((formOption) => (
                          <option key={formOption} value={formOption}>
                            {formOption}
                          </option>
                        ))}
                      </select>

                      <select
                        className={`form-select ${med.medicineName ? "medicine-auto-filled" : ""}`}
                        value={med.medicineId || med.medicineName || ""}
                        disabled={!med.medicineType}
                        onChange={(e) => handleMedicineChange(i, "medicineId", e.target.value)}
                      >
                        <option value="">{med.medicineType ? "Select Medicine" : "Select Medicine Type First"}</option>
                        {getPharmacyOptionsByTypeAndForm(med.medicineType, med.dosageForm).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        className="form-control"
                        value={med.strength || ""}
                        placeholder="Strength"
                        readOnly
                      />

                      <input
                        type="number"
                        className="form-control quantity-input"
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
                          medicineErrors[i].startsWith("⚠")
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
                              {m.Strength ? ` (${m.Strength})` : ""}
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
