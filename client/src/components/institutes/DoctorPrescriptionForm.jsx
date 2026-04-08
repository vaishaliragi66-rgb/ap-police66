import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import PatientSelector from "../institutes/PatientSelector";
import { useNavigate } from "react-router-dom";
import diagnosticTestsByCategory from "../../data/diagnosticTests";
import { fetchMasterDataMap, getMasterMedicineEntries, getMasterOptions } from "../../utils/masterData";
import { mergeXrayTypes } from "../../data/xrayTypes";

const DoctorPrescriptionForm = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5200}`;

  const resolveUrl = (u) => {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    const base = (BACKEND_URL || '').replace(/\/$/, '');
    return `${base}/${String(u).replace(/^\/+/, '')}`;
  };
  const navigate = useNavigate();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [lastTwoVisits, setLastTwoVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [instituteName, setInstituteName] = useState("");
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [diseases, setDiseases] = useState([]);
  const [visitId, setVisitId] = useState(null);
  const [testsMaster, setTestsMaster] = useState([]);
  const [diagnosisData, setDiagnosisData] = useState({
    Tests: [{ Category: "", Test_ID: "", Test_Name: "" }]
  });
  const [employeeReport, setEmployeeReport] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [selectedDiagnosisReport, setSelectedDiagnosisReport] = useState(null);
  const [selectedXrayReport, setSelectedXrayReport] = useState(null); // { record, xray }
  const [selectedPrescriptionReport, setSelectedPrescriptionReport] = useState(null);
  const [inventoryMedicines, setInventoryMedicines] = useState([]);
  const [medicineStrengths, setMedicineStrengths] = useState({});
  const notesTextareaRef = React.useRef(null);
const [xrayMaster, setXrayMaster] = useState([]);
const [xrayData, setXrayData] = useState({
  Xrays: [{ Xray_ID: "", Xray_Type: "" }]
});

const [diseaseSearch, setDiseaseSearch] = useState("");
const [filteredDiseases, setFilteredDiseases] = useState([]);
const [showDiseaseDropdown, setShowDiseaseDropdown] = useState(false); // Track if field is focused

const [diseaseMaster, setDiseaseMaster] = useState([]);
const [cdDiseases, setCdDiseases] = useState([]);
const [ncdDiseases, setNcdDiseases] = useState([]);
const [masterMap, setMasterMap] = useState({});
const [selectedType, setSelectedType] = useState("");
const [selectedSubgroup, setSelectedSubgroup] = useState("");
const [patientSelectorKey, setPatientSelectorKey] = useState(0); // For resetting PatientSelector

const normalizeMedicineText = (value) => String(value || "").trim().toLowerCase();
const makeMedicineLookupKey = (medicineType, dosageForm, name) =>
  `${normalizeMedicineText(medicineType)}::${normalizeMedicineText(dosageForm)}::${normalizeMedicineText(name)}`;



  const [diseaseData, setDiseaseData] = useState({
    Category: "Communicable",
    Disease_Name: "",
    Severity_Level: "Mild"
  });


  const testsByCategory = useMemo(() => {
    const grouped = {};
    Object.keys(diagnosticTestsByCategory || {}).forEach((category) => {
      grouped[category] = (diagnosticTestsByCategory[category] || []).map((test, idx) => ({
        _id: `static-${category}-${idx}`,
        name: String(test?.name || "").trim(),
        reference: test?.reference || "",
        unit: test?.unit || ""
      })).filter((item) => item.name);
    });

    (testsMaster || []).forEach((test) => {
      const group = String(test?.Group || "").trim();
      const testName = String(test?.Test_Name || "").trim();
      if (!group || !testName) return;
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push({
        _id: test._id,
        name: testName,
        reference: test.Reference_Range || "",
        unit: test.Units || ""
      });
    });
    Object.keys(grouped).forEach((group) => {
      const seen = new Set();
      grouped[group] = grouped[group]
        .filter((item) => {
          const key = String(item?.name || "").trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    });
    return grouped;
  }, [testsMaster]);

  const [showOtherDiseaseInput, setShowOtherDiseaseInput] = useState(false);

  const diseaseCategoryOptions = getMasterOptions(masterMap, "Disease Categories");
  const diseaseSeverityOptions = getMasterOptions(masterMap, "Disease Severity Levels");
  const medicineTypeOptions = getMasterOptions(masterMap, "Medicine Types");
  const dosageFormOptions = getMasterOptions(masterMap, "Dosage Forms");
  const foodTimingOptions = getMasterOptions(masterMap, "Food Timings");
  const effectiveDiseaseSeverityOptions = diseaseSeverityOptions.length > 0
    ? diseaseSeverityOptions
    : ["Mild", "Moderate", "Severe", "Chronic", "Null"];

  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Medicines: [{ Medicine_Name: "", Medicine_Type: "", Dosage_Form: "", Type: "", FoodTiming: "", Strength: "", Morning: false, Afternoon: false, Night: false, Duration: "", Remarks: "", Quantity: 0 }],
    Notes: "",
    Disease_Name: ""
  });

  const getStrengthOptions = (medicineName, medicineType = "", dosageForm = "") => {
    if (!medicineName) return [];
    const strictKey = makeMedicineLookupKey(medicineType, dosageForm, medicineName);
    const typeFallbackKey = makeMedicineLookupKey(medicineType, "", medicineName);
    const fullFallbackKey = makeMedicineLookupKey("", "", medicineName);
    return medicineStrengths[strictKey] || medicineStrengths[typeFallbackKey] || medicineStrengths[fullFallbackKey] || [];
  };

  const getMedicineOptionsByType = (selectedMedicineType = "", selectedDosageForm = "") => {
    const typeKey = normalizeMedicineText(selectedMedicineType);
    if (!typeKey) return [];

    const dosageKey = normalizeMedicineText(selectedDosageForm);

    const names = new Set();
    (inventoryMedicines || []).forEach((med) => {
      if (normalizeMedicineText(med?.Medicine_Type) === typeKey) {
        if (dosageKey && normalizeMedicineText(med?.Dosage_Form) !== dosageKey) {
          return;
        }
        const name = String(med?.Medicine_Name || "").trim();
        if (name) names.add(name);
      }
    });

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  };

  const calculateQuantity = (morning, afternoon, night, duration) => {
    if (!duration) return 0;

    // Sum the dosages for morning, afternoon, and night (1 if checked, 0 if not)
    const perDay = (morning ? 1 : 0) + (afternoon ? 1 : 0) + (night ? 1 : 0);

    // Example duration: "3 days" or just "3"
    const daysMatch = duration.match(/\d+/);
    const days = daysMatch ? Number(daysMatch[0]) : 0;

    return perDay * days;
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

  const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
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

  const getReportStatus = (value) => {
    if (!value) return "pending";

    return String(value).trim().toUpperCase() === "PENDING"
      ? "pending"
      : "result out";
  };

  const isTestResultOut = (test) => {
    return getReportStatus(test?.Result_Value) === "result out";
  };

  const isXrayResultOut = (xray) => {
    return !!(xray?.Findings || xray?.Impression || xray?.Remarks);
  };

  const getDiagnosisReportDate = (record) => {
    const latestTest = [...(record?.Tests || [])].sort(
      (a, b) => new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0)
    )[0];

    return latestTest?.Timestamp || record?.updatedAt || record?.createdAt || null;
  };

  const getXrayReportDate = (record) => {
    const latestXray = [...(record?.Xrays || [])].sort(
      (a, b) => new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0)
    )[0];

    return latestXray?.Timestamp || record?.updatedAt || record?.createdAt || null;
  };

  const getMatchingDiagnosisResult = (orderedTest, diagnosisRecords = [], prescriptionTime) => {
    const matches = diagnosisRecords
      .flatMap((record) =>
        (record?.Tests || []).map((test) => ({
          ...test,
          recordId: record?._id
        }))
      )
      .filter((test) => {
        const sameId =
          orderedTest?.Test_ID &&
          test?.Test_ID &&
          String(test.Test_ID?._id || test.Test_ID) === String(orderedTest.Test_ID);

        const sameName =
          (test?.Test_Name || test?.Test_ID?.Test_Name || "").trim().toLowerCase() ===
          (orderedTest?.Test_Name || orderedTest?.Test_ID?.Test_Name || "").trim().toLowerCase();

        const testTime = new Date(test?.Timestamp || 0).getTime();
        const orderTime = new Date(prescriptionTime || 0).getTime();

        return (sameId || sameName) && testTime >= orderTime;
      })
      .sort(
        (a, b) =>
          new Date(a?.Timestamp || 0).getTime() - new Date(b?.Timestamp || 0).getTime()
      );

    return matches[0] || null;
  };

  const getMatchingXrayResult = (orderedXray, xrayRecords = [], prescriptionTime) => {
    const matches = xrayRecords
      .flatMap((record) =>
        (record?.Xrays || []).map((xray) => ({
          ...xray,
          recordId: record?._id
        }))
      )
      .filter((xray) => {
        const sameId =
          orderedXray?.Xray_ID &&
          xray?.Xray_ID &&
          String(xray.Xray_ID?._id || xray.Xray_ID) === String(orderedXray.Xray_ID);

        const sameType =
          (xray?.Xray_Type || "").trim().toLowerCase() ===
          (orderedXray?.Xray_Type || "").trim().toLowerCase();

        const xrayTime = new Date(xray?.Timestamp || 0).getTime();
        const orderTime = new Date(prescriptionTime || 0).getTime();

        return (sameId || sameType) && xrayTime >= orderTime;
      })
      .sort(
        (a, b) =>
          new Date(a?.Timestamp || 0).getTime() - new Date(b?.Timestamp || 0).getTime()
      );

    return matches[0] || null;
  };

  const buildVisitNotes = (visitSummary) => {
    if (!visitSummary) return "";

    const vitals = visitSummary.vitals || {};
    const noteParts = [
      visitSummary.symptoms ? `Symptoms: ${visitSummary.symptoms}` : "",
      vitals.Temperature != null && vitals.Temperature !== ""
        ? `Temperature: ${vitals.Temperature}°F`
        : "",
      vitals.Blood_Pressure
        ? `BP: ${vitals.Blood_Pressure}`
        : "",
      vitals.Pulse != null && vitals.Pulse !== ""
        ? `Pulse: ${vitals.Pulse}`
        : "",
      vitals.Oxygen != null && vitals.Oxygen !== ""
        ? `Oxygen: ${vitals.Oxygen}`
        : "",
      vitals.Sugar != null && vitals.Sugar !== ""
        ? `Sugar: ${vitals.Sugar}`
        : "",
      vitals.GRBS != null && vitals.GRBS !== ""
        ? `GRBS: ${vitals.GRBS}`
        : ""
    ].filter(Boolean);

    return noteParts.join(" | ");
  };

  const actionMatchesSelectedPatient = (action, familyId = null) => {
    const isFamilyAction = action?.data?.IsFamilyMember === true;
    const actionFamilyId = action?.data?.FamilyMember_ID || null;

    if (familyId) {
      return isFamilyAction && String(actionFamilyId) === String(familyId);
    }

    return !isFamilyAction;
  };

  const prescriptionMatchesSelectedPatient = (prescription, familyId = null) => {
    const isFamilyPrescription = prescription?.IsFamilyMember === true;
    const prescriptionFamilyId =
      prescription?.FamilyMember?._id || prescription?.FamilyMember || null;

    if (familyId) {
      return isFamilyPrescription && String(prescriptionFamilyId) === String(familyId);
    }

    return !isFamilyPrescription;
  };

  const getPrescriptionTimestamp = (record) =>
    record?.created_at || record?.Timestamp || record?.createdAt || null;

  const normalizeDoctorMedicine = (medicine) => ({
    ...medicine,
    _source: "Doctor"
  });

  const normalizePharmacyMedicine = (medicine) => ({
    Medicine_Name: medicine?.Medicine_Name || medicine?.Medicine_ID?.Medicine_Name || "",
    Type: medicine?.Type || medicine?.Medicine_ID?.Type || "",
    Dosage_Form: medicine?.Dosage_Form || medicine?.Medicine_ID?.Type || "",
    FoodTiming: medicine?.FoodTiming || "",
    Strength: medicine?.Strength || medicine?.Medicine_ID?.Strength || "",
    Morning: medicine?.Morning ?? "",
    Afternoon: medicine?.Afternoon ?? "",
    Night: medicine?.Night ?? "",
    Duration: medicine?.Duration || "",
    Remarks: medicine?.Remarks || "",
    Quantity: Number(medicine?.Quantity) || 0,
    _source: "Pharmacy"
  });

  const findMatchingPrescriptionReport = (reports, pharmacyRecord) => {
    const visitKey = pharmacyRecord?.visit_id ? String(pharmacyRecord.visit_id) : null;
    if (visitKey) {
      const exactMatch = reports.find(
        (report) => report?.visit_id && String(report.visit_id) === visitKey
      );
      if (exactMatch) return exactMatch;
    }

    const pharmacyTime = new Date(getPrescriptionTimestamp(pharmacyRecord) || 0).getTime();
    const twelveHours = 12 * 60 * 60 * 1000;

    return reports.find((report) => {
      const reportTime = new Date(getPrescriptionTimestamp(report) || 0).getTime();
      if (!reportTime || !pharmacyTime) return false;
      return Math.abs(reportTime - pharmacyTime) <= twelveHours;
    }) || null;
  };

  const getEnrichedPrescriptionHistory = (
    actions = [],
    pharmacyRecords = [],
    diagnosisRecords = [],
    xrayRecords = [],
    familyId = null
  ) => {
    const patientActions = actions.filter((action) =>
      actionMatchesSelectedPatient(action, familyId)
    );
    const patientPharmacyRecords = pharmacyRecords.filter((record) =>
      prescriptionMatchesSelectedPatient(record, familyId)
    );

    const relatedOrdersByVisit = new Map();

    patientActions.forEach((action) => {
      const visitKey = action?.visit_id ? String(action.visit_id) : null;
      if (!visitKey) return;

      if (!relatedOrdersByVisit.has(visitKey)) {
        relatedOrdersByVisit.set(visitKey, {
          tests: [],
          xrays: []
        });
      }

      const visitOrders = relatedOrdersByVisit.get(visitKey);

      if (action?.action_type === "DOCTOR_DIAGNOSIS") {
        visitOrders.tests.push(...(action?.data?.tests || []));
      }

      if (action?.action_type === "DOCTOR_XRAY") {
        visitOrders.xrays.push(...(action?.data?.xrays || []));
      }
    });

    const reports = patientActions
      .filter((action) => action?.action_type === "DOCTOR_PRESCRIPTION")
      .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
      .map((prescription) => {
        const visitKey = prescription?.visit_id ? String(prescription.visit_id) : null;
        const relatedOrders = visitKey
          ? relatedOrdersByVisit.get(visitKey) || { tests: [], xrays: [] }
          : { tests: [], xrays: [] };
        const doctorMedicines = (prescription?.data?.medicines || []).map(normalizeDoctorMedicine);

        return {
          ...prescription,
          combinedMedicines: doctorMedicines,
          doctorNotes: prescription?.data?.notes || "",
          pharmacyNotes: [],
          instituteDisplayName: instituteName || "-",
          relatedTests: relatedOrders.tests.map((test) => ({
            ...test,
            matchedResult: getMatchingDiagnosisResult(
              test,
              diagnosisRecords,
              prescription?.created_at
            )
          })),
          relatedXrays: relatedOrders.xrays.map((xray) => ({
            ...xray,
            matchedResult: getMatchingXrayResult(
              xray,
              xrayRecords,
              prescription?.created_at
            )
          }))
        };
      });

    patientPharmacyRecords.forEach((record) => {
      const matchedReport = findMatchingPrescriptionReport(reports, record);
      const pharmacyMedicines = (record?.Medicines || []).map(normalizePharmacyMedicine);
      const pharmacyNote = String(record?.Notes || "").trim();

      if (matchedReport) {
        matchedReport.combinedMedicines = [
          ...(matchedReport.combinedMedicines || []),
          ...pharmacyMedicines
        ];
        matchedReport.pharmacyNotes = pharmacyNote
          ? [...(matchedReport.pharmacyNotes || []), pharmacyNote]
          : matchedReport.pharmacyNotes || [];
        matchedReport.instituteDisplayName =
          matchedReport.instituteDisplayName ||
          record?.Institute?.Institute_Name ||
          instituteName ||
          "-";
        return;
      }

      const visitKey = record?.visit_id ? String(record.visit_id) : null;
      const relatedOrders = visitKey
        ? relatedOrdersByVisit.get(visitKey) || { tests: [], xrays: [] }
        : { tests: [], xrays: [] };

      reports.push({
        _id: `pharmacy-${record?._id || getPrescriptionTimestamp(record) || Math.random()}`,
        visit_id: record?.visit_id || null,
        created_at: getPrescriptionTimestamp(record),
        data: {
          IsFamilyMember: record?.IsFamilyMember || false,
          FamilyMember_ID: record?.FamilyMember?._id || record?.FamilyMember || null,
          medicines: [],
          notes: ""
        },
        IsFamilyMember: record?.IsFamilyMember || false,
        FamilyMember: record?.FamilyMember || null,
        combinedMedicines: pharmacyMedicines,
        doctorNotes: "",
        pharmacyNotes: pharmacyNote ? [pharmacyNote] : [],
        instituteDisplayName: record?.Institute?.Institute_Name || instituteName || "-",
        relatedTests: relatedOrders.tests.map((test) => ({
          ...test,
          matchedResult: getMatchingDiagnosisResult(
            test,
            diagnosisRecords,
            getPrescriptionTimestamp(record)
          )
        })),
        relatedXrays: relatedOrders.xrays.map((xray) => ({
          ...xray,
          matchedResult: getMatchingXrayResult(
            xray,
            xrayRecords,
            getPrescriptionTimestamp(record)
          )
        }))
      });
    });

    return reports.sort(
      (a, b) => new Date(getPrescriptionTimestamp(b) || 0) - new Date(getPrescriptionTimestamp(a) || 0)
    );
  };

  const getPrescriptionReportForLabel = (prescription) => {
    const isFamilyPrescription =
      prescription?.data?.IsFamilyMember === true || prescription?.IsFamilyMember === true;

    if (isFamilyPrescription) {
      const familyName =
        selectedVisit?.FamilyMember?.Name ||
        prescription?.FamilyMember?.Name ||
        "Family Member";
      const relationship =
        selectedVisit?.FamilyMember?.Relationship ||
        prescription?.FamilyMember?.Relationship;
      return relationship ? `${familyName} (${relationship})` : familyName;
    }

    return selectedEmployee?.Name || employeeProfile?.Name || prescription?.Employee?.Name || "Employee";
  };

  const getPrescriptionMedicines = (prescription) =>
    prescription?.combinedMedicines || prescription?.data?.medicines || [];

  const formatDoseCell = (value) => {
    if (value === true) return "1";
    if (value === false) return "0";
    return value || "-";
  };

  const renderPrescriptionHistoryCard = (prescription, keyPrefix = "prescription") => {
    const medicines = getPrescriptionMedicines(prescription);
    const tests = prescription?.relatedTests || [];
    const xrays = prescription?.relatedXrays || [];
    const medicinesPreview = medicines
      .slice(0, 2)
      .map((medicine) => medicine?.Medicine_Name || "Medicine")
      .join(", ");

    return (
      <div
        key={`${keyPrefix}-${prescription?._id || prescription?.created_at || "item"}`}
        className="border rounded p-3 mb-3 bg-light-subtle"
      >
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div className="fw-semibold">
              {formatDateDMY(getPrescriptionTimestamp(prescription))}
            </div>
            <small className="text-muted">
              {medicines.length} medicine{medicines.length === 1 ? "" : "s"}
            </small>
            {(tests.length > 0 || xrays.length > 0) ? (
              <div className="small text-muted mt-1">
                {tests.length} test{tests.length === 1 ? "" : "s"} • {xrays.length} X-ray{xrays.length === 1 ? "" : "s"}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={() => setSelectedPrescriptionReport(prescription)}
          >
            View Report
          </button>
        </div>

        <div className="small text-muted mt-2">
          {medicinesPreview || "No medicine details available"}
          {medicines.length > 2 ? ` +${medicines.length - 2} more` : ""}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const textarea = notesTextareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [formData.Notes]);

 const loadEmployeeReports = async () => {
  if (!formData.Employee_ID) {
    alert("No employee selected");
    return;
  }


  try {
    const params = {
      isFamily: formData.IsFamilyMember,
      familyId: formData.IsFamilyMember ? formData.FamilyMember_ID : null
    };

    const [diseaseRes, diagnosisRes, xrayRes, doctorPrescriptionRes, pharmacyPrescriptionRes] = await Promise.all([
      axios.get(`${BACKEND_URL}/disease-api/employee/${formData.Employee_ID}`),
      axios.get(`${BACKEND_URL}/diagnosis-api/records/${formData.Employee_ID}`, { params }),
      axios.get(`${BACKEND_URL}/xray-api/records/${formData.Employee_ID}`, { params }),
      axios.get(`${BACKEND_URL}/api/medical-actions/employee/${formData.Employee_ID}`),
      axios.get(`${BACKEND_URL}/prescription-api/employee/${formData.Employee_ID}`)
    ]);

    const allDiseases =
  diseaseData.Category === "Communicable"
    ? cdDiseases
    : ncdDiseases;

    const filteredDiseases = allDiseases.filter((disease) => {
      if (formData.IsFamilyMember) {
        return (
          disease.IsFamilyMember === true &&
          String(disease.FamilyMember_ID?._id || disease.FamilyMember_ID) ===
            String(formData.FamilyMember_ID)
        );
      }

      return disease.IsFamilyMember === false;
    });

    const reportPayload = {
      diseases: filteredDiseases,
      diagnosisRecords: diagnosisRes.data || [],
      xrayRecords: xrayRes.data || [],
      previousPrescriptions: getEnrichedPrescriptionHistory(
        doctorPrescriptionRes.data || [],
        pharmacyPrescriptionRes.data || [],
        diagnosisRes.data || [],
        xrayRes.data || [],
        formData.IsFamilyMember ? formData.FamilyMember_ID : null
      ).slice(0, 5)
    };

    setEmployeeReport(reportPayload);
    setDiseases(filteredDiseases);
    setShowReports(true);

  } catch (err) {
    console.error(err);
    alert("Unable to fetch reports");
  }
};
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/diagnosis-api/tests`)
      .then(res => setTestsMaster(res.data || []))
      .catch(() => setTestsMaster([]));
  }, []);

