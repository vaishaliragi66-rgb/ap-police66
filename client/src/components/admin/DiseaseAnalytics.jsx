import React, { useState ,useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./DiseaseAnalytics.css";
import { useNavigate } from "react-router-dom";



export default function DiseaseAnalytics() {

  const [category, setCategory] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");



  const [data, setData] = useState([]);
  const [type, setType] = useState("");

  const [ageFilter, setAgeFilter] = useState("All");

const navigate = useNavigate();

  const buildQuery = () => {
    let query = [];
  
    if (category !== "All") query.push(`category=${category}`);
    if (fromDate) query.push(`fromDate=${fromDate}`);
    if (toDate) query.push(`toDate=${toDate}`);
    if (ageFilter !== "All") query.push(`ageRange=${encodeURIComponent(ageFilter)}`);
  
    return query.length ? "?" + query.join("&") : "";
  };

  const callAPI = async (analyticsType) => {

    setType(analyticsType);
  
    const query = buildQuery();
  
    const res = await fetch(
      `http://localhost:6100/admin-analytics/overall/${analyticsType}${query}`
    );
  
    const result = await res.json();
  
    setData(result);
  };
  

  useEffect(() => {

    if (!type) return;   // don't run before a button is clicked
  
    callAPI(type);
  
  }, [category, fromDate, toDate, ageFilter]);
  

  const renderTableHeader = () => {

    if (type === "age") {
      return (
        <tr>
          <th>Age Range</th>
          <th>Disease</th>
          <th>Count</th>
        </tr>
      );
    }

    if (type === "area") {
      return (
        <tr>
          <th>District</th>
          <th>Disease</th>
          <th>Count</th>
        </tr>
      );
    }

    if (type === "designation") {
      return (
        <tr>
          <th>Designation</th>
          <th>Disease</th>
          <th>Count</th>
        </tr>
      );
    }

   

  };
  let sortedData = [...data];

  // AGE SORT
  if (type === "age") {
  
    const order = ["20-25", "26-30", "31-35", "36-40", "40+"];
  
    sortedData.sort((a, b) =>
      order.indexOf(a?.ageRange) - order.indexOf(b?.ageRange)
    );
  }
  
  // AREA SORT
  if (type === "area") {
  
    sortedData.sort((a, b) =>
      (a?.district || "").localeCompare(b?.district || "")
    );
  }
  
  // DESIGNATION SORT
  if (type === "designation") {
  
    sortedData.sort((a, b) =>
      (a?.designation || "").localeCompare(b?.designation || "")
    );
  }

  const renderTableRows = () => {

    return sortedData.map((item, index) => {

      if (type === "age") {
        return (
          <tr key={index}
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/admin/disease-analytics/age/${item.ageRange}`)}>
            <td>{item.ageRange}</td>
            <td>{item.disease}</td>
            <td>{item.count}</td>
          </tr>
        );
      }

      if (type === "area") {
        return (
            <tr
            key={index}
            style={{ cursor: "pointer" }}
            onClick={() =>
              navigate(`/admin/disease-analytics/area/${item.district}`)
            }
          >
            <td>{item.district}</td>
            <td>{item.disease}</td>
            <td>{item.count}</td>
          </tr>
        );
      }

      if (type === "designation") {
        return (
          <tr key={index}
          style={{ cursor: "pointer" }}
            onClick={() =>
              navigate(`/admin/disease-analytics/designation/${item.designation}`)
            }>
            <td>{item.designation}</td>
            <td>{item.disease}</td>
            <td>{item.count}</td>
          </tr>
        );
      }

     

    });

  };

  return (
    <div className="container analytics-page">

      <h2 className="mb-4">Disease Analytics</h2>

      {/* FILTER CARD */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">

          <h5 className="mb-3">Filters</h5>

          <div className="row">

            <div className="col-md-3">
              <label className="form-label">Disease Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Communicable">Communicable</option>
                <option value="Non-Communicable">Non-Communicable</option>
              </select>
            </div>
            <div className="col-md-3">
            <label className="form-label">Age Range</label>
            <select
                className="form-select"
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
            >
                <option value="All">All</option>
                <option value="20-25">20-25</option>
                <option value="26-30">26-30</option>
                <option value="31-35">31-35</option>
                <option value="36-40">36-40</option>
                <option value="40+">40+</option>
            </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

          </div>

        </div>
      </div>

      {/* BUTTONS */}
      <div className="mb-4 d-flex gap-3 flex-wrap">

        <button
          className="btn btn-primary"
          onClick={() => callAPI("age")}
        >
          Analytics By Age
        </button>

        <button
          className="btn btn-success"
          onClick={() => callAPI("area")}
        >
          Analytics By Area
        </button>

        <button
          className="btn btn-dark text-white"
          onClick={() => callAPI("designation")}
        >
          Analytics By Designation
        </button>

       

      </div>

      {/* TABLE */}
      {data.length > 0 && (
        <div className="card shadow-sm">
          <div className="card-body">

            <div className="table-responsive">

              <table className="table table-striped table-hover">

                <thead className="table-dark">
                  {renderTableHeader()}
                </thead>

                <tbody>
                  {renderTableRows()}
                </tbody>

              </table>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}