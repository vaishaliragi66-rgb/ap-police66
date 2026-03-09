import React, { useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "bootstrap/dist/css/bootstrap.min.css";

const HealthSummary = () => {
  const institute = JSON.parse(localStorage.getItem("institute") || "{}");
  const instituteId = institute?._id;

  const [type, setType] = useState("daily");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [data, setData] = useState(null);

  const formatDateDMY = (isoDate) => {
    if (!isoDate) return "-";
    const [yyyy, mm, dd] = String(isoDate).split("-");
    if (!yyyy || !mm || !dd) return isoDate;
    return `${dd}-${mm}-${yyyy}`;
  };

  const fetchSummary = async () => {
    try {
      let url = "";

      if (type === "daily") {
        url = `http://localhost:6100/institute-api/health-summary?type=daily&date=${date}&instituteId=${instituteId}`;
      } else {
        url = `http://localhost:6100/institute-api/health-summary?type=monthly&year=${year}&month=${month}&instituteId=${instituteId}`;
      }

      const res = await axios.get(url);
      setData(res.data);
    } catch (error) {
      alert("Error fetching summary");
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
        </div>

        {type === "daily" ? (
          <input type="date" className="form-control mb-3" value={date} onChange={e => setDate(e.target.value)} />
        ) : (
          <div className="row g-2 mb-3">
            <div className="col">
              <input type="number" placeholder="Year" className="form-control" value={year} onChange={e => setYear(e.target.value)} />
            </div>
            <div className="col">
              <input type="number" placeholder="Month (1-12)" className="form-control" value={month} onChange={e => setMonth(e.target.value)} />
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
              {type === "daily"
                ? `FOR ${formatDateDMY(date)}`
                : `FOR ${month}-${year}`}
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