useEffect(() => {
  axios
    .get(`${BACKEND_URL}/xray-api/types`)
    .then(res => setXrayMaster(mergeXrayTypes(res.data || [])))
    .catch(() => setXrayMaster(mergeXrayTypes([])));
}, []);


  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    const hydrateMedicines = async () => {
      let medicineEntries = [];

      try {
          const instituteId = localStorage.getItem("instituteId") || "";
          const res = await axios.get(`${BACKEND_URL}/master-data-api/medicines-structure`, {
            params: instituteId ? { instituteId } : {}
          });
        const payload = res.data && res.data.data ? res.data.data : res.data || {};
        medicineEntries = Array.isArray(payload?.medicines)
          ? payload.medicines.map((item) => ({
              value_name: item?.value_name,
              medicineType: item?.medicineType,
              dosageForm: item?.dosageForm,
              strength: item?.strength,
              status: item?.status || "Active"
            }))
          : [];
      } catch {
        medicineEntries = getMasterMedicineEntries(masterMap);
      }

      setInventoryMedicines(
        medicineEntries.map((item) => ({
          Medicine_Name: item.value_name,
          Medicine_Type: item.medicineType,
          Dosage_Form: item.dosageForm,
          Strength: item.strength
        }))
      );

      const strengthMap = {};
      medicineEntries.forEach((med) => {
        const name = String(med?.value_name || "").trim();
        const medicineType = String(med?.medicineType || "").trim();
        const dosageForm = String(med?.dosageForm || "").trim();
        const strength = String(med?.strength || "").trim();
        if (!name || !strength) return;

        const strictKey = makeMedicineLookupKey(medicineType, dosageForm, name);
        const typeFallbackKey = makeMedicineLookupKey(medicineType, "", name);
        const fallbackKey = makeMedicineLookupKey("", "", name);
        strengthMap[strictKey] = strengthMap[strictKey] || [];
        if (!strengthMap[strictKey].includes(strength)) {
          strengthMap[strictKey].push(strength);
        }
        strengthMap[typeFallbackKey] = strengthMap[typeFallbackKey] || [];
        if (!strengthMap[typeFallbackKey].includes(strength)) {
          strengthMap[typeFallbackKey].push(strength);
        }
        strengthMap[fallbackKey] = strengthMap[fallbackKey] || [];
        if (!strengthMap[fallbackKey].includes(strength)) {
          strengthMap[fallbackKey].push(strength);
        }
      });

      setMedicineStrengths(strengthMap);
    };

    hydrateMedicines();
  }, [masterMap, BACKEND_URL]);


  useEffect(() => {
    const instituteId = localStorage.getItem("instituteId");
    if (!instituteId) return;

    setFormData((f) => ({ ...f, Institute_ID: instituteId }));
    fetchInstitute(instituteId);
    // fetchEmployees();
    // fetchInventory(instituteId);
  }, []);
  const fetchTopTwoPrescriptions = async (employeeId, familyId = null) => {
    try {
      const params = {
        isFamily: !!familyId,
        familyId: familyId || null
      };

      const [actionsRes, diagnosisRes, xrayRes, pharmacyRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/medical-actions/employee/${employeeId}`),
        axios.get(`${BACKEND_URL}/diagnosis-api/records/${employeeId}`, { params }),
        axios.get(`${BACKEND_URL}/xray-api/records/${employeeId}`, { params }),
        axios.get(`${BACKEND_URL}/prescription-api/employee/${employeeId}`)
      ]);

      const data = getEnrichedPrescriptionHistory(
        actionsRes.data || [],
        pharmacyRes.data || [],
        diagnosisRes.data || [],
        xrayRes.data || [],
        familyId
      );
      setLastTwoVisits(data.slice(0, 2));

    } catch (err) {
      console.error(err);
      setLastTwoVisits([]);
    }
  };
  /* ================= API CALLS ================= */
  const fetchInstitute = async (id) => {
    const res = await axios.get(`${BACKEND_URL}/institute-api/institution/${id}`);
    setInstituteName(res.data?.Institute_Name || "");
  };


  const fetchDiseases = async (employeeId) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/disease-api/employee/${employeeId}`);
      setDiseases(reportRes.data.employeeDiseases);
    } catch {
      setDiseases([]);
    }
  };


  useEffect(() => {
    if (!formData.Employee_ID) return;

    axios
      .get(`${BACKEND_URL}/employee-api/profile/${formData.Employee_ID}`)
      .then((res) => setEmployeeProfile(res.data))
      .catch(() => setEmployeeProfile(null));
  }, [formData.Employee_ID]);

  useEffect(() => {
    const instituteId = localStorage.getItem("instituteId") || "";

    const loadDiseaseMasters = async () => {
      const normalizeRows = (rows) =>
        (Array.isArray(rows) ? rows : [])
          .map((item) => (typeof item === "string" ? { name: item } : item))
          .filter((item) => item?.name)
          .map((item) => ({
            ...item,
            name: String(item.name).trim()
          }));

      const dedupeByName = (rows) => {
        const seen = new Set();
        return rows.filter((item) => {
          const key = String(item?.name || "").trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      try {
        const [cdRes, ncdRes, masterMap] = await Promise.all([
          axios.get(`${BACKEND_URL}/disease-master-api/cd`, { params: { instituteId } }).catch(() => ({ data: [] })),
          axios.get(`${BACKEND_URL}/disease-master-api/ncd`, { params: { instituteId } }).catch(() => ({ data: [] })),
          fetchMasterDataMap({ force: true }).catch(() => ({}))
        ]);

        setMasterMap(masterMap || {});

        const customDiseases = Array.isArray(masterMap?.Diseases) ? masterMap.Diseases : [];
        const customCd = customDiseases
          .filter((item) => item?.meta?.kind === "disease" && item?.meta?.group === "Communicable")
          .map((item) => ({ name: item.value_name, type: "Custom" }));
        const customNcd = customDiseases
          .filter((item) => item?.meta?.kind === "disease" && item?.meta?.group === "Non-Communicable")
          .map((item) => ({ name: item.value_name, type: "Custom" }));

        setCdDiseases(dedupeByName([...normalizeRows(cdRes.data), ...normalizeRows(customCd)]));
        setNcdDiseases(dedupeByName([...normalizeRows(ncdRes.data), ...normalizeRows(customNcd)]));
      } catch {
        setMasterMap({});
        setCdDiseases([]);
        setNcdDiseases([]);
      }
    };

    loadDiseaseMasters();
  }, []);

  const allDiseases = [...cdDiseases, ...ncdDiseases];

  useEffect(() => {
  const source =
    diseaseData.Category === "Communicable"
      ? cdDiseases
      : ncdDiseases;

  // If no search term, show all diseases in alphabetical order
  if (!diseaseSearch.trim()) {
    const sorted = [...source].sort((a, b) => 
      (a.name || "").localeCompare(b.name || "")
    );
    setFilteredDiseases(sorted); // Show all diseases, not just 5
    return;
  }

  // Otherwise filter based on search
  const search = diseaseSearch.toLowerCase();

  const filtered = source.filter(d => {
    return (
      d.name?.toLowerCase().includes(search) ||
      d.type?.toLowerCase().includes(search) ||
      d.subgroup?.toLowerCase().includes(search)
    );
  });

  setFilteredDiseases(filtered.slice(0, 20));

}, [diseaseSearch, cdDiseases, ncdDiseases, diseaseData.Category]);


  /* ================= DISEASE FILTER ================= */
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

const relevantDiseases = diseases.filter((d) => {
  if (formData.IsFamilyMember) {
    return (
      d.IsFamilyMember === true &&
      String(d.FamilyMember_ID) === String(formData.FamilyMember_ID)
    );
  }

  return d.IsFamilyMember === false;
});

  const communicableRecent = relevantDiseases.filter(
    (d) =>
      d.Category === "Communicable" &&
      new Date(d.createdAt) >= twoMonthsAgo
  );

  const addMedicine = () =>
    setFormData((prev) => ({
      ...prev,
      Medicines: [
        ...prev.Medicines,
        { Medicine_Name: "", Medicine_Type: "", Dosage_Form: "", Type: "", FoodTiming: "", Strength: "", Morning: false, Afternoon: false, Night: false, Duration: "", Remarks: "", Quantity: 0, _uid: `${Date.now()}-${Math.random().toString(36).slice(2,8)}` }
      ]
    }));

  const removeMedicine = (index) =>
    setFormData((prev) => ({
      ...prev,
      Medicines: prev.Medicines.filter((_, i) => i !== index)
    }));


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



    const selectedMedicines = formData.Medicines
      .filter((med) => med.Medicine_Name?.trim())
      .map((med) => ({
        Medicine_Name: med.Medicine_Name,
        Type: med.Medicine_Type || med.Type,
        Dosage_Form: med.Dosage_Form || "",
        FoodTiming: med.FoodTiming,
        Strength: med.Strength,
        Morning: med.Morning,
        Afternoon: med.Afternoon,
        Night: med.Night,
        Duration: med.Duration,
        Remarks: med.Remarks,
        Quantity: med.Quantity
      }));

    // Removed validation - allow custom medicine names
    // for (let med of selectedMedicines) {
    //   if (!uniqueMedicines.includes(med.Medicine_Name)) {
    //     alert("Invalid medicine selected. Please choose from list.");
    //     return;
    //   }
    // }

    // Medicines are now optional - removed validation
    
    await axios.post(`${BACKEND_URL}/api/medical-actions`, {
      Institute_ID: formData.Institute_ID,
      employee_id: formData.Employee_ID,
      visit_id: formData.visit_id || null,
      action_type: "DOCTOR_PRESCRIPTION",
      source: "DOCTOR",
      data: {
        IsFamilyMember: formData.IsFamilyMember,
        FamilyMember_ID: formData.IsFamilyMember
          ? formData.FamilyMember_ID
          : null,
          medicines: selectedMedicines.map(m => ({
            Medicine_Name: m.Medicine_Name,
            Type: m.Type,
            Dosage_Form: m.Dosage_Form || "",
            FoodTiming: m.FoodTiming,
            Strength: m.Strength,
            Morning: m.Morning,
            Afternoon: m.Afternoon,
            Night: m.Night,
            Duration: m.Duration,
            Remarks: m.Remarks,
            Quantity: m.Quantity
          })),
        notes: formData.Notes
      }
    });

    await fetchTopTwoPrescriptions(
      formData.Employee_ID,
      formData.IsFamilyMember ? formData.FamilyMember_ID : null
    );

    if (showReports) {
      await loadEmployeeReports();
    }

    // ✅ Save Disease (if selected)
    if (diseaseData.Disease_Name?.trim()) {
        await axios.post(
      `${BACKEND_URL}/disease-api/diseases`,
  {
    Institute_ID: formData.Institute_ID,
    Employee_ID: formData.Employee_ID,
    IsFamilyMember: formData.IsFamilyMember,
    FamilyMember_ID: formData.IsFamilyMember
      ? formData.FamilyMember_ID
      : null,
    Disease_Name: diseaseData.Disease_Name,
    Category: diseaseData.Category,
    Description: "",
    Symptoms: [],
    Common_Medicines: [],
    Severity_Level: diseaseData.Severity_Level,
    Notes: formData.Notes
  }
);

    }


    alert("✅ Prescription saved successfully");
    
    // Reset all form fields
    setFormData({
      Institute_ID: formData.Institute_ID,
      Employee_ID: "",
      IsFamilyMember: false,
      FamilyMember_ID: "",
      Medicines: [{ Medicine_Name: "", Type: "", FoodTiming: "", Strength: "", Morning: false, Afternoon: false, Night: false, Duration: "", Remarks: "", Quantity: 0 }],
      Notes: "",
      Disease_Name: ""
    });
    
    setDiseaseData({
      Category: "Communicable",
      Disease_Name: "",
      Severity_Level: "Mild"
    });
    
    setDiagnosisData({
      Tests: [{ Category: "", Test_ID: "", Test_Name: "" }]
    });
    
    setXrayData({
      Xrays: [{ Xray_ID: "", Xray_Type: "" }]
    });
    
    setSelectedEmployee(null);
    setLastTwoVisits([]);
    setSelectedVisit(null);
    setEmployeeProfile(null);
    setDiseases([]);
    setVisitId(null);
    setSelectedDiagnosisReport(null);
    setSelectedXrayReport(null);
    setSelectedPrescriptionReport(null);
    setDiseaseSearch("");
    setFilteredDiseases([]);
    setSelectedType("");
    setSelectedSubgroup("");
    
    // Reset PatientSelector component by changing key
    setPatientSelectorKey(prev => prev + 1);
    
    if (notesTextareaRef.current) {
      notesTextareaRef.current.value = "";
    }
  };




  const handleDiagnosisSubmit = async () => {
    if (!formData.Employee_ID) {
      alert("Please select employee first");
      return;
    }

  const validTests = diagnosisData.Tests.filter(t => t.Test_ID || t.Test_Name);

if (validTests.length === 0) {
  alert("Please select at least one test");
  return;
}
    await axios.post(`${BACKEND_URL}/api/medical-actions`, {
      employee_id: formData.Employee_ID,
      visit_id: formData.visit_id || null,
      action_type: "DOCTOR_DIAGNOSIS",
      source: "DOCTOR",
      data: {
        Institute_ID: formData.Institute_ID,
        IsFamilyMember: formData.IsFamilyMember,
        FamilyMember_ID: formData.IsFamilyMember
          ? formData.FamilyMember_ID
          : null,
        tests: diagnosisData.Tests,
        notes: formData.Notes   // 🔥 SAME NOTES USED
      }
    });

    alert("✅ Diagnosis saved successfully");

    setDiagnosisData({
      Tests: [{ Category: "", Test_ID: "", Test_Name: "" }]
    });
  };

const handleXraySubmit = async () => {
  if (!formData.Employee_ID) {
    alert("Please select employee first");
    return;
  }

 const validXrays = xrayData.Xrays.filter(x => x.Xray_ID);

if (validXrays.length === 0) {
  alert("Please select at least one X-ray");
  return;
}

  await axios.post(
  `${BACKEND_URL}/api/medical-actions`,
    {
      employee_id: formData.Employee_ID,
      visit_id: formData.visit_id || null,
      action_type: "DOCTOR_XRAY",
      source: "DOCTOR",
      data: {
        Institute_ID: formData.Institute_ID,
        IsFamilyMember: formData.IsFamilyMember,
        FamilyMember_ID: formData.IsFamilyMember
          ? formData.FamilyMember_ID
          : null,
        xrays: xrayData.Xrays,
        notes: formData.Notes
      }
    }
  );

  alert("✅ X-ray order saved");

  setXrayData({
    Xrays: [{ Xray_ID: "", Xray_Type: "" }]
  });
};


  /* ================= UI ================= */
  return (

    <div className="container-fluid mt-1">
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
      <div className="row justify-content-center">
        {/* ================= LEFT REPORTS ================= */}
        {showReports && (
          <div className="col-lg-3 mb-3">
            <div className="card shadow border-0 h-100">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <strong>Employee Reports</strong>

                {/* 🔥 Cancel Button */}
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
                  <h6 className="fw-bold text-dark mb-3">Previous Prescriptions</h6>

{(() => {
  const previousPrescriptions = employeeReport?.previousPrescriptions || [];

  return previousPrescriptions.length > 0 ? (
    previousPrescriptions.map((prescription, index) =>
      renderPrescriptionHistoryCard(prescription, `report-panel-${index}`)
    )
  ) : (
    <div className="text-muted">No previous prescriptions available</div>
  );
})()}

                  <hr className="my-4" />

 <h6 className="fw-bold text-dark mb-3">Recent Tests</h6>

{(() => {
  const diagnosisRecords = employeeReport?.diagnosisRecords || [];
  const recentTests = diagnosisRecords
    .flatMap(record =>
      (record?.Tests || []).map((test, index) => ({
        key: `${record._id}-${test.Test_ID?._id || test.Test_ID || index}`,
        record,
        test,
        reportDate: test?.Timestamp || getDiagnosisReportDate(record)
      }))
    )
    .sort(
      (a, b) => new Date(b.reportDate || 0) - new Date(a.reportDate || 0)
    )
    .slice(0, 5);

  return recentTests.length > 0 ? (
    recentTests.map(({ key, record, test, reportDate }) => {
      const status = getReportStatus(test?.Result_Value);
      const visitNotes = buildVisitNotes(record?.visitSummary);

      return (
        <div key={key} className="border-bottom pb-2 mb-3">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div className="fw-semibold">
                {test?.Test_Name || test?.Test_ID?.Test_Name || "Unknown Test"}
              </div>
              <small className="text-muted">
                {formatDateDMY(reportDate)}
              </small>
            </div>
            <span className={`badge ${status === "result out" ? "bg-success" : "bg-warning text-dark"}`}>
              {status}
            </span>
          </div>

          <div className="small mt-2">
            Result: {status === "result out" ? `${test?.Result_Value || "-"} ${test?.Units || test?.Test_ID?.Units || ""}`.trim() : "Pending"}
          </div>

          {visitNotes && (
            <div className="small text-muted mt-1">
              Notes: {visitNotes}
            </div>
          )}

          {test?.Reports && test.Reports.length > 0 ? (
            test.Reports.map((r, ri) => {
              const url = resolveUrl(r.url);
              return (
                <a
                  key={ri}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-dark mt-2 me-2"
                >
                  View Report
                </a>
              );
            })
          ) : (
            <button
              className="btn btn-sm btn-outline-secondary mt-2"
              disabled
            >
              No Report
            </button>
          )}
        </div>
      );
    })
  ) : (
    <div className="text-muted">No tests available</div>
  );
})()}

                  <hr className="my-4" />

                  <h6 className="fw-bold text-dark mb-3">Recent X-rays</h6>

{(() => {
  const xrayRecords = employeeReport?.xrayRecords || [];
  const recentXrays = xrayRecords
    .flatMap(record =>
      (record?.Xrays || []).map((xray, index) => ({
        key: `${record._id}-${xray.Xray_ID || xray.Xray_Type || index}`,
        record,
        xray,
        reportDate: xray?.Timestamp || getXrayReportDate(record)
      }))
    )
    .sort(
      (a, b) => new Date(b.reportDate || 0) - new Date(a.reportDate || 0)
    )
    .filter(({ xray }) => {
      // only show xrays where results are out
      const status = xray?.Findings || xray?.Impression || xray?.Remarks ? "result out" : "pending";
      return status === "result out";
    })
    .slice(0, 5);

  return recentXrays.length > 0 ? (
    recentXrays.map(({ key, record, xray, reportDate }) => {
      const status =
        xray?.Findings || xray?.Impression || xray?.Remarks
          ? "result out"
          : "pending";

      return (
        <div key={key} className="border-bottom pb-2 mb-3">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div className="fw-semibold">
                {xray?.Xray_Type || "X-ray"}
              </div>
              <small className="text-muted">
                {formatDateDMY(reportDate)}
              </small>
            </div>
            <span className={`badge ${status === "result out" ? "bg-success" : "bg-warning text-dark"}`}>
              {status}
            </span>
          </div>

          <div className="small mt-2">
            {xray?.Body_Part || "Body part not available"}
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-dark mt-2"
            disabled={status !== "result out"}
            onClick={() => {
              // remove any other modal elements from the DOM so they don't appear behind
              try {
                document.querySelectorAll('.modal').forEach(el => {
                  el.remove();
                });
              } catch (e) {
                // ignore
              }
              setSelectedXrayReport({ record, xray });
            }}
          >
            View
          </button>
        </div>
      );
    })
  ) : (
    <div className="text-muted">No X-rays available</div>
  );
})()}

                  <hr className="my-4" />

                  <h6 className="fw-bold text-dark mb-3">Diseases</h6>

                  {(() => {
                    const allDiseases = employeeReport?.diseases || [];

                    const twoWeeksAgo = new Date();
                    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

                    const nonCommunicable = allDiseases.filter(
                      d => d.Category === "Non-Communicable"
                    );

                    const communicableRecent = allDiseases.filter(
                      d =>
                        d.Category === "Communicable" &&
                        new Date(d.createdAt) >= twoWeeksAgo
                    );

                    return (
                      <>
                        {nonCommunicable.map((d, index) => (
                          <div key={`nc-${index}`} className="border-bottom pb-2 mb-2">
                            <div className="fw-semibold text-secondary">
                              {d.Disease_Name}
                            </div>
                            <small className="text-muted">
                              {new Date(d.createdAt).toLocaleDateString("en-GB")}
                            </small>
                            <div>
                              <span className="badge bg-info mt-1">
                                {d.Severity_Level}
                              </span>
                            </div>
                          </div>
                        ))}

                        {communicableRecent.map((d, index) => (
                          <div key={`c-${index}`} className="border-bottom pb-2 mb-2">
                            <div className="fw-semibold text-danger">
                              {d.Disease_Name}
                            </div>
                            <small className="text-muted">
                              {new Date(d.createdAt).toLocaleDateString("en-GB")}
                            </small>
                            <div>
                              <span className="badge bg-danger mt-1">
                                {d.Severity_Level}
                              </span>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>

            </div>
          </div>
        )}

          {/* X-ray single-item modal */}
          {selectedXrayReport && (
            <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 2050 }}>
              <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ zIndex: 2060, maxWidth: '90%' }}>
                <div className="modal-content">
                  <div className="modal-header bg-primary text-white">
                    <h5 className="modal-title">X‑ray Detail</h5>
                    <button className="btn-close btn-close-white" onClick={() => setSelectedXrayReport(null)} />
                  </div>

                  <div className="modal-body">
                    {(() => {
                      const { record, xray } = selectedXrayReport;
                      const status = xray?.Findings || xray?.Impression || xray?.Remarks ? "result out" : "pending";

                      return (
                        <>
                          <p><strong>Employee:</strong> {record?.Employee?.Name}</p>
                          <p><strong>Report For:</strong> {record?.IsFamilyMember ? `${record?.FamilyMember?.Name} (${record?.FamilyMember?.Relationship})` : 'Self'}</p>
                          <p><strong>Institute:</strong> {record?.Institute?.Institute_Name || ''}</p>
                          <p><strong>Date:</strong> {formatDateDMY(xray?.Timestamp || getXrayReportDate(record))}</p>

                          <hr />

                          <table className="table table-bordered">
                            <thead className="table-light">
                              <tr>
                                <th>Type</th>
                                <th>Body Part</th>
                                <th>Side</th>
                                <th>View</th>
                                <th>Size</th>
                                <th>Findings</th>
                                <th>Impression</th>
                                <th>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>{xray?.Xray_Type || '-'}</td>
                                <td>{xray?.Body_Part || '-'}</td>
                                <td>{xray?.Side || '-'}</td>
                                <td>{xray?.View || '-'}</td>
                                <td>{xray?.Film_Size || '-'}</td>
                                <td>{xray?.Findings || '-'}</td>
                                <td>{xray?.Impression || '-'}</td>
                                <td>{xray?.Remarks || '-'}</td>
                              </tr>
                            </tbody>
                          </table>

                          <div className="mt-3">
                            {/* Show report links only when results are out and report exists */}
                            {status === 'result out' && xray?.Reports && xray.Reports.length > 0 ? (
                              xray.Reports.map((r, idx) => (
                                <div key={idx} className="mb-2 d-flex align-items-center gap-2">
                                  <div className="flex-grow-1">{r?.originalname || r?.filename}</div>
                                  <button className="btn btn-sm btn-outline-primary" onClick={async () => {
                                    try {
                                      // open report in new tab
                                      const url = resolveUrl(r.url);
                                      if (url) window.open(url, '_blank');
                                      else throw new Error('No URL');
                                    } catch (err) {
                                      console.error(err);
                                      alert('Unable to open report');
                                    }
                                  }}>View</button>
                                  <a className="btn btn-sm btn-outline-secondary" href={resolveUrl(r.url)} download>Download</a>
                                </div>
                              ))
                            ) : (
                              <div className="text-muted">No report file available.</div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setSelectedXrayReport(null)}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedPrescriptionReport && (
            <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 2050 }}>
              <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ zIndex: 2060 }}>
                <div className="modal-content">
                  <div className="modal-header bg-dark text-white">
                    <h5 className="modal-title">Prescription Report</h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setSelectedPrescriptionReport(null)}
                    />
                  </div>

                  <div className="modal-body">
                    {(() => {
                      const medicines = getPrescriptionMedicines(selectedPrescriptionReport);
                      const tests = selectedPrescriptionReport?.relatedTests || [];
                      const xrays = selectedPrescriptionReport?.relatedXrays || [];
                      const pharmacyNotes = selectedPrescriptionReport?.pharmacyNotes || [];

                      return (
                        <>
                          <div className="row g-3 mb-3">
                            <div className="col-md-6">
                              <strong>Patient:</strong> {getPrescriptionReportForLabel(selectedPrescriptionReport)}
                            </div>
                            <div className="col-md-6 text-md-end">
                              <strong>Date:</strong> {formatDateTime(getPrescriptionTimestamp(selectedPrescriptionReport))}
                            </div>
                            <div className="col-md-6">
                              <strong>Institute:</strong> {selectedPrescriptionReport?.instituteDisplayName || instituteName || "-"}
                            </div>
                            <div className="col-md-6 text-md-end">
                              <strong>ABS No:</strong> {selectedEmployee?.ABS_NO || employeeProfile?.ABS_NO || "-"}
                            </div>
                          </div>

                          <div className="table-responsive">
                            <table className="table table-bordered align-middle">
                              <thead className="table-light">
                                <tr>
                                  <th>#</th>
                                  <th>Medicine</th>
                                  <th>Source</th>
                                  <th>Type</th>
                                  <th>Food Timing</th>
                                  <th>Strength</th>
                                  <th>Morning</th>
                                  <th>Afternoon</th>
                                  <th>Night</th>
                                  <th>Duration</th>
                                  <th>Quantity</th>
                                  <th>Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {medicines.length > 0 ? (
                                  medicines.map((medicine, index) => (
                                    <tr key={`${medicine?.Medicine_Name || "medicine"}-${index}`}>
                                      <td>{index + 1}</td>
                                      <td>{medicine?.Medicine_Name || "-"}</td>
                                      <td>
                                        <span className={`badge ${medicine?._source === "Pharmacy" ? "bg-info text-dark" : "bg-secondary"}`}>
                                          {medicine?._source || "Doctor"}
                                        </span>
                                      </td>
                                      <td>{medicine?.Type || "-"}</td>
                                      <td>{medicine?.FoodTiming || "-"}</td>
                                      <td>{medicine?.Strength || "-"}</td>
                                      <td>{formatDoseCell(medicine?.Morning)}</td>
                                      <td>{formatDoseCell(medicine?.Afternoon)}</td>
                                      <td>{formatDoseCell(medicine?.Night)}</td>
                                      <td>{medicine?.Duration || "-"}</td>
                                      <td>{medicine?.Quantity || "-"}</td>
                                      <td>{medicine?.Remarks || "-"}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="12" className="text-center text-muted">
                                      No medicine details available
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className="row g-3 mt-1">
                            <div className="col-md-6">
                              <div className="border rounded h-100 p-3 bg-light">
                                <div className="fw-semibold mb-2">Tests Prescribed</div>
                                {tests.length > 0 ? (
                                  <div className="table-responsive">
                                    <table className="table table-sm align-middle mb-0">
                                      <thead>
                                        <tr>
                                          <th>Test</th>
                                          <th>Status</th>
                                          <th className="text-end">Report</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tests.map((test, index) => {
                                          const result = test?.matchedResult;
                                          const canView =
                                            isTestResultOut(result) &&
                                            Array.isArray(result?.Reports) &&
                                            result.Reports.length > 0;

                                          return (
                                            <tr key={`${test?.Test_ID || test?.Test_Name || "test"}-${index}`}>
                                              <td>{test?.Test_Name || test?.Test_ID?.Test_Name || "Test"}</td>
                                              <td>
                                                <span className={`badge ${isTestResultOut(result) ? "bg-success" : "bg-warning text-dark"}`}>
                                                  {isTestResultOut(result) ? "result out" : "pending"}
                                                </span>
                                              </td>
                                              <td className="text-end">
                                                {canView ? (
                                                  <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => {
                                                      const url = resolveUrl(result?.Reports?.[0]?.url);
                                                      if (url) {
                                                        window.open(url, "_blank");
                                                      }
                                                    }}
                                                  >
                                                    View
                                                  </button>
                                                ) : (
                                                  <span className="text-muted small">Not available</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-muted small">No tests prescribed</div>
                                )}
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="border rounded h-100 p-3 bg-light">
                                <div className="fw-semibold mb-2">X-rays Prescribed</div>
                                {xrays.length > 0 ? (
                                  <div className="table-responsive">
                                    <table className="table table-sm align-middle mb-0">
                                      <thead>
                                        <tr>
                                          <th>X-ray</th>
                                          <th>Status</th>
                                          <th className="text-end">Report</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {xrays.map((xray, index) => {
                                          const result = xray?.matchedResult;
                                          const canView =
                                            isXrayResultOut(result) &&
                                            Array.isArray(result?.Reports) &&
                                            result.Reports.length > 0;

                                          return (
                                            <tr key={`${xray?.Xray_ID || xray?.Xray_Type || "xray"}-${index}`}>
                                              <td>
                                                {xray?.Xray_Type || "X-ray"}
                                                {xray?.Body_Part ? ` (${xray.Body_Part})` : ""}
                                              </td>
                                              <td>
                                                <span className={`badge ${isXrayResultOut(result) ? "bg-success" : "bg-warning text-dark"}`}>
                                                  {isXrayResultOut(result) ? "result out" : "pending"}
                                                </span>
                                              </td>
                                              <td className="text-end">
                                                {canView ? (
                                                  <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => {
                                                      const url = resolveUrl(result?.Reports?.[0]?.url);
                                                      if (url) {
                                                        window.open(url, "_blank");
                                                      }
                                                    }}
                                                  >
                                                    View
                                                  </button>
                                                ) : (
                                                  <span className="text-muted small">Not available</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-muted small">No X-rays prescribed</div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3">
                            <strong>Doctor Notes</strong>
                            <div className="border rounded p-3 bg-light mt-2" style={{ whiteSpace: "pre-wrap" }}>
                              {selectedPrescriptionReport?.doctorNotes || selectedPrescriptionReport?.data?.notes || "No notes added"}
                            </div>
                          </div>

                          <div className="mt-3">
                            <strong>Pharmacy Notes</strong>
                            <div className="border rounded p-3 bg-light mt-2" style={{ whiteSpace: "pre-wrap" }}>
                              {pharmacyNotes.length > 0 ? pharmacyNotes.join("\n\n") : "No pharmacy notes added"}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedPrescriptionReport(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* FORM */}
        <div
            className={`mb-3 ${
              showReports ? "col-lg-6" : "col-lg-9"
            }`}
            style={{ transition: "all 0.4s ease" }}
          >

          <div className="card shadow border-0">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Doctor Prescription</h5>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Institute</label>
                  <input className="form-control" value={instituteName} readOnly />
                </div>


                <PatientSelector
                  key={patientSelectorKey}
                  instituteId={formData.Institute_ID}
                  onSelect={async ({ employee, visit }) => {

                    setSelectedEmployee(employee);
                    setSelectedVisit(visit);
                    const isFamily = visit?.IsFamilyMember || false;
                    const familyId = visit?.FamilyMember?._id || null;

                    setFormData(prev => ({
                      ...prev,
                      Employee_ID: employee._id,
                      visit_id: visit?._id || null,
                      IsFamilyMember: isFamily,
                      FamilyMember_ID: familyId
                    }));

                    // 🔥 AUTO NOTES
                    if (visit) {
                      const vitals = visit.Vitals || {};

                      const autoNotes = `
                Symptoms: ${visit.symptoms || "-"}

                Vitals:
                Temperature: ${vitals.Temperature || "-"}°F
                BP: ${vitals.Blood_Pressure || "-"}
                Pulse: ${vitals.Pulse || "-"}
                Oxygen: ${vitals.Oxygen || "-"}
                GRBS: ${vitals.GRBS || "-"}
                      `;

                      setFormData(prev => ({
                        ...prev,
                        Notes: autoNotes
                      }));
                    }

                    // 🔥 FETCH HISTORY AND CHECK FOR EXISTING PRESCRIPTION
                    try {
                      // Fetch all medical actions for this employee
                      const actionsRes = await axios.get(`${BACKEND_URL}/api/medical-actions/employee/${employee._id}`);
                      const actions = actionsRes.data || [];
                      
                      // Filter to get prescriptions for this specific visit
                      const existingPrescription = actions.find(action => 
                        action.action_type === "DOCTOR_PRESCRIPTION" && 
                        action.visit_id === visit?._id &&
                        (isFamily ? action.data?.FamilyMember_ID === familyId : !action.data?.FamilyMember_ID)
                      );

                      if (existingPrescription && existingPrescription.data) {
                        // Pre-fill form with existing prescription data
                        const prescriptionData = existingPrescription.data;
                        
                        setFormData(prev => ({
                          ...prev,
                          Medicines: prescriptionData.medicines && prescriptionData.medicines.length > 0
                            ? prescriptionData.medicines.map(med => ({
                                Medicine_Name: med.Medicine_Name || "",
                                Medicine_Type: med.Medicine_Type || med.Type || "",
                                Dosage_Form: med.Dosage_Form || "",
                                Type: med.Medicine_Type || med.Type || "",
                                FoodTiming: med.FoodTiming || "",
                                Strength: med.Strength || "",
                                Morning: med.Morning || false,
                                Afternoon: med.Afternoon || false,
                                Night: med.Night || false,
                                Duration: med.Duration || "",
                                Remarks: med.Remarks || "",
                                Quantity: med.Quantity || 0
                              }))
                            : [{ Medicine_Name: "", Medicine_Type: "", Dosage_Form: "", Type: "", FoodTiming: "", Strength: "", Morning: false, Afternoon: false, Night: false, Duration: "", Remarks: "", Quantity: 0 }],
                          Notes: prescriptionData.notes || prev.Notes
                        }));
                      }
                    } catch (err) {
                      console.error("Error loading existing prescription:", err);
                    }

                    // Fetch prescription history for sidebar
                    fetchTopTwoPrescriptions(employee._id, familyId);
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
                      onClick={loadEmployeeReports}
                    >
                      View Reports
                    </button>
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

                <h6 className="fw-bold" style={{ marginTop: "20px" }}>Disease</h6>

<div className="row g-3 mt-2">

  {/* Category */}
  <div className="col-md-4">
    <label className="form-label fw-semibold">Category</label>
    <select
      className="form-select"
      value={diseaseData.Category}
      onChange={(e) => {
        setDiseaseData(prev => ({
          ...prev,
          Category: e.target.value,
          Disease_Name: ""
        }));
        setShowOtherDiseaseInput(false);
      }}
    >
      {diseaseCategoryOptions.map((item) => (
        <option key={item} value={item}>{item}</option>
      ))}
    </select>
  </div>

  {/* Disease Name */}
  <div className="col-md-4">
  <label className="form-label fw-semibold">Disease Name</label>

  <div className="position-relative">

    {/* ✅ INPUT FIELD (YOU MISSED THIS) */}
    <input
      type="text"
      className="form-control"
      placeholder="Search disease..."
      value={diseaseSearch}
      onChange={(e) => {
        setDiseaseSearch(e.target.value);
      }}
      onFocus={() => setShowDiseaseDropdown(true)}
      onBlur={() => {
        // Delay hiding to allow click on dropdown items
        setTimeout(() => setShowDiseaseDropdown(false), 200);
      }}
    />

    {/* ✅ SUGGESTIONS */}
    {showDiseaseDropdown && filteredDiseases.length > 0 && (
      <ul
        className="list-group position-absolute w-100"
        style={{ zIndex: 1000, maxHeight: "200px", overflowY: "auto" }}
      >
        {filteredDiseases.map((d, i) => (
          <li
            key={i}
            className="list-group-item list-group-item-action"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setDiseaseSearch(d.name);
              setDiseaseData(prev => ({
                ...prev,
                Disease_Name: d.name
              }));
              setFilteredDiseases([]);
              setShowDiseaseDropdown(false);
            }}
          >
            {/* 🔥 FINAL FORMAT */}
            {d.subgroup
              ? `${d.type} - ${d.subgroup} - ${d.name}`
              : `${d.type} - ${d.name}`}
          </li>
        ))}
      </ul>
    )}

  </div>
</div>

  {/* Severity */}
  <div className="col-md-4">
    <label className="form-label fw-semibold">Severity</label>
    <select
      className="form-select"
      value={diseaseData.Severity_Level}
      onChange={(e) =>
        setDiseaseData(prev => ({
          ...prev,
          Severity_Level: e.target.value
        }))
      }
    >
      {effectiveDiseaseSeverityOptions.map((item) => (
        <option key={item} value={item}>{item}</option>
      ))}
    </select>
  </div>
</div>

{/* Other Disease Input */}
{showOtherDiseaseInput && (
  <div className="mt-3">
    <input
      className="form-control"
      placeholder="Enter disease name"
      value={diseaseData.Disease_Name}
      onChange={(e) =>
        setDiseaseData(prev => ({
          ...prev,
          Disease_Name: e.target.value
        }))
      }
    />
  </div>
)}

                <div className="mt-3">
                  <label className="form-label fw-semibold">Notes</label>
                  <textarea
                    ref={notesTextareaRef}
                    className="form-control"
                    rows="6"
                    value={formData.Notes}
                    style={{ minHeight: "160px", resize: "none", overflow: "hidden" }}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, Notes: e.target.value }))
                    }
                  />
                </div>

                <h6 className="fw-bold mt-4">Medicines</h6>

                {formData.Medicines.map((med, i) => (
      <div key={med._uid || i} className="mb-4 border rounded p-3 bg-light">
        {/* First Row: Medicine Selection */}
        <div className="row g-2 align-items-end mb-3">
          <div className="col-md-2">
            <label className="form-label fw-semibold">Medicine Type</label>
            <select
              className="form-select"
              value={med.Medicine_Type}
              onChange={(e) => {
                const copy = [...formData.Medicines];
                copy[i].Medicine_Type = e.target.value;
                copy[i].Type = e.target.value;
                copy[i].Dosage_Form = "";
                const allowedMedicines = getMedicineOptionsByType(copy[i].Medicine_Type, copy[i].Dosage_Form);
                if (!allowedMedicines.includes(copy[i].Medicine_Name)) {
                  copy[i].Medicine_Name = "";
                  copy[i].Strength = "";
                }
                setFormData(prev => ({ ...prev, Medicines: copy }));
              }}
            >
              <option value="">Select Type</option>
              {medicineTypeOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label fw-semibold">Dosage Form</label>
            <select
              className="form-select"
              value={med.Dosage_Form}
              disabled={!med.Medicine_Type}
              onChange={(e) => {
                const copy = [...formData.Medicines];
                copy[i].Dosage_Form = e.target.value;
                const allowedMedicines = getMedicineOptionsByType(copy[i].Medicine_Type, copy[i].Dosage_Form);
                if (!allowedMedicines.includes(copy[i].Medicine_Name)) {
                  copy[i].Medicine_Name = "";
                  copy[i].Strength = "";
                }
                setFormData(prev => ({ ...prev, Medicines: copy }));
              }}
            >
              <option value="">{med.Medicine_Type ? "Select Dosage Form" : "Select Medicine Type First"}</option>
              {dosageFormOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label fw-semibold">Medicine</label>
            <select
              className="form-select"
              value={med.Medicine_Name}
              disabled={!med.Medicine_Type}
              onChange={(e) => {
                const copy = [...formData.Medicines];
                copy[i].Medicine_Name = e.target.value;
                if (!getStrengthOptions(e.target.value, copy[i].Medicine_Type, copy[i].Dosage_Form).includes(copy[i].Strength)) {
                  copy[i].Strength = "";
                }
                setFormData(prev => ({ ...prev, Medicines: copy }));
              }}
            >
              <option value="">{med.Medicine_Type ? "Select Medicine" : "Select Medicine Type First"}</option>
              {getMedicineOptionsByType(med.Medicine_Type, med.Dosage_Form).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label fw-semibold">Food Timing</label>
            <select
              className="form-select"
              value={med.FoodTiming}
              onChange={(e) => {
                const copy = [...formData.Medicines];
                copy[i].FoodTiming = e.target.value;
                setFormData(prev => ({ ...prev, Medicines: copy }));
              }}
            >
              <option value="">Select Timing</option>
              {foodTimingOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label fw-semibold">Strength</label>
            <select
              className="form-select"
              value={med.Strength || ""}
              disabled={!med.Medicine_Name}
              onChange={(e) => {
                const copy = [...formData.Medicines];
                copy[i].Strength = e.target.value;
                setFormData(prev => ({ ...prev, Medicines: copy }));
              }}
            >
              <option value="">
                {getStrengthOptions(med.Medicine_Name, med.Medicine_Type, med.Dosage_Form).length > 0
                  ? "Select Strength"
                  : "Not specified"}
              </option>
              {getStrengthOptions(med.Medicine_Name, med.Medicine_Type, med.Dosage_Form).map((strength, idx) => (
                <option key={`${med._uid || i}-str-${idx}`} value={strength}>
                  {strength}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <button
              type="button"
              className="btn btn-outline-danger w-100"
              onClick={() => removeMedicine(i)}
            >
              ✕ Remove Medicine
            </button>
          </div>
        </div>

        {/* Second Row: Dosage Details */}
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Dosage Times</label>
            <div className="d-flex gap-3 mt-2">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`morning-${i}`}
                  checked={med.Morning}
                  onChange={(e) => {
                    const copy = [...formData.Medicines];
                    copy[i].Morning = e.target.checked;
                    copy[i].Quantity = calculateQuantity(copy[i].Morning, copy[i].Afternoon, copy[i].Night, copy[i].Duration);
                    setFormData(prev => ({ ...prev, Medicines: copy }));
                  }}
                />
                <label className="form-check-label" htmlFor={`morning-${i}`}>
                  Morning
                </label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`afternoon-${i}`}
                  checked={med.Afternoon}
                  onChange={(e) => {
                    const copy = [...formData.Medicines];
                    copy[i].Afternoon = e.target.checked;
                    copy[i].Quantity = calculateQuantity(copy[i].Morning, copy[i].Afternoon, copy[i].Night, copy[i].Duration);
                    setFormData(prev => ({ ...prev, Medicines: copy }));
                  }}
                />
                <label className="form-check-label" htmlFor={`afternoon-${i}`}>
                  Afternoon
                </label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`night-${i}`}
                  checked={med.Night}
                  onChange={(e) => {
                    const copy = [...formData.Medicines];
                    copy[i].Night = e.target.checked;
                    copy[i].Quantity = calculateQuantity(copy[i].Morning, copy[i].Afternoon, copy[i].Night, copy[i].Duration);
                    setFormData(prev => ({ ...prev, Medicines: copy }));
                  }}
                />
                <label className="form-check-label" htmlFor={`night-${i}`}>
                  Night
                </label>
              </div>
            </div>
          </div>

          <div className="col-md-2">
            <label className="form-label fw-semibold">Duration</label>
            <input
              type="text"
              className="form-control"
              placeholder="5 days"
              value={med.Duration}
              onChange={(e) => {
                const copy = [...formData.Medicines];
                copy[i].Duration = e.target.value;
                copy[i].Quantity = calculateQuantity(copy[i].Morning, copy[i].Afternoon, copy[i].Night, e.target.value);
                setFormData(prev => ({ ...prev, Medicines: copy }));
              }}
            />
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold">Remarks</label>
            <input
              type="text"
              className="form-control"
              placeholder="Doctor's remarks"
              value={med.Remarks}
              onChange={(e) => {
                const copy = [...formData.Medicines];
                copy[i].Remarks = e.target.value;
                setFormData(prev => ({ ...prev, Medicines: copy }));
              }}
            />
          </div>

          <div className="col-md-1">
            <label className="form-label fw-semibold">Quantity</label>
            <input
              type="number"
              className="form-control"
              min="0"
              value={med.Quantity}
              onChange={(e) => {
                const copy = [...formData.Medicines];
                copy[i].Quantity = Number(e.target.value) || 0;
                setFormData(prev => ({ ...prev, Medicines: copy }));
              }}
            />
          </div>
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

                <button
                  type="submit"
                  className="btn btn-dark w-100 mt-4"
                //   disabled={Object.values(medicineErrors).some(
                //     (msg) => msg.startsWith("❌")
                //   )}
                >
                  Submit Prescription
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-3">

  {/* Previous 2 Prescriptions */}
  {lastTwoVisits.length > 0 && (
    <div className="card shadow border-0 mb-3">
      <div className="card-header bg-secondary text-white">
        <strong>Previous 2 Prescriptions</strong>
      </div>

      <div className="card-body">
        {lastTwoVisits.map((prescription, index) =>
          renderPrescriptionHistoryCard(prescription, `sidebar-${index}`)
        )}
      </div>
    </div>
  )}

  {/* 🔥 ADD A TEST CARD */}
  <div className="card shadow border-0">
    <div className="card-header bg-dark text-white">
      <strong>Add a Test</strong>
    </div>


    <div className="card-body">

      {diagnosisData.Tests.map((t, i) => (
        <div key={i} className="mb-2">

          <select
            className="form-select mb-2"
            value={t.Category || ""}
            onChange={(e) => {
              const copy = [...diagnosisData.Tests];
              copy[i] = {
                ...copy[i],
                Category: e.target.value,
                Test_ID: "",
                Test_Name: ""
              };

              setDiagnosisData(prev => ({
                ...prev,
                Tests: copy
              }));
            }}
          >
            <option value="">Select Category</option>
            {Object.keys(testsByCategory).map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            className="form-select mb-2"
            value={t.Test_Name || ""}
            disabled={!t.Category}
            onChange={(e) => {
              const selected = testsMaster.find(
                test => test.Test_Name === e.target.value
              );

              const copy = [...diagnosisData.Tests];
              copy[i] = {
                ...copy[i],
                Test_ID: selected?._id || "",
                Test_Name: e.target.value || ""
              };

              setDiagnosisData(prev => ({
                ...prev,
                Tests: copy
              }));
            }}
          >
            <option value="">Select Test</option>
            {(testsByCategory[t.Category] || []).map(test => (
              <option key={`${t.Category}-${test.name}`} value={test.name}>
                {test.name}
              </option>
            ))}
          </select>

          {diagnosisData.Tests.length > 1 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger w-100"
              onClick={() => {
                const copy = diagnosisData.Tests.filter((_, idx) => idx !== i);
                setDiagnosisData(prev => ({
                  ...prev,
                  Tests: copy
                }));
              }}
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        className="btn btn-outline-primary w-100 mt-2"
        onClick={() =>
          setDiagnosisData(prev => ({
            ...prev,
            Tests: [...prev.Tests, { Category: "", Test_ID: "", Test_Name: "" }]
          }))
        }
      >
        + Add Test
      </button>

      <button
        type="button"
        className="btn btn-success w-100 mt-3"
        onClick={handleDiagnosisSubmit}
      >
        Submit Test
      </button>

    </div>
  </div>
  {/* ADD AN XRAY CARD */}
<div className="card shadow border-0 mt-3">
  <div className="card-header bg-dark text-white">
    <strong>Add an X-ray</strong>
  </div>

  <div className="card-body">

    {xrayData.Xrays.map((x, i) => (
      <div key={i} className="mb-2">

        <select
          className="form-select mb-2"
          value={x.Xray_ID}
          onChange={(e) => {
            const selected = xrayMaster.find(
              xr => xr._id === e.target.value
            );

            const copy = [...xrayData.Xrays];
            copy[i] = {
              Xray_ID: selected?._id || "",
              Xray_Type: selected?.Xray_Type || ""
            };

            setXrayData(prev => ({
              ...prev,
              Xrays: copy
            }));
          }}
        >
          <option value="">Select X-ray</option>
          {xrayMaster.map(xr => (
            <option key={xr._id} value={xr._id}>
              {xr.Xray_Type} ({xr.Body_Part})
            </option>
          ))}
        </select>

        {xrayData.Xrays.length > 1 && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger w-100"
            onClick={() => {
              const copy = xrayData.Xrays.filter(
                (_, idx) => idx !== i
              );
              setXrayData(prev => ({
                ...prev,
                Xrays: copy
              }));
            }}
          >
            Remove
          </button>
        )}
      </div>
    ))}

    <button
      type="button"
      className="btn btn-outline-primary w-100 mt-2"
      onClick={() =>
        setXrayData(prev => ({
          ...prev,
          Xrays: [
            ...prev.Xrays,
            { Xray_ID: "", Xray_Type: "" }
          ]
        }))
      }
    >
      + Add X-ray
    </button>

    <button
      type="button"
      className="btn btn-success w-100 mt-3"
      onClick={handleXraySubmit}
    >
      Submit X-ray
    </button>

  </div>
</div>

</div>

      </div>
      {selectedXrayReport && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">X-ray Report</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedXrayReport(null)}
                />
              </div>

              <div className="modal-body">
                <p><strong>Institute:</strong> {selectedXrayReport?.Institute?.Institute_Name || instituteName || "-"}</p>
                <p><strong>Date:</strong> {formatDateDMY(getXrayReportDate(selectedXrayReport))}</p>

                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Type</th>
                      <th>Body Part</th>
                      <th>View</th>
                      <th>Findings</th>
                      <th>Impression</th>
                       <th>Reports</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedXrayReport?.Xrays || []).map((xray, index) => {
                      const status =
                        xray?.Findings || xray?.Impression || xray?.Remarks
                          ? "result out"
                          : "pending";

                      return (
                        <tr key={`${xray?.Xray_ID || xray?.Xray_Type || index}`}>

                          <td>{xray?.Xray_Type || "-"}</td>

                          <td>{xray?.Body_Part || "-"}</td>

                          <td>{xray?.View || "-"}</td>

                          <td>{xray?.Findings || "-"}</td>

                          <td>{xray?.Impression || "-"}</td>

                          {/* REPORTS COLUMN */}
                          <td>
                            {xray?.Reports && xray.Reports.length > 0 ? (
                              xray.Reports.map((r, i) => (
                                <div key={i} className="mb-1">
                                  <a
                                    href={resolveUrl(r.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-sm btn-outline-primary me-1"
                                  >
                                    View
                                  </a>

                                  <a
                                    href={resolveUrl(r.url)}
                                    download
                                    className="btn btn-sm btn-outline-secondary"
                                  >
                                    Download
                                  </a>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted">No file</span>
                            )}
                          </td>

                          <td>
                            <span
                              className={`badge ${
                                status === "result out"
                                  ? "bg-success"
                                  : "bg-warning text-dark"
                              }`}
                            >
                              {status}
                            </span>
                          </td>

                        </tr>
                      );

                    })}
                  </tbody>
                </table>

                {selectedXrayReport?.Xray_Notes && (
                  <div className="mt-3">
                    <strong>Notes:</strong>
                    <div className="border rounded p-2 bg-light mt-1">
                      {selectedXrayReport.Xray_Notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedXrayReport(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPrescriptionForm;
