import { useEffect, useState } from "react";
import axios from "axios";

const BACKEND = import.meta.env.VITE_BACKEND_PORT || 6100;

export default function PatientSelector({ onSelect }) {
  const [todayVisits, setTodayVisits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);

  // Load today's visits
  useEffect(() => {
    axios
      .get(`http://localhost:${BACKEND}/api/visits/today`)
      .then(res => {
        setTodayVisits(res.data || []);
        setOptions(res.data || []);
      });
  }, []);

  // Search logic
  useEffect(() => {
    if (!search.trim()) {
      setOptions(todayVisits);
      return;
    }

    axios
      .get(`http://localhost:${BACKEND}/employee-api/all`)
      .then(res => {
        const list = res.data?.employees || res.data || [];
        const filtered = list.filter(e =>
          String(e.ABS_NO || "")
            .toLowerCase()
            .includes(search.toLowerCase())
        );
        setOptions(filtered);
      });
  }, [search]);

  const handleSelect = (item) => {
    // today visit
    if (item.employee_id) {
      onSelect({
        employee: item.employee_id,
        visit_id: item._id
      });
    } else {
      // searched employee
      onSelect({
        employee: item,
        visit_id: null
      });
    }
    setSearch("");
  };

  return (
    <div>
      <input
        placeholder="Type ABS NO or select today's patient"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="form-control"
      />

      <div className="border">
        {options.map((o, i) => (
          <div
            key={i}
            onClick={() => handleSelect(o)}
            style={{ padding: 8, cursor: "pointer" }}
          >
            {o.token_no ? `Token ${o.token_no} - ` : ""}
            {o.employee_id ? o.employee_id.ABS_NO : o.ABS_NO}
          </div>
        ))}
      </div>
    </div>
  );
}
