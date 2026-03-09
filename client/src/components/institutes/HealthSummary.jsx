import React, { useState } from "react";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "bootstrap/dist/css/bootstrap.min.css";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, ChartDataLabels);

const HealthSummary = () => {
  const institute = JSON.parse(localStorage.getItem("institute") || "{}");
  const instituteId = institute?._id;

  const [type, setType] = useState("daily");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [data, setData] = useState(null);

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

  const diseaseChartData = data && {
    labels: data.diseaseSummary.map(d => d.diseaseName),
    datasets: [{
      label: "Disease Count",
      data: data.diseaseSummary.map(d => d.count),
      backgroundColor: "#3B6FB6"
    }]
  };

  const categoryChartData = data && {
  labels: data.categorySummary.map(c => c.category),
  datasets: [{
    data: data.categorySummary.map(c => c.count),
    backgroundColor: ["#28a745", "#dc3545"],
    
    datalabels: {
      color: "#fff",
      font: {
        weight: "bold",
        size: 16
      },
      formatter: (value) => value
    }
  }]
};


  return (
    <div className="container my-4">
      <h3 className="fw-bold mb-4 text-center">Health Summary</h3>

      {/* Filter Card */}
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

          {/* REPORT HEADER */}
          <div className="text-center mb-4">
            <h4 className="fw-bold">{institute?.Institute_Name}</h4>
            <p className="mb-0">
              {type === "daily"
                ? `Daily Report - ${date}`
                : `Monthly Report - ${month}/${year}`}
            </p>
            <hr />
          </div>

          {/* DEMOGRAPHICS */}
          {/* MONTHLY CENSUS TABLE */}
          {type === "monthly" && data?.monthlySummary && (
            <div className="card p-3 shadow-sm mb-4">
              <h6 className="fw-bold text-center mb-3">Monthly OP Census</h6>
              <div className="table-responsive">
                <table className="table table-bordered text-center">
                  <thead className="table-light">
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
                    {data.monthlySummary.map((row, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{new Date(row.date).toLocaleDateString()}</td>
                        <td>{row.male}</td>
                        <td>{row.female}</td>
                        <td>{row.maleChildren}</td>
                        <td>{row.femaleChildren}</td>
                        <td className="fw-bold">{row.totalPatients}</td>
                      </tr>
                    ))}
                    {/* TOTAL ROW */}
                    <tr className="table-secondary fw-bold">
                      <td colSpan="2">TOTAL</td>
                      <td>{data.monthlySummary.reduce((sum, r) => sum + r.male, 0)}</td>
                      <td>{data.monthlySummary.reduce((sum, r) => sum + r.female, 0)}</td>
                      <td>{data.monthlySummary.reduce((sum, r) => sum + r.maleChildren, 0)}</td>
                      <td>{data.monthlySummary.reduce((sum, r) => sum + r.femaleChildren, 0)}</td>
                      <td>{data.monthlySummary.reduce((sum, r) => sum + r.totalPatients, 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="row g-3 mb-4">
            {Object.entries(data.demographics).map(([key, value]) => (
              <div className="col-lg-2 col-md-4 col-6" key={key}>
                <div className="card text-center p-3 shadow-sm">
                  <small className="text-muted text-capitalize">{key}</small>
                  <h5 className="fw-bold">{value}</h5>
                </div>
              </div>
            ))}
          </div>

          {/* CHARTS ROW */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card p-3 shadow-sm">
                <h6 className="fw-bold text-center">Disease Distribution</h6>
                <div style={{ height: "300px" }}>
                  <Bar
                    data={diseaseChartData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        datalabels: {
                          anchor: "end",
                          align: "top",
                          formatter: (value) => value,
                          font: { weight: "bold" }
                        }
                      }
                    }}
                  />

                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card p-3 shadow-sm">
                <h6 className="fw-bold text-center">Category Summary</h6>
                <div style={{ height: "300px" }}>
                  <Pie
                    data={categoryChartData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "bottom" }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* MEDICINE TABLE */}
          <div className="card p-3 shadow-sm">
            <h6 className="fw-bold">Medicine Usage</h6>
            <table className="table table-bordered mt-3">
              <thead className="table-light">
                <tr>
                  <th>Medicine</th>
                  <th>Total Quantity</th>
                </tr>
              </thead>
              <tbody>
                {data.medicineUsage.map((m, i) => (
                  <tr key={i}>
                    <td>{m.medicineName}</td>
                    <td>{m.totalQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* PRINT STYLES */}
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