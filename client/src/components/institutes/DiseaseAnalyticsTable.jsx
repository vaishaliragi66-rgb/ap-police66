import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";

function DiseaseAnalyticsTable() {

  const location = useLocation();
  const navigate = useNavigate();
  const { type } = useParams();

  const [data, setData] = useState([]);

  const filters = location.state || {};

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {

    try {

      const institute = JSON.parse(localStorage.getItem("institute"));

      const res = await axios.get(
        `${BACKEND_URL}/api/analytics/${type}-summary`,
        {
          params: {
            instituteId: institute._id,
            category: filters.category,
            fromDate: filters.fromDate,
            toDate: filters.toDate
          }
        }
      );

      setData(res.data);

    } catch (err) {
      console.error(err);
    }

  };

  const openDetails = (value) => {

    navigate(`/institutes/disease-analytics/${type}/${value}`, {
      state: filters
    });

  };

  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (

    <div className="container mt-4">

      <h3>Disease Analytics ({type})</h3>
    <p style={{color:"#6c757d"}}>
    Showing results for:
    {filters.category || "All Diseases"} |
    {filters.fromDate || "Start"} - {filters.toDate || "Today"}
    </p>

      <table className="table table-bordered mt-3">

        <thead>
          <tr>
            <th>{type === "age" ? "Age Range" : "Designation"}</th>
            <th>Disease</th>
            <th>Count</th>
            <th>%</th>
          </tr>
        </thead>

        <tbody>

          {data.map((row, index) => {

            const value = row._id;
            const percent = ((row.count / total) * 100).toFixed(1);

            return (

              <tr
                key={index}
                style={{ cursor: "pointer" }}
                onClick={() => openDetails(value)}
              >
                <td>{value}</td>
                <td>{row.disease}</td>
                <td>{row.count}</td>
                <td>{percent}%</td>
              </tr>

            );

          })}

        </tbody>

      </table>

    </div>

  );

}

export default DiseaseAnalyticsTable;