import React, { useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "bootstrap/dist/css/bootstrap.min.css";

const HealthSummary = () => {
  const institute = JSON.parse(localStorage.getItem("institute") || "{}");
  // prefer full object _id, fallback to standalone instituteId (older flows)
  const instituteId = institute?._id || localStorage.getItem("instituteId");

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
        const url = `http://localhost:6100/institute-api/health-summary?type=daily&date=${date}&instituteId=${instituteId}`;
        const res = await axios.get(url);
        setData(res.data);
        return;
      }

      if (type === "yearly") {
        // build months 1..12 for the selected year
        const months = [];
        for (let m = 1; m <= 12; m++) months.push({ year: Number(year), month: m });
        const calls = months.map(({ year: y, month: m }) =>
          axios.get(`http://localhost:6100/institute-api/health-summary?type=monthly&year=${y}&month=${m}&instituteId=${instituteId}`)
        );

        const results = await Promise.allSettled(calls);
        const mergedRowsMap = new Map();
        let mergedTotals = { male: 0, female: 0, maleChild: 0, femaleChild: 0, total: 0 };

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
          }
        });

        const censusRows = Array.from(mergedRowsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        setData({ censusRows, totals: mergedTotals });
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
          axios.get(`http://localhost:6100/institute-api/health-summary?type=monthly&year=${y}&month=${m}&instituteId=${instituteId}`)
        );
      } else if (year && month) {
        calls = [axios.get(`http://localhost:6100/institute-api/health-summary?type=monthly&year=${year}&month=${month}&instituteId=${instituteId}`)];
      } else {
        alert('Please provide a valid month range or year+month');
        return;
      }

      const results = await Promise.allSettled(calls);
      // collect successful results
      const mergedRowsMap = new Map();
      let mergedTotals = { male: 0, female: 0, maleChild: 0, femaleChild: 0, total: 0 };

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
        }
      });

      const censusRows = Array.from(mergedRowsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      setData({ censusRows, totals: mergedTotals });
    } catch (error) {
      console.error('FetchSummary error', error?.response?.data || error.message || error);
      alert('Error fetching summary — check server logs');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const element = document.getElementById("summary-section");
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    pdf.save("HealthSummary.pdf");
  };

  return (
    <div className="container my-4">
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
                <input type="number" placeholder="Start Month (1-12)" className="form-control" value={startMonth} onChange={e => setStartMonth(e.target.value)} />
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex">
                <input type="number" placeholder="End Year" className="form-control me-2" value={endYear} onChange={e => setEndYear(e.target.value)} />
                <input type="number" placeholder="End Month (1-12)" className="form-control" value={endMonth} onChange={e => setEndMonth(e.target.value)} />
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

          <table className="table table-bordered mt-3">
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
              {(data.censusRows || []).map((row, index) => (
                <tr key={`${row.date}-${index}`}>
                  <td className="text-center">{index + 1}</td>
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

          <div className="mt-3 small">
            <div>MALE = <strong>{data.totals?.male ?? 0}</strong></div>
            <div>FEMALE = <strong>{data.totals?.female ?? 0}</strong></div>
            <div>MALE CHILD = <strong>{data.totals?.maleChild ?? 0}</strong></div>
            <div>FEMALE CHILD = <strong>{data.totals?.femaleChild ?? 0}</strong></div>
            <div>TOTAL = <strong>{data.totals?.total ?? 0}</strong></div>
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
