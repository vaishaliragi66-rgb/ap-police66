import { useEffect, useState, useRef } from "react";
import axios from "axios";

const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

export default function PatientSelector({ onSelect, instituteId }) {
  const [todayVisits, setTodayVisits] = useState([]);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  /* ================= LOAD TODAY VISITS ================= */
useEffect(() => {
  if (!instituteId) return;

  axios
    .get(`http://localhost:${BACKEND_PORT}/api/visits/today/${instituteId}`)
    
    .then(res => {
      setTodayVisits(res.data || []);
      setOptions(res.data || []);
    })
    
    .catch(err => console.error(err));
}, [instituteId]);


  /* ================= SEARCH ================= */
  useEffect(() => {
    if (!search.trim()) {
      setOptions(todayVisits);
      return;
    }

    axios
      .get(`http://localhost:${BACKEND_PORT}/employee-api/all`)
      .then(res => {
        const list = res.data?.employees || res.data || [];
        const filtered = list.filter(e =>
          String(e.ABS_NO || "")
            .toLowerCase()
            .includes(search.toLowerCase())
        );
        setOptions(filtered);
      });
  }, [search, todayVisits]);

  /* ================= SELECT ================= */
  const handleSelect = (item) => {
    if (item.employee_id) {
      // today visit
      setSearch(item.employee_id.ABS_NO);

      onSelect({
        employee: item.employee_id,
        visit: item
      });
    } else {
      // searched employee
      setSearch(item.ABS_NO);

      onSelect({
        employee: item,
        visit_id: null
      });
    }

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
              {o.employee_id ? o.employee_id.ABS_NO : o.ABS_NO}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
