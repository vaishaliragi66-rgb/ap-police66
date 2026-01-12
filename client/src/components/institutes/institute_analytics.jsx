import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;

/* ===============================
   Utility: Abnormal Test Checker
================================*/
const isAbnormal = (value, range) => {
  if (!value || !range) return false;

  const num = parseFloat(value);
  if (isNaN(num)) return false;

  if (range.includes("–")) {
    const [min, max] = range.split("–").map(parseFloat);
    return num < min || num > max;
  }

  if (range.startsWith("<")) {
    return num >= parseFloat(range.substring(1));
  }

  if (range.startsWith(">")) {
    return num <= parseFloat(range.substring(1));
  }

  return false;
};

const downloadCSV = (data) => {
  if (!data.length) return;

  const headers = [
    "Role",
    "Name",
    "District",
    "Age",
    "Communicable Diseases",
    "Non-Communicable Diseases",
    "Tests",
    "Medicines",
    "First Visit",
    "Last Visit"
  ];

  const rows = data.map(r => [
    r.Role,
    r.Name,
    r.District || "",
    r.Age ?? "",
    (r.Communicable_Diseases || []).join("; "),
    (r.NonCommunicable_Diseases || []).join("; "),
    (r.Tests || [])
      .map(t => `${t.Test_Name}:${t.Result_Value}`)
      .join("; "),
    (r.Medicines || [])
      .map(m => `${m.Medicine_Name}(${m.Quantity})`)
      .join("; "),
    r.First_Visit_Date
      ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB")
      : "",
    r.Last_Visit_Date
      ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB")
      : ""
  ]);

  let csvContent =
    headers.join(",") +
    "\n" +
    rows.map(e => e.map(v => `"${v}"`).join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "Institute_Analytics.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadPDF = (data) => {
  if (!data.length) return;

  const doc = new jsPDF("l", "mm", "a4");

  doc.setFontSize(14);
  doc.text("Institute Medical Analytics Report", 14, 15);

  const tableColumn = [
    "Role",
    "Name",
    "District",
    "Age",
    "Communicable Diseases",
    "Non-Communicable Diseases",
    "Tests",
    "Medicines",
    "First Visit",
    "Last Visit"
  ];

  const tableRows = data.map(r => [
    r.Role,
    r.Name,
    r.District || "",
    r.Age ?? "",
    (r.Communicable_Diseases || []).join(", "),
    (r.NonCommunicable_Diseases || []).join(", "),
    (r.Tests || [])
      .map(t => `${t.Test_Name}: ${t.Result_Value}`)
      .join("; "),
    (r.Medicines || [])
      .map(m => `${m.Medicine_Name} (${m.Quantity})`)
      .join("; "),
    r.First_Visit_Date
      ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB")
      : "",
    r.Last_Visit_Date
      ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB")
      : ""
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 22,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak"
    },
    headStyles: {
      fillColor: [33, 37, 41]
    }
  });

  doc.save("Institute_Analytics_Report.pdf");
};

export default function InstituteAnalytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     Filters
  ================================*/
  const [roleFilter, setRoleFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [commDiseaseFilter, setCommDiseaseFilter] = useState("");
  const [nonCommDiseaseFilter, setNonCommDiseaseFilter] = useState("");
  const [medicineFilter, setMedicineFilter] = useState("");
  const [testFilter, setTestFilter] = useState("");
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");

  useEffect(() => {
    const institute = JSON.parse(localStorage.getItem("institute"));
    if (!institute) return;

    axios
      .get(
        `http://localhost:${BACKEND_PORT}/institute-api/analytics/${institute._id}`
      )
      .then(res => {
        setRows(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Analytics load error", err);
        setRows([]);
        setLoading(false);
      });
  }, []);

  /* ===============================
     Filtering Logic
  ================================*/
  const filteredRows = rows.filter(r => {
    const match = (value, filter) =>
      !filter ||
      (value &&
        value.toString().toLowerCase().includes(filter.toLowerCase()));

    const ageOk =
      (!ageMin || (r.Age !== null && r.Age >= Number(ageMin))) &&
      (!ageMax || (r.Age !== null && r.Age <= Number(ageMax)));

    const commText = (r.Communicable_Diseases || []).join(" ");
    const nonCommText = (r.NonCommunicable_Diseases || []).join(" ");
    const medsText = (r.Medicines || []).map(m => m.Medicine_Name).join(" ");
    const testsText = (r.Tests || []).map(t => t.Test_Name).join(" ");

    const hasAbnormal =
      r.Tests &&
      r.Tests.some(t => isAbnormal(t.Result_Value, t.Reference_Range));

    return (
      (!roleFilter || r.Role === roleFilter) &&
      match(r.Name, nameFilter) &&
      match(r.District, districtFilter) &&
      match(commText, commDiseaseFilter) &&
      match(nonCommText, nonCommDiseaseFilter) &&
      match(medsText, medicineFilter) &&
      match(testsText, testFilter) &&
      ageOk &&
      (!abnormalOnly || hasAbnormal)
    );
  });

  if (loading) {
    return <div className="text-center mt-5">Loading analytics…</div>;
  }

  return (
    <div className="container-fluid mt-4">
      <h4 className="text-center mb-3">
        Institute Medical Analytics Dashboard
      </h4>

      {/* ===============================
          FILTER PANEL
      ================================*/}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-2">
              <select
                className="form-control"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="Employee">Employee</option>
                <option value="Family">Family</option>
              </select>
            </div>

            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Name"
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="District"
                value={districtFilter}
                onChange={e => setDistrictFilter(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Communicable Disease"
                value={commDiseaseFilter}
                onChange={e => setCommDiseaseFilter(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Non-Communicable Disease"
                value={nonCommDiseaseFilter}
                onChange={e => setNonCommDiseaseFilter(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Medicine"
                value={medicineFilter}
                onChange={e => setMedicineFilter(e.target.value)}
              />
            </div>

            <div className="col-md-2 mt-2">
              <input
                className="form-control"
                placeholder="Test"
                value={testFilter}
                onChange={e => setTestFilter(e.target.value)}
              />
            </div>

            <div className="col-md-1 mt-2">
              <input
                className="form-control"
                placeholder="Age ≥"
                value={ageMin}
                onChange={e => setAgeMin(e.target.value)}
              />
            </div>

            <div className="col-md-1 mt-2">
              <input
                className="form-control"
                placeholder="Age ≤"
                value={ageMax}
                onChange={e => setAgeMax(e.target.value)}
              />
            </div>

            <div className="col-md-3 mt-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={abnormalOnly}
                  onChange={e => setAbnormalOnly(e.target.checked)}
                />
                <label className="form-check-label">
                  Show only abnormal test results
                </label>
              </div>
            </div>
            <div className="col-md-4 mt-3 text-end">
              <button
                className="btn btn-success me-2"
                onClick={() => downloadCSV(filteredRows)}
              >
                Download CSV
              </button>

              <button
                className="btn btn-danger"
                onClick={() => downloadPDF(filteredRows)}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===============================
          TABLE
      ================================*/}
      <div className="table-responsive">
        <table className="table table-bordered table-hover align-middle">
          <thead className="table-dark">
            <tr>
              <th>Role</th>
              <th>Name</th>
              <th>District</th>
              <th>Age</th>
              <th>Communicable Diseases</th>
              <th>Non-Communicable Diseases</th>
              <th>Tests</th>
              <th>Medicines</th>
              <th>First Visit</th>
              <th>Last Visit</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan="10" className="text-center">
                  No records found
                </td>
              </tr>
            )}

            {filteredRows.map((r, i) => (
              <tr key={i}>
                <td>{r.Role}</td>
                <td>{r.Name}</td>
                <td>{r.District || "—"}</td>
                <td>{r.Age ?? "—"}</td>

                <td>
                  {r.Communicable_Diseases?.length
                    ? r.Communicable_Diseases.join(", ")
                    : "—"}
                </td>

                <td>
                  {r.NonCommunicable_Diseases?.length
                    ? r.NonCommunicable_Diseases.join(", ")
                    : "—"}
                </td>

                <td>
                  {r.Tests?.length
                    ? r.Tests.map((t, idx) => {
                        const abnormal = isAbnormal(
                          t.Result_Value,
                          t.Reference_Range
                        );
                        return (
                          <div
                            key={idx}
                            style={{
                              color: abnormal ? "red" : "inherit",
                              fontWeight: abnormal ? "bold" : "normal"
                            }}
                          >
                            {t.Test_Name}: {t.Result_Value} {t.Units}
                          </div>
                        );
                      })
                    : "—"}
                </td>

                <td>
                  {r.Medicines?.length
                    ? r.Medicines.map((m, idx) => (
                        <div key={idx}>
                          {m.Medicine_Name} ({m.Quantity})
                        </div>
                      ))
                    : "—"}
                </td>

                <td>
                  {r.First_Visit_Date
                    ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB")
                    : "—"}
                </td>

                <td>
                  {r.Last_Visit_Date
                    ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
