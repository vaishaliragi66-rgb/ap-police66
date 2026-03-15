import { useEffect, useState, useRef } from "react";
import axios from "axios";



export default function PatientSelector({ onSelect, instituteId, onlyDiagnosisQueue = false, onlyXrayQueue = false, onlyPharmacyQueue = false }) {
  const [todayVisits, setTodayVisits] = useState([]);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  const BACKEND_API = import.meta.env.VITE_BACKEND_API
  /* ================= LOAD TODAY VISITS ================= */
useEffect(() => {
  if (!instituteId) return;

  const endpoint =
  onlyDiagnosisQueue
    ? `${BACKEND_API}/diagnosis-api/queue/${instituteId}`
    : onlyXrayQueue
    ? `${BACKEND_API}/xray-api/queue/${instituteId}`
    : onlyPharmacyQueue
    ? `${BACKEND_API}/prescription-api/queue/${instituteId}`
    : `${BACKEND_API}/api/visits/today/${instituteId}`;

  axios
    .get(endpoint)
    
    .then(res => {
      setTodayVisits(res.data || []);
      setOptions(res.data || []);
    })
    
    .catch(err => console.error(err));
  }, [instituteId, onlyDiagnosisQueue, onlyXrayQueue,onlyPharmacyQueue]);


  /* ================= SEARCH ================= */
  useEffect(() => {
    if (!search.trim()) {
      setOptions(todayVisits);
      return;
    }

    // Always filter only today's visits
    const term = search.toLowerCase();
    const filtered = todayVisits.filter((visit) => {
      const absNo = String(visit?.employee_id?.ABS_NO || "").toLowerCase();
      const employeeName = String(visit?.employee_id?.Name || "").toLowerCase();
      const familyName = String(visit?.FamilyMember?.Name || "").toLowerCase();
      const token = String(visit?.token_no || "").toLowerCase();

      return (
        absNo.includes(term) ||
        employeeName.includes(term) ||
        familyName.includes(term) ||
        token.includes(term)
      );
    });
    setOptions(filtered);
    return;
  }, [search, todayVisits, onlyDiagnosisQueue, onlyXrayQueue]);

  /* ================= SELECT ================= */
const handleSelect = (item) => {
  let employeeData = null;
  let visitData = null;

  if (item.employee_id) {
    // Today visit record
    employeeData = item.employee_id;
    visitData = item;

    setSearch(item.employee_id.ABS_NO);
  } else {
    // Manual searched employee (no visit)
    employeeData = item;
    visitData = null;

    setSearch(item.ABS_NO);
  }

  onSelect({
    employee: employeeData,
    visit: visitData,
    visit_id: visitData?._id || null   // 👈 ADD THIS (no removal)
  });

  setShowDropdown(false);
};


  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        className="form-control"
        placeholder="Search or select today's patient (ABS No)"
        value={search}
        onFocus={() => setShowDropdown(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowDropdown(true);
        }}
      />

      {showDropdown && options.length > 0 && (
        <div
          className="border bg-white"
          style={{
            position: "absolute",
            width: "100%",
            zIndex: 1000,
            maxHeight: 220,
            overflowY: "auto"
          }}
        >
          {options.map((o, i) => (
            <div
              key={i}
              onClick={() => handleSelect(o)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                borderBottom: "1px solid #eee"
              }}
            >
              {o.token_no && (
  <strong className="me-1">Token {o.token_no} -</strong>
)}

{o.employee_id && !o.IsFamilyMember && (
  <>
    {o.employee_id.ABS_NO} - {o.employee_id.Name}
  </>
)}

{o.employee_id && o.IsFamilyMember && o.FamilyMember && (
  <>
    {o.employee_id.ABS_NO} - {o.FamilyMember.Name} ({o.FamilyMember.Relationship})
  </>
)}

{!o.employee_id && (
  <>
    {o.ABS_NO} - {o.Name}
  </>
)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}