import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
function DiseaseAnalyticsTable() {
  const location = useLocation();
  const navigate = useNavigate();
  const { type } = useParams();
  const [viewMode, setViewMode] = useState("all");
  const [sortConfig, setSortConfig] = useState({
  key: null,
  direction: "asc"
});
const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 10;

const handleSort = (key) => {
  let direction = "asc";

  if (sortConfig.key === key && sortConfig.direction === "asc") {
    direction = "desc";
  }

  setSortConfig({ key, direction });
};

  const [data, setData] = useState([]);

  const filters = location.state || {};

useEffect(() => {
  setCurrentPage(1);
}, [viewMode, data]);

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
useEffect(() => {
  fetchData();
}, []);

const normalizedData = data.map((row) => {
  // if already correct (age API)
  if (row.diseases) return row;

  // convert hotspot/designation format
  return {
    _id: row._id,
    diseases: [{
      disease: row._id,   // label itself
      count: row.count
    }]
  };
});
  const openDetails = (value) => {

    navigate(`/institutes/disease-analytics/${type}/${value}`, {
      state: filters
    });

  };

const chartData = normalizedData.map((row) => {
  if (row.diseases) {
    return {
      age: row._id,
      total: row.diseases.reduce((sum, d) => sum + d.count, 0)
    };
  } else {
    return {
      age: row._id,
      total: row.count || 0
    };
  }
});

const total = normalizedData.reduce((sum, row) => {
  if (row.diseases) {
    return sum + row.diseases.reduce((s, d) => s + d.count, 0);
  } else {
    return sum + (row.count || 0);
  }
}, 0);


const sortedData = normalizedData.map((row) => {

  let diseases = [];

  if (row.diseases) {
    diseases =
      viewMode === "top"
        ? [row.diseases[0]]
        : row.diseases;
  } else {
    // fallback for designation API
    diseases = [{
      disease: row.disease,
      count: row.count
    }];
  }

  return {
    ...row,
    diseases
  };
});

const flatRows = [];

sortedData.forEach((row) => {
  let diseasesToShow = [];

if (row.diseases) {
  diseasesToShow =
    viewMode === "top"
      ? [row.diseases[0]]
      : row.diseases;
} else {
  diseasesToShow = [{
    disease: row.disease,
    count: row.count
  }];
}

if (row.diseases) {
  row.diseases.forEach((d, i) => {
    flatRows.push({
      age: row._id,
      disease: d.disease,
      count: d.count,
      isTop: i === 0
    });
  });
} else {
  flatRows.push({
    age: row._id,
    disease: row.disease,
    count: row.count,
    isTop: true
  });
}
});

// 👉 NOW do pagination
const indexOfLast = currentPage * rowsPerPage;
const indexOfFirst = indexOfLast - rowsPerPage;

const currentRows = flatRows.slice(indexOfFirst, indexOfLast);
const totalPages = Math.ceil(flatRows.length / rowsPerPage) || 1;


  return (

    <div className="container mt-4">

      <h3>Disease Analytics ({type})</h3>
    <p style={{color:"#6c757d"}}>
    Showing results for:
    {filters.category || "All Diseases"} |
    {filters.fromDate || "Start"} - {filters.toDate || "Today"}
    </p>

    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
  
  <div className="card p-3 shadow-sm" style={{ flex: 1 }}>
    <h6>Total Cases</h6>
    <h4>{total}</h4>
  </div>

  <div className="card p-3 shadow-sm" style={{ flex: 1 }}>
    <h6>Most Affected Age</h6>
    <h4>{data[0]?._id}</h4>
  </div>

  <div className="card p-3 shadow-sm" style={{ flex: 1 }}>
    <h6>Top Disease</h6>
    <h4>
  {data[0]?.diseases
    ? data[0].diseases[0]?.disease
    : data[0]?.disease || "-"}
</h4>
  </div>

</div>



      <table className="table table-bordered mt-3">

        <thead>
          <tr>
            <th onClick={() => handleSort("age")} style={{ cursor: "pointer" }}>
  Age Range 🔽
</th>
            <th>
  Disease{" "}
  <select
    value={viewMode}
    onChange={(e) => setViewMode(e.target.value)}
    style={{
      marginLeft: "8px",
      padding: "2px",
      fontSize: "12px"
    }}
  >
    <option value="all">All</option>
    <option value="top">Top</option>
  </select>
</th>
            <th onClick={() => handleSort("count")} style={{ cursor: "pointer" }}>
  Count 🔽
</th>

<th onClick={() => handleSort("percent")} style={{ cursor: "pointer" }}>
  % 🔽
</th>
          </tr>
        </thead>

<tbody>

  {currentRows.map((row, index) => {

    const percent = ((row.count / total) * 100).toFixed(1);

    return (
      <tr key={index}>
        <td>{row.age}</td>
        <td>
          {row.disease}
          {row.isTop && viewMode !== "top" && (
            <span style={{ color: "green", marginLeft: "5px" }}>
              (Top)
            </span>
          )}
        </td>
        <td>{row.count}</td>
        <td>{percent}%</td>
      </tr>
    );

  })}

</tbody>

      </table>

      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "15px" }}>

  <button
    disabled={currentPage === 1}
    onClick={() => setCurrentPage(currentPage - 1)}
    className="btn btn-sm btn-secondary"
  >
    Prev
  </button>

  <span style={{ padding: "5px 10px" }}>
    Page {currentPage} of {totalPages}
  </span>

  <button
    disabled={currentPage === totalPages}
    onClick={() => setCurrentPage(currentPage + 1)}
    className="btn btn-sm btn-secondary"
  >
    Next
  </button>

</div>

      <div style={{ width: "100%", height: 300, marginBottom: "30px" }}>
  <ResponsiveContainer>
    <BarChart data={chartData}>
      <XAxis dataKey="age" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="total" />
    </BarChart>
  </ResponsiveContainer>
</div>

    </div>

  );

}

export default DiseaseAnalyticsTable;