import React, { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const HealthSummary = () => {
  const institute = JSON.parse(localStorage.getItem("institute") || "{}");
  // prefer full object _id, fallback to standalone instituteId (older flows)
  const instituteId = institute?._id || localStorage.getItem("instituteId");
  const navigate = useNavigate();
  const [type, setType] = useState("daily");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("");
  // compute current year/month before using them to initialize state
  const today = new Date();
  const currYear = today.getFullYear();
  const currMonth = today.getMonth() + 1;
  const [year, setYear] = useState(currYear);
  const [startYear, setStartYear] = useState(currYear);
  const [startMonth, setStartMonth] = useState(currMonth);
  const [endYear, setEndYear] = useState(currYear);
  const [endMonth, setEndMonth] = useState(currMonth);
  const [data, setData] = useState(null);
  const [diseasePage, setDiseasePage] = useState(1);
  const [medicinePage, setMedicinePage] = useState(1);
  const [exportAll, setExportAll] = useState(false);

const rowsPerPage = 10;
  const formatDateDMY = (isoDate) => {
    if (!isoDate) return "-";
    const [yyyy, mm, dd] = String(isoDate).split("-");
    if (!yyyy || !mm || !dd) return isoDate;
    return `${dd}-${mm}-${yyyy}`;
  };
  const pad = (n) => {
    if (n === undefined || n === null) return "";
    return String(n).toString().padStart(2, "0");
  };

  const fetchSummary = async () => {
    // require institute id available; backend will validate its format
    if (!instituteId) {
      alert("Missing institute. Please login and try again.");
      return;
    }
    try {
      if (type === "daily") {
        const url = `${BACKEND_URL}/institute-api/health-summary?type=daily&date=${date}&instituteId=${instituteId}`;
        const res = await axios.get(url);
        setData(res.data);
        return;
      }

      if (type === "yearly") {
        // build months 1..12 for the selected year
        const months = [];
        for (let m = 1; m <= 12; m++) months.push({ year: Number(year), month: m });
        const calls = months.map(({ year: y, month: m }) =>
          axios.get(`${BACKEND_URL}/institute-api/health-summary?type=monthly&year=${y}&month=${m}&instituteId=${instituteId}`)
        );

        const results = await Promise.allSettled(calls);
        const mergedRowsMap = new Map();
        let mergedTotals = { male: 0, female: 0, maleChild: 0, femaleChild: 0, total: 0 };
        const mergedDiseaseMap = new Map();
        const mergedCategoryMap = new Map();
        const mergedMedicineMap = new Map();

        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value?.data) {
            const body = r.value.data;
            const rows = body.censusRows || [];
            rows.forEach(row => {
              const key = row.date;
              if (!mergedRowsMap.has(key)) mergedRowsMap.set(key, { ...row });
              else {
                const existing = mergedRowsMap.get(key);
                existing.male += row.male || 0;
                existing.female += row.female || 0;
                existing.maleChild += row.maleChild || 0;
                existing.femaleChild += row.femaleChild || 0;
                existing.total += row.total || 0;
                mergedRowsMap.set(key, existing);
              }
            });

            const t = body.totals || {};
            mergedTotals.male += t.male || 0;
            mergedTotals.female += t.female || 0;
            mergedTotals.maleChild += t.maleChild || 0;
            mergedTotals.femaleChild += t.femaleChild || 0;
            mergedTotals.total += t.total || 0;
              // merge disease summary
              (body.diseaseSummary || []).forEach(d => {
                const key = d.diseaseName || d._id || JSON.stringify(d._id || d.name || d);
                const prev = mergedDiseaseMap.get(key) || { diseaseName: d.diseaseName || d._id?.name || key, category: d.category || d._id?.category || d.category, count: 0 };
                prev.count += d.count || 0;
                mergedDiseaseMap.set(key, prev);
              });

              // merge category summary
              (body.categorySummary || []).forEach(c => {
                const key = c.category || c._id || String(c);
                const prev = mergedCategoryMap.get(key) || { category: key, count: 0 };
                prev.count += c.count || 0;
                mergedCategoryMap.set(key, prev);
              });

              // merge medicine usage
              (body.medicineUsage || []).forEach(med => {
                const key = med.medicineName || med._id || String(med);
                const prevQty = mergedMedicineMap.get(key) || 0;
                mergedMedicineMap.set(key, prevQty + (med.totalQuantity || med.total || 0));
              });
          }
        });

        const censusRows = Array.from(mergedRowsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
          const diseaseSummary = Array.from(mergedDiseaseMap.values()).sort((a,b)=>b.count - a.count);
          const categorySummary = Array.from(mergedCategoryMap.values()).sort((a,b)=>b.count - a.count);
          const medicineUsage = Array.from(mergedMedicineMap.entries()).map(([medicineName, totalQuantity]) => ({ medicineName, totalQuantity })).sort((a,b)=>b.totalQuantity - a.totalQuantity);

          setData({ censusRows, totals: mergedTotals, diseaseSummary, categorySummary, medicineUsage });
        return;
      }
      if (
        Number(startYear) > Number(endYear) ||
        (Number(startYear) === Number(endYear) && Number(startMonth) > Number(endMonth))
      ) {
        alert("Start month must be before End month");
        return;
      }

      // Monthly: if start/end range spans multiple months, fetch each month separately and merge client-side
      const buildMonthList = (sYear, sMonth, eYear, eMonth) => {
        const months = [];
        let y = Number(sYear);
        let m = Number(sMonth);
        const endY = Number(eYear);
        const endM = Number(eMonth);
        while (y < endY || (y === endY && m <= endM)) {
          months.push({ year: y, month: m });
          m++;
          if (m > 12) {
            m = 1;
            y++;
          }
        }
        return months;
      };

      // determine whether to use explicit start/end or single month
      let calls = [];
      if (startYear && startMonth && endYear && endMonth) {
        const months = buildMonthList(startYear, startMonth, endYear, endMonth);
        calls = months.map(({ year: y, month: m }) =>
          axios.get(`${BACKEND_URL}/institute-api/health-summary?type=monthly&year=${y}&month=${m}&instituteId=${instituteId}`)
        );
      } else if (year && month) {
        calls = [axios.get(`${BACKEND_URL}/institute-api/health-summary?type=monthly&year=${year}&month=${month}&instituteId=${instituteId}`)];
      } else {
        alert('Please provide a valid month range or year+month');
        return;
      }

      const results = await Promise.allSettled(calls);
      // collect successful results
      const mergedRowsMap = new Map();
      let mergedTotals = { male: 0, female: 0, maleChild: 0, femaleChild: 0, total: 0 };
      const mergedDiseaseMap = new Map();
      const mergedCategoryMap = new Map();
      const mergedMedicineMap = new Map();

      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value?.data) {
          const body = r.value.data;
          const rows = body.censusRows || [];
          rows.forEach(row => {
            const key = row.date;
            if (!mergedRowsMap.has(key)) mergedRowsMap.set(key, { ...row });
            else {
              const existing = mergedRowsMap.get(key);
              existing.male += row.male || 0;
              existing.female += row.female || 0;
              existing.maleChild += row.maleChild || 0;
              existing.femaleChild += row.femaleChild || 0;
              existing.total += row.total || 0;
              mergedRowsMap.set(key, existing);
            }
          });

          const t = body.totals || {};
          mergedTotals.male += t.male || 0;
          mergedTotals.female += t.female || 0;
          mergedTotals.maleChild += t.maleChild || 0;
          mergedTotals.femaleChild += t.femaleChild || 0;
          mergedTotals.total += t.total || 0;

          // merge disease summary
          (body.diseaseSummary || []).forEach(d => {
            const key = d.diseaseName || d._id || JSON.stringify(d._id || d.name || d);
            const prev = mergedDiseaseMap.get(key) || { diseaseName: d.diseaseName || d._id?.name || key, category: d.category || d._id?.category || d.category, count: 0 };
            prev.count += d.count || 0;
            mergedDiseaseMap.set(key, prev);
          });

          // merge category summary
          (body.categorySummary || []).forEach(c => {
            const key = c.category || c._id || String(c);
            const prev = mergedCategoryMap.get(key) || { category: key, count: 0 };
            prev.count += c.count || 0;
            mergedCategoryMap.set(key, prev);
          });

          // merge medicine usage
          (body.medicineUsage || []).forEach(med => {
            const key = med.medicineName || med._id || String(med);
            const prevQty = mergedMedicineMap.get(key) || 0;
            mergedMedicineMap.set(key, prevQty + (med.totalQuantity || med.total || 0));
          });
        }
      });

      const censusRows = Array.from(mergedRowsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      const diseaseSummary = Array.from(mergedDiseaseMap.values()).sort((a,b)=>b.count - a.count);
      const categorySummary = Array.from(mergedCategoryMap.values()).sort((a,b)=>b.count - a.count);
      const medicineUsage = Array.from(mergedMedicineMap.entries()).map(([medicineName, totalQuantity]) => ({ medicineName, totalQuantity })).sort((a,b)=>b.totalQuantity - a.totalQuantity);

      setData({ censusRows, totals: mergedTotals, diseaseSummary, categorySummary, medicineUsage });
    } catch (error) {
      console.error('FetchSummary error', error?.response?.data || error.message || error);
      alert('Error fetching summary — check server logs');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
  setExportAll(true);

  setTimeout(async () => {
    const element = document.getElementById("summary-section");

    const canvas = await html2canvas(element, { scale: 2 });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

    pdf.save("HealthSummary.pdf");

    setExportAll(false);
  }, 300);
};
  
  // VIEW CENSUS IN EXCEL
const viewCensusExcel = () => {
  if (!data?.censusRows?.length) return;

  const rows = data.censusRows.map((row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${formatDateDMY(row.date)}</td>
      <td>${row.male}</td>
      <td>${row.female}</td>
      <td>${row.maleChild}</td>
      <td>${row.femaleChild}</td>
      <td>${row.total}</td>
    </tr>
  `).join("");

  const html = `
    <html>
      <head>
        <title>Census Spreadsheet</title>
        <style>
          body{font-family:Arial;padding:20px;background:#f5f5f5}
          table{border-collapse:collapse;width:100%;background:white}
          th,td{border:1px solid #d0d0d0;padding:8px;text-align:center}
          th{background:#e9ecef;font-weight:bold}
        </style>
      </head>
      <body>
        <h3>Census Spreadsheet</h3>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Date</th>
              <th>Male</th>
              <th>Female</th>
              <th>Male Child</th>
              <th>Female Child</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const newWindow = window.open("");
  newWindow.document.write(html);
  newWindow.document.close();
};

// DOWNLOAD CENSUS EXCEL
const downloadCensusExcel = () => {
  if (!data?.censusRows?.length) return;

  const rows = data.censusRows.map((row, i) => ({
    "S.No": i + 1,
    Date: formatDateDMY(row.date),
    Male: row.male,
    Female: row.female,
    "Male Child": row.maleChild,
    "Female Child": row.femaleChild,
    Total: row.total
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Census");
  XLSX.writeFile(wb, "Census_Report.xlsx");
};
// VIEW MEDICINE EXCEL
const viewMedicineExcel = () => {
  if (!data?.medicineUsage?.length) return;

  const rows = data.medicineUsage.map((row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${row.medicineName}</td>
      <td>${row.totalQuantity}</td>
    </tr>
  `).join("");

  const html = `
    <html>
      <head>
        <title>Medicine Spreadsheet</title>
        <style>
          body{font-family:Arial;padding:20px;background:#f5f5f5}
          table{border-collapse:collapse;width:100%;background:white}
          th,td{border:1px solid #d0d0d0;padding:8px}
          th{background:#e9ecef;font-weight:bold}
        </style>
      </head>
      <body>
        <h3>Medicine Usage Spreadsheet</h3>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Medicine</th>
              <th>Total Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const newWindow = window.open("");
  newWindow.document.write(html);
  newWindow.document.close();
};
// DOWNLOAD MEDICINE EXCEL
const downloadMedicineExcel = () => {
  if (!data?.medicineUsage?.length) return;

  const rows = data.medicineUsage.map((row, i) => ({
    "S.No": i + 1,
    Medicine: row.medicineName,
    "Total Quantity": row.totalQuantity
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Medicine Usage");
  XLSX.writeFile(wb, "Medicine_Usage_Report.xlsx");
};

  const diseaseChartData = {
  labels: data?.diseaseSummary?.map(d => d.diseaseName) || [],
  datasets: [
    {
      label: "Disease Count",
      data: data?.diseaseSummary?.map(d => d.count) || [],
      backgroundColor: "#4e73df"
    }
  ]
};

const categoryChartData = {
  labels: data?.categorySummary?.map(c => c.category) || [],
  datasets: [
    {
      data: data?.categorySummary?.map(c => c.count) || [],
      backgroundColor: ["#28a745", "#dc3545", "#ffc107", "#17a2b8"]
    }
  ]
};

  const paginatedMedicines =
  exportAll
    ? data?.medicineUsage || []
    : data?.medicineUsage?.slice(
        (medicinePage - 1) * rowsPerPage,
        medicinePage * rowsPerPage
      ) || [];

  const paginatedCensusRows =
  exportAll
    ? data?.censusRows || []
    : data?.censusRows?.slice(
        (diseasePage - 1) * rowsPerPage,
        diseasePage * rowsPerPage
      ) || [];

  return (
   
       <div className="container-fluid mt-2">
      {/* Back Button */}
      <button
        className="btn mb-1"
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
      <h3 className="fw-bold mb-4 text-center">Health Summary</h3>

      <div className="card shadow-sm p-4 mb-4">
        <div className="d-flex gap-3 mb-3">
          <button className={`btn ${type === "daily" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setType("daily")}>Daily</button>
          <button className={`btn ${type === "monthly" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setType("monthly")}>Monthly</button>
          <button className={`btn ${type === "yearly" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setType("yearly")}>Yearly</button>
        </div>

        {type === "daily" ? (
          <input type="date" className="form-control mb-3" value={date} onChange={e => setDate(e.target.value)} />
        ) : type === "yearly" ? (
          <div className="row g-2 mb-3">
            <div className="col">
              <input type="number" placeholder="Year" className="form-control" value={year} onChange={e => setYear(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="row g-2 mb-3">
            <div className="col-6">
              <div className="d-flex">
                <input type="number" placeholder="Start Year" className="form-control me-2" value={startYear} onChange={e => setStartYear(e.target.value)} />
                <select
                  className="form-control"
                  value={startMonth}
                  onChange={e => setStartMonth(Number(e.target.value))}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>
                      {new Date(0, i).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex">
                <input type="number" placeholder="End Year" className="form-control me-2" value={endYear} onChange={e => setEndYear(e.target.value)} />
                <select
                  className="form-control"
                  value={endMonth}
                  onChange={e => setEndMonth(Number(e.target.value))}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>
                      {new Date(0, i).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="d-flex gap-2">
          <button className="btn btn-success" onClick={fetchSummary}>View</button>
          <button className="btn btn-secondary" onClick={handlePrint}>Print</button>
          <button className="btn btn-danger" onClick={handleDownload}>Download</button>
        </div>
      </div>

      {data && (
        <div id="summary-section" className="bg-white p-4 rounded shadow-sm">
          <div className="text-center mb-3">
            <h5 className="fw-bold mb-1">
              OP CENSUS OF DISTRICT POLICE HOSPITAL, {String(institute?.Institute_Name || "").toUpperCase()}
            </h5>
            <div className="small text-muted">
              {type === "daily" ? `FOR ${formatDateDMY(date)}` : type === "yearly" ? `FOR YEAR ${year}` : `FOR ${pad(startMonth)}-${startYear} TO ${pad(endMonth)}-${endYear}`}
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-3">
          <h6 className="fw-semibold mb-0">Census Table</h6>

          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={viewCensusExcel}
            >
              View Excel
            </button>

            <button
              className="btn btn-sm btn-success"
              onClick={downloadCensusExcel}
            >
              Export Excel
            </button>
          </div>
        </div>
          <table className="table table-bordered mt-2">
            <thead className="table-light text-center align-middle">
              <tr>
                <th style={{ width: "70px" }}>S.No</th>
                <th style={{ width: "130px" }}>Date</th>
                <th>Male</th>
                <th>Female</th>
                <th>Male Child</th>
                <th>Female Child</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCensusRows.map((row, index) => (
                <tr key={`${row.date}-${index}`}>
                  <td className="text-center">
                  {(diseasePage - 1) * rowsPerPage + index + 1}
                  </td>
                  <td>{formatDateDMY(row.date)}</td>
                  <td className="text-center">{row.male}</td>
                  <td className="text-center">{row.female}</td>
                  <td className="text-center">{row.maleChild}</td>
                  <td className="text-center">{row.femaleChild}</td>
                  <td className="text-center fw-semibold">{row.total}</td>
                </tr>
              ))}

              {(data.censusRows || []).length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted">
                    No census data available for selected period.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot className="table-light fw-bold">
              <tr>
                <td colSpan={2} className="text-end">TOTAL</td>
                <td className="text-center">{data.totals?.male ?? 0}</td>
                <td className="text-center">{data.totals?.female ?? 0}</td>
                <td className="text-center">{data.totals?.maleChild ?? 0}</td>
                <td className="text-center">{data.totals?.femaleChild ?? 0}</td>
                <td className="text-center">{data.totals?.total ?? 0}</td>
              </tr>
            </tfoot>
          </table>
          
            <div className="d-flex justify-content-center align-items-center gap-2 mt-3">
              <button
                className="btn btn-sm btn-outline-dark"
                disabled={diseasePage === 1}
                onClick={() => setDiseasePage(diseasePage - 1)}
              >
                Prev
              </button>

              {[...Array(Math.ceil((data?.censusRows?.length || 0) / rowsPerPage))].map((_, i) => (
                <button
                  key={i}
                  className={`btn btn-sm ${diseasePage === i + 1 ? "btn-dark" : "btn-outline-dark"}`}
                  onClick={() => setDiseasePage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}

              <button
                className="btn btn-sm btn-outline-dark"
                disabled={diseasePage === Math.ceil((data?.censusRows?.length || 0) / rowsPerPage)}
                onClick={() => setDiseasePage(diseasePage + 1)}
              >
                Next
              </button>

            </div>

          <div className="row g-2 mt-3">
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card p-3 text-center">
                <div className="small text-muted">Male</div>
                <div className="h5 fw-bold">{data.totals?.male ?? 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card p-3 text-center">
                <div className="small text-muted">Female</div>
                <div className="h5 fw-bold">{data.totals?.female ?? 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card p-3 text-center">
                <div className="small text-muted">Children</div>
                <div className="h5 fw-bold">{(data.totals?.maleChild ?? 0) + (data.totals?.femaleChild ?? 0)}</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card p-3 text-center">
                <div className="small text-muted">Male Children</div>
                <div className="h5 fw-bold">{data.totals?.maleChild ?? 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card p-3 text-center">
                <div className="small text-muted">Female Children</div>
                <div className="h5 fw-bold">{data.totals?.femaleChild ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="row mt-4">

            {/* Disease Distribution */}
            <div className="col-md-6 mb-3">
              <div className="card p-3 h-100">
                <div className="fw-semibold mb-2">Disease Distribution</div>

                {data.diseaseSummary && data.diseaseSummary.length > 0 ? (
                  <>
                    <div style={{height:"280px"}}>
                      <Bar
                        data={diseaseChartData}
                        options={{
                          maintainAspectRatio:false,
                          plugins:{legend:{display:false}}
                        }}
                      />
                    </div>
                    <table className="table table-sm mt-3">
                      <thead>
                        <tr>
                          <th>Disease</th>
                          <th className="text-end">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.diseaseSummary.map((d, i) => (
                          <tr key={i}>
                            <td>{d.diseaseName}</td>
                            <td className="text-end">{d.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <div className="text-muted">No disease data</div>
                )}
              </div>
            </div>


            {/* Category Summary */}
            <div className="col-md-6 mb-3">
              <div className="card p-3 h-100">
                <div className="fw-semibold mb-2">Category Summary</div>

                {data.categorySummary && data.categorySummary.length > 0 ? (
                  <>
                    <div style={{height:"280px"}}>
                      <Pie
                        data={categoryChartData}
                        options={{
                          maintainAspectRatio:false
                        }}
                      />
                    </div>

                    <table className="table table-sm mt-3">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th className="text-end">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.categorySummary.map((c, i) => (
                          <tr key={i}>
                            <td>{c.category}</td>
                            <td className="text-end">{c.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <div className="text-muted">No category data</div>
                )}
              </div>
            </div>
          </div>

          <div className="card mt-3 p-3">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="fw-semibold">Medicine Usage</div>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={viewMedicineExcel}
                >
                  View Excel
                </button>

                <button
                  className="btn btn-sm btn-success"
                  onClick={downloadMedicineExcel}
                >
                  Export Excel
                </button>
              </div>
            </div>
            {data.medicineUsage && data.medicineUsage.length > 0 ? (
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th className="text-end">Total Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMedicines.map((m, i) => (
                    <tr key={i}>
                      <td>{m.medicineName}</td>
                      <td className="text-end">{m.totalQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
            ) : (
              <div className="text-muted">No medicine usage data</div>
            )}
          </div>
          <div className="d-flex justify-content-center align-items-center gap-2 mt-3">
            <button
              className="btn btn-sm btn-outline-dark"
              disabled={medicinePage === 1}
              onClick={() => setMedicinePage(medicinePage - 1)}
            >
              Prev
            </button>

            {[...Array(Math.ceil((data?.medicineUsage?.length || 0) / rowsPerPage))].map((_, i) => (
              <button
                key={i}
                className={`btn btn-sm ${medicinePage === i + 1 ? "btn-dark" : "btn-outline-dark"}`}
                onClick={() => setMedicinePage(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            <button
              className="btn btn-sm btn-outline-dark"
              disabled={medicinePage === Math.ceil((data?.medicineUsage?.length || 0) / rowsPerPage)}
              onClick={() => setMedicinePage(medicinePage + 1)}
            >
              Next
            </button>

          </div>
        </div>
      )}

      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #summary-section, #summary-section * {
              visibility: visible;
            }
            #summary-section {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}
      </style>
    </div>
  );
};

export default HealthSummary;
