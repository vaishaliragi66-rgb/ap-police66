import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import PersonFilterDropdown from "../common/PersonFilterDropdown";
import { usePersonFilter } from "../../context/PersonFilterContext";
import DateRangeFilter from "../common/DateRangeFilter";
import PDFDownloadButton from "../common/PDFDownloadButton";
import SARCPLPrescriptionReport from "../institutes/SARCPLPrescriptionReport";
import "bootstrap/dist/css/bootstrap.min.css";

const getFamilyMemberId = (row) => {
  if (!row) return "";
  if (typeof row.FamilyMember === "string") return row.FamilyMember;
  if (row.FamilyMember?._id) return row.FamilyMember._id;
  if (row.FamilyMember_ID) return row.FamilyMember_ID;
  return "";
};

const matchesPersonScope = (record, personId = "self") => {
  if (personId === "all" || !personId) return true;
  if (personId === "self") return !record?.IsFamilyMember;
  return record?.IsFamilyMember && String(getFamilyMemberId(record)) === String(personId);
};

const normalizeMedicineRow = (medicine = {}, source = "Doctor") => ({
  ...medicine,
  Medicine_Name: medicine?.Medicine_Name || medicine?.medicineName || "-",
  Type: medicine?.Type || medicine?.Medicine_Type || medicine?.medicineType || "",
  Medicine_Type: medicine?.Medicine_Type || medicine?.Type || medicine?.medicineType || "",
  Dosage_Form: medicine?.Dosage_Form || medicine?.dosageForm || "",
  FoodTiming: medicine?.FoodTiming || medicine?.foodTiming || "",
  Strength: medicine?.Strength || "",
  Morning: Boolean(medicine?.Morning),
  Afternoon: Boolean(medicine?.Afternoon),
  Night: Boolean(medicine?.Night),
  Duration: medicine?.Duration || "",
  Remarks: medicine?.Remarks || "",
  Quantity: medicine?.Quantity || 0,
  _source: source,
});

const getPrescriptionTimestamp = (record) =>
  record?.Timestamp || record?.created_at || record?.createdAt || null;

const getDiagnosisReportDate = (record) =>
  record?.Tests?.[0]?.Timestamp || record?.Timestamp || record?.updatedAt || record?.createdAt || null;

const getXrayReportDate = (record) =>
  record?.Xrays?.[0]?.Timestamp || record?.Timestamp || record?.updatedAt || record?.createdAt || null;

const isSameCalendarDay = (left, right) => {
  if (!left || !right) return false;
  const a = new Date(left);
  const b = new Date(right);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const getPrescriptionMedicines = (record) => {
  const source = record?.Source === "DOCTOR_PRESCRIPTION" ? "Doctor" : "Pharmacy";
  const rows = Array.isArray(record?.mergedMedicines)
    ? record.mergedMedicines
    : Array.isArray(record?.Medicines)
      ? record.Medicines
      : [];

  return rows.map((medicine) => normalizeMedicineRow(medicine, medicine?._source || source));
};

const getPrescriptionVisitVitals = (record) => {
  const vitals = record?.VisitSummary?.Vitals || {};

  return {
    bp: vitals?.Blood_Pressure || "",
    pulse: vitals?.Pulse || "",
    temperature: vitals?.Temperature ?? null,
    spo2: vitals?.Oxygen || "",
  };
};

const calculateAgeFromDob = (dob) => {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const getEnrichedPrescriptionHistory = (
  actions = [],
  prescriptions = [],
  diagnosisRecords = [],
  xrayRecords = [],
  personId = "self"
) => {
  const safeActions = Array.isArray(actions) ? actions : [];
  const safePrescriptions = (Array.isArray(prescriptions) ? prescriptions : []).filter((record) =>
    matchesPersonScope(record, personId)
  );
  const safeDiagnosis = (Array.isArray(diagnosisRecords) ? diagnosisRecords : []).filter((record) =>
    matchesPersonScope(record, personId)
  );
  const safeXrays = (Array.isArray(xrayRecords) ? xrayRecords : []).filter((record) =>
    matchesPersonScope(record, personId)
  );

  const doctorPrescriptionActions = safeActions.filter(
    (action) => action?.action_type === "DOCTOR_PRESCRIPTION" && matchesPersonScope(action?.data || {}, personId)
  );
  const diagnosisActions = safeActions.filter(
    (action) => action?.action_type === "DOCTOR_DIAGNOSIS" && matchesPersonScope(action?.data || {}, personId)
  );
  const xrayActions = safeActions.filter(
    (action) => action?.action_type === "DOCTOR_XRAY" && matchesPersonScope(action?.data || {}, personId)
  );

  const findDoctorPrescriptionAction = (record) => {
    const recordActionId = String(record?._id || "");
    const recordVisitId = String(record?.visit_id || "");

    return doctorPrescriptionActions.find((action) => {
      if (recordActionId && String(action?._id || "") === recordActionId) return true;
      if (recordVisitId && String(action?.visit_id || "") === recordVisitId) return true;
      return false;
    }) || null;
  };

  const findRelatedAction = (actionList, record) => {
    const recordVisitId = String(record?.visit_id || "");
    if (recordVisitId) {
      const visitMatch = actionList.find((action) => String(action?.visit_id || "") === recordVisitId);
      if (visitMatch) return visitMatch;
    }

    const recordTimestamp = getPrescriptionTimestamp(record);
    return actionList.find((action) =>
      isSameCalendarDay(action?.created_at || action?.createdAt, recordTimestamp)
    ) || null;
  };

  const matchDiagnosisResult = (requestedTest, record) => {
    const requestedId = String(requestedTest?.Test_ID?._id || requestedTest?.Test_ID || "");
    const requestedName = String(
      requestedTest?.Test_Name || requestedTest?.Test_ID?.Test_Name || ""
    ).trim().toLowerCase();
    const recordVisitId = String(record?.visit_id || "");

    const matchingRecord = safeDiagnosis.find((diagnosisRecord) => {
      const diagnosisVisitId = String(diagnosisRecord?.Visit?._id || diagnosisRecord?.Visit || "");
      if (recordVisitId && diagnosisVisitId) {
        return diagnosisVisitId === recordVisitId;
      }
      return isSameCalendarDay(getDiagnosisReportDate(diagnosisRecord), getPrescriptionTimestamp(record));
    });

    if (!matchingRecord) return null;

    const matchedTest = (matchingRecord?.Tests || []).find((test) => {
      const testId = String(test?.Test_ID?._id || test?.Test_ID || "");
      const testName = String(test?.Test_Name || test?.Test_ID?.Test_Name || "").trim().toLowerCase();
      if (requestedId && testId) return requestedId === testId;
      return requestedName && requestedName === testName;
    });

    if (!matchedTest) return null;

    return {
      ...matchedTest,
      record: matchingRecord,
    };
  };

  const matchXrayResult = (requestedXray, record) => {
    const requestedId = String(requestedXray?.Xray_ID?._id || requestedXray?.Xray_ID || "");
    const requestedType = String(requestedXray?.Xray_Type || "").trim().toLowerCase();

    const matchingRecord = safeXrays.find((xrayRecord) =>
      isSameCalendarDay(getXrayReportDate(xrayRecord), getPrescriptionTimestamp(record))
    );

    if (!matchingRecord) return null;

    const matchedXray = (matchingRecord?.Xrays || []).find((xray) => {
      const xrayId = String(xray?.Xray_ID?._id || xray?.Xray_ID || "");
      const xrayType = String(xray?.Xray_Type || "").trim().toLowerCase();
      if (requestedId && xrayId) return requestedId === xrayId;
      return requestedType && requestedType === xrayType;
    });

    if (!matchedXray) return null;

    return {
      ...matchedXray,
      record: matchingRecord,
    };
  };

  return safePrescriptions
    .map((record) => {
      const doctorAction = findDoctorPrescriptionAction(record);
      const diagnosisAction = findRelatedAction(diagnosisActions, record);
      const xrayAction = findRelatedAction(xrayActions, record);

      const doctorMedicines = (doctorAction?.data?.medicines || []).map((medicine) =>
        normalizeMedicineRow(medicine, "Doctor")
      );
      const issuedMedicines = (record?.Medicines || []).map((medicine) =>
        normalizeMedicineRow(medicine, "Pharmacy")
      );

      const mergedMedicines = doctorMedicines.length > 0
        ? doctorMedicines.map((doctorMedicine) => {
            const pharmacyMatch = issuedMedicines.find((issuedMedicine) => {
              const leftName = String(issuedMedicine?.Medicine_Name || "").trim().toLowerCase();
              const rightName = String(doctorMedicine?.Medicine_Name || "").trim().toLowerCase();
              const leftStrength = String(issuedMedicine?.Strength || "").trim().toLowerCase();
              const rightStrength = String(doctorMedicine?.Strength || "").trim().toLowerCase();

              return leftName === rightName && (!leftStrength || !rightStrength || leftStrength === rightStrength);
            });

            return {
              ...doctorMedicine,
              Quantity: pharmacyMatch?.Quantity || doctorMedicine?.Quantity || 0,
              _source: pharmacyMatch ? "Pharmacy" : "Doctor",
            };
          })
        : issuedMedicines;

      const relatedTests = (diagnosisAction?.data?.tests || []).map((test) => ({
        ...test,
        matchedResult: matchDiagnosisResult(test, record),
      }));

      const relatedXrays = (xrayAction?.data?.xrays || []).map((xray) => ({
        ...xray,
        matchedResult: matchXrayResult(xray, record),
      }));

      return {
        ...record,
        visit_id: record?.visit_id || doctorAction?.visit_id || null,
        mergedMedicines,
        doctorNotes: doctorAction?.remarks || record?.doctorNotes || (record?.Source === "DOCTOR_PRESCRIPTION" ? record?.Notes : ""),
        pharmacyNotes: record?.Source === "DOCTOR_PRESCRIPTION"
          ? []
          : (record?.Notes ? [record.Notes] : []),
        relatedTests,
        relatedXrays,
        instituteDisplayName: record?.Institute?.Institute_Name || "",
      };
    })
    .sort((left, right) => new Date(getPrescriptionTimestamp(right) || 0) - new Date(getPrescriptionTimestamp(left) || 0));
};

const PrescriptionReport = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [exportPrescription, setExportPrescription] = useState(null);
  const [downloadingId, setDownloadingId] = useState("");
  const exportRef = useRef(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:6100";
  const employeeObjectId = localStorage.getItem("employeeObjectId");
  const employeeId = localStorage.getItem("employeeId") || employeeObjectId;
  const { selectedPersonId, setSelectedPersonId, options, loadingFamily } = usePersonFilter(employeeObjectId || employeeId);

  useEffect(() => {
    if (!employeeObjectId) return;
    fetchPrescriptions();
  }, [employeeObjectId, selectedPersonId, fromDate, toDate]);

  useEffect(() => {
    if (!employeeObjectId) return;

    const loadProfiles = async () => {
      try {
        const [profileRes, familyRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/employee-api/profile/${employeeObjectId}`).catch(() => ({ data: null })),
          axios.get(`${BACKEND_URL}/family-api/family/${employeeObjectId}`).catch(() => ({ data: [] })),
        ]);

        setEmployeeProfile(profileRes?.data || null);
        setFamilyMembers(Array.isArray(familyRes?.data) ? familyRes.data : []);
      } catch {
        setEmployeeProfile(null);
        setFamilyMembers([]);
      }
    };

    loadProfiles();
  }, [BACKEND_URL, employeeObjectId]);

  const getPrescriptionReportForLabel = (record) => {
    if (record?.IsFamilyMember) {
      const familyId = getFamilyMemberId(record);
      const familyProfile = familyMembers.find((member) => String(member?._id) === String(familyId));
      const familyName = familyProfile?.Name || record?.FamilyMember?.Name || "Family Member";
      const relationship = familyProfile?.Relationship || record?.FamilyMember?.Relationship || "";
      return relationship ? `${familyName} (${relationship})` : familyName;
    }
    return employeeProfile?.Name || record?.Employee?.Name || "Self";
  };

  const buildSarcplReportData = (prescription) => {
    const familyId = getFamilyMemberId(prescription);
    const familyProfile = prescription?.IsFamilyMember
      ? familyMembers.find((member) => String(member?._id) === String(familyId)) || null
      : null;
    const patientProfile = prescription?.IsFamilyMember ? familyProfile : employeeProfile;
    const visitVitals = getPrescriptionVisitVitals(prescription);
    const patientMetrics = prescription?.PatientMetrics || prescription?.VisitSummary?.Vitals || {};

    return {
      hospital: {
        name: prescription?.instituteDisplayName || prescription?.Institute?.Institute_Name || "SARCPL",
        address: "",
        contact: "",
        email: "",
        logo: "",
      },
      patient: {
        name: getPrescriptionReportForLabel(prescription),
        age: calculateAgeFromDob(patientProfile?.DOB),
        gender: patientProfile?.Gender || "",
        absNo: employeeProfile?.ABS_NO || prescription?.Employee?.ABS_NO || "",
        mrn: patientProfile?._id || prescription?.Employee?._id || "",
        bloodGroup: patientProfile?.Blood_Group || employeeProfile?.Blood_Group || "",
      },
      encounter: {
        doctor: prescription?.doctor || prescription?.created_by || "",
        department: prescription?.department || "",
        date: getPrescriptionTimestamp(prescription),
        visitType: prescription?.visit_type || prescription?.visitType || "",
        prescriptionId: prescription?.visit_id || prescription?._id || prescription?.created_at || "",
      },
      vitals: {
        bp: visitVitals.bp,
        pulse: visitVitals.pulse,
        temperature: visitVitals.temperature,
        spo2: visitVitals.spo2,
        height: patientMetrics.Height || patientProfile?.Height || employeeProfile?.Height || "",
        weight: patientMetrics.Weight || patientProfile?.Weight || employeeProfile?.Weight || "",
        bmi: patientMetrics.BMI || patientProfile?.BMI || employeeProfile?.BMI || "",
      },
      investigations: {
        tests: (prescription?.relatedTests || []).map((test) => test?.Test_Name || test?.Test_ID?.Test_Name || "").filter(Boolean),
        xrays: (prescription?.relatedXrays || []).map((xray) => xray?.Xray_Type || xray?.Xray_ID || "").filter(Boolean),
        notes: "",
      },
      diagnosis: {
        primary: prescription?.doctorNotes || prescription?.data?.notes || "",
        icd: prescription?.icd || "",
        notes: prescription?.doctorNotes || prescription?.data?.notes || "",
      },
      prescriptions: getPrescriptionMedicines(prescription).map((medicine) => ({
        name: medicine?.Medicine_Name || "",
        dosage: medicine?.Strength || medicine?.dosage || "",
        frequency: [
          medicine?.Morning ? "Morning" : null,
          medicine?.Afternoon ? "Afternoon" : null,
          medicine?.Night ? "Night" : null,
        ].filter(Boolean).join("/") || (medicine?.Frequency || medicine?.Type || ""),
        duration: medicine?.Duration || "",
        instructions: medicine?.Remarks || medicine?.FoodTiming || "",
      })),
      qrUrl: null,
    };
  };

  const selectedReportData = useMemo(
    () => (selectedPrescription ? buildSarcplReportData(selectedPrescription) : null),
    [selectedPrescription, employeeProfile, familyMembers]
  );

  const exportReportData = useMemo(
    () => (exportPrescription ? buildSarcplReportData(exportPrescription) : null),
    [exportPrescription, employeeProfile, familyMembers]
  );

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const [prescriptionRes, actionsRes, diagnosisRes, xrayRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/prescription-api/employee/${employeeObjectId}`, {
          params: {
            employeeId: employeeObjectId,
            personId: selectedPersonId,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
          },
        }),
        axios.get(`${BACKEND_URL}/api/medical-actions/employee/${employeeObjectId}`).catch(() => ({ data: [] })),
        axios.get(`${BACKEND_URL}/diagnosis-api/records/${employeeObjectId}`, {
          params: {
            personId: selectedPersonId,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
          },
        }).catch(() => ({ data: [] })),
        axios.get(`${BACKEND_URL}/xray-api/records/${employeeObjectId}`, {
          params: {
            personId: selectedPersonId,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
          },
        }).catch(() => ({ data: [] })),
      ]);

      const payload = prescriptionRes.data && prescriptionRes.data.value ? prescriptionRes.data.value : prescriptionRes.data;
      const list = Array.isArray(payload) ? payload : [];
      const enriched = getEnrichedPrescriptionHistory(
        actionsRes?.data || [],
        list,
        diagnosisRes?.data || [],
        xrayRes?.data || [],
        selectedPersonId
      );

      setPrescriptions(enriched);
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      alert("From Date cannot be after To Date");
      return;
    }
    fetchPrescriptions();
  };

  const downloadPrescriptionReport = async (prescription) => {
    try {
      setDownloadingId(String(prescription?._id || prescription?.visit_id || "download"));
      setExportPrescription(prescription);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const element = exportRef.current;
      if (!element) {
        throw new Error("Report preview not ready");
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      let renderWidth = maxWidth;
      let renderHeight = (canvas.height * renderWidth) / canvas.width;

      if (renderHeight > maxHeight) {
        renderHeight = maxHeight;
        renderWidth = (canvas.width * renderHeight) / canvas.height;
      }

      const x = (pageWidth - renderWidth) / 2;
      const y = margin;

      pdf.addImage(imageData, "PNG", x, y, renderWidth, renderHeight, undefined, "FAST");
      pdf.save(`Doctor_Prescription_${String(prescription?.visit_id || prescription?._id || "report").slice(-6)}.pdf`);
    } catch (err) {
      console.error("Prescription report download failed:", err);
      alert("Unable to download prescription report");
    } finally {
      setExportPrescription(null);
      setDownloadingId("");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        padding: "40px 0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="container">
        <button
          className="btn mb-4"
          onClick={() => window.history.back()}
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

        <div className="mb-4">
          <h3 style={{ fontWeight: 600, color: "#1F2933" }}>
            Prescription Records
          </h3>
          <p style={{ color: "#6B7280", marginBottom: 0 }}>
            All medicines issued to you and your family members
          </p>
          <div className="mt-3" style={{ maxWidth: "100%" }}>
            <div className="d-flex align-items-end gap-3 flex-wrap">
              <PersonFilterDropdown
                options={options}
                value={selectedPersonId}
                onChange={(val) => {
                  setSelectedPersonId(val);
                  setSelectedPrescription(null);
                }}
                loading={loadingFamily}
              />

              <DateRangeFilter
                fromDate={fromDate}
                toDate={toDate}
                setFromDate={setFromDate}
                setToDate={setToDate}
                onApply={applyFilter}
              />

              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm"
                  style={{
                    backgroundColor: "#4A70A9",
                    color: "#FFFFFF",
                    borderRadius: "999px",
                    padding: "6px 16px",
                    fontWeight: 500,
                    border: "none",
                    height: "38px",
                  }}
                  onClick={() => fetchPrescriptions()}
                >
                  Refresh
                </button>

                <PDFDownloadButton
                  modulePath="prescription-api"
                  params={{ employeeId: employeeObjectId, personId: selectedPersonId, fromDate, toDate }}
                  filenamePrefix={`Prescriptions_${employeeId}`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex gap-3 mb-4 flex-wrap">
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D6E0F0",
              borderRadius: "12px",
              padding: "14px 20px",
              fontWeight: 600,
              color: "#1F2933",
            }}
          >
            Total Prescriptions:{" "}
            <span style={{ color: "#4A70A9" }}>
              {prescriptions.length}
            </span>
          </div>

          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D6E0F0",
              borderRadius: "12px",
              padding: "14px 20px",
              fontWeight: 600,
              color: "#1F2933",
            }}
          >
            Total Medicines:{" "}
            <span style={{ color: "#4A70A9" }}>
              {prescriptions.reduce((acc, prescription) => acc + getPrescriptionMedicines(prescription).length, 0)}
            </span>
          </div>
        </div>

        <div
          className="card border-0"
          style={{
            borderRadius: "16px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div className="card-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-secondary" role="status" />
              </div>
            ) : prescriptions.length === 0 ? (
              <p className="text-center text-muted">
                No records found for selected person.
              </p>
            ) : (
              <div className="table-responsive">
                <table
                  className="table align-middle"
                  style={{
                    border: "1px solid #D6E0F0",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <thead
                    style={{
                      backgroundColor: "#F3F7FF",
                      color: "#1F2933",
                      fontWeight: 600,
                    }}
                  >
                    <tr>
                      <th>#</th>
                      <th>Institute</th>
                      <th>Person</th>
                      <th>Medicine</th>
                      <th>Qty</th>
                      <th>Date</th>
                      <th>Report</th>
                    </tr>
                  </thead>

                  <tbody>
                    {prescriptions.map((prescription, idx) => (
                      <tr key={`${prescription._id || prescription.visit_id || "prescription"}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td>{prescription.Institute?.Institute_Name || prescription.instituteDisplayName || "—"}</td>
                        <td>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: 600,
                              backgroundColor: prescription.IsFamilyMember ? "#FFF4E5" : "#EAF2FF",
                              color: prescription.IsFamilyMember ? "#92400E" : "#1D4ED8",
                            }}
                          >
                            {prescription.IsFamilyMember
                              ? getPrescriptionReportForLabel(prescription)
                              : "Self"}
                          </span>
                        </td>
                        <td>
                          {getPrescriptionMedicines(prescription).map((medicine) => medicine.Medicine_Name).join(", ")}
                        </td>
                        <td>
                          {getPrescriptionMedicines(prescription).reduce((acc, medicine) => acc + Number(medicine.Quantity || 0), 0)}
                        </td>
                        <td>{formatDate(getPrescriptionTimestamp(prescription))}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => {
                                setSelectedPrescription(prescription);
                                setShowModal(true);
                              }}
                            >
                              View
                            </button>

                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => downloadPrescriptionReport(prescription)}
                              disabled={downloadingId === String(prescription?._id || prescription?.visit_id || "download")}
                            >
                              {downloadingId === String(prescription?._id || prescription?.visit_id || "download")
                                ? "Preparing..."
                                : "Download"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && selectedPrescription && selectedReportData && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: "90%" }}>
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Prescription Report</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                />
              </div>

              <div className="modal-body p-0">
                <SARCPLPrescriptionReport reportData={selectedReportData} />
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>

                <button
                  className="btn btn-primary"
                  onClick={() => downloadPrescriptionReport(selectedPrescription)}
                  disabled={downloadingId === String(selectedPrescription?._id || selectedPrescription?.visit_id || "download")}
                >
                  {downloadingId === String(selectedPrescription?._id || selectedPrescription?.visit_id || "download")
                    ? "Preparing..."
                    : "Download Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "210mm",
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        {exportReportData && (
          <div ref={exportRef}>
            <SARCPLPrescriptionReport reportData={exportReportData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescriptionReport;
