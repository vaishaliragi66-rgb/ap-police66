import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
function RiskHotspots() {

  const [designationRisk,setDesignationRisk]=useState([]);
  const [ageRisk,setAgeRisk]=useState([]);
const [districtRisk, setDistrictRisk] = useState([]);
  const [diseaseRisk,setDiseaseRisk]=useState([]);
    const [severityData,setSeverityData]=useState([]);
      const topDiseases = [...diseaseRisk]
  .sort((a, b) => b.count - a.count)
  .slice(0, 5);
const dominantSeverity =
  [...severityData].sort((a, b) => b.count - a.count)[0]?._id || "-";
  const location = useLocation();
  const filters = location.state || {};
  
  useEffect(()=>{

    fetchData();

  },[]);

 const fetchData = async () => {
  try {

    const institute = JSON.parse(localStorage.getItem("institute"));

    const res = await axios.get(
      `${BACKEND_URL}/api/analytics/risk-hotspots`,
      {
        params: {
          instituteId: institute._id,
          category: filters.category,
          fromDate: filters.fromDate,
          toDate: filters.toDate
        }
      }
    );

    console.log("HOTSPOT DATA:", res.data);

    setDesignationRisk(res.data.designationRisk || []);
    setAgeRisk(res.data.ageRisk || []);
    setDiseaseRisk(res.data.diseaseRisk || []);
    setSeverityData(res.data.severityData || []);
setDistrictRisk(res.data.districtRisk || []);
  } catch (err) {
    console.error("API ERROR:", err);
  }
};
const sortedDesignation = [...designationRisk].sort((a, b) => b.count - a.count);
const sortedAge = [...ageRisk].sort((a, b) => b.count - a.count);
const sortedDisease = [...diseaseRisk].sort((a, b) => b.count - a.count);
const sortedSeverity = [...severityData].sort((a, b) => b.count - a.count);
const topAlerts = sortedDisease.slice(0, 3);
const totalCases = sortedDisease.reduce((sum, d) => sum + d.count, 0);
const riskScore =
  dominantSeverity === "Severe"
    ? "High"
    : dominantSeverity === "Moderate"
    ? "Medium"
    : "Low";
  return(

<div className="container mt-4">

<h3>Health Risk Hotspots</h3>
<p style={{color:"#6c757d"}}>
Showing results for:
{filters.category || "All Diseases"} |
{filters.fromDate || "Start"} - {filters.toDate || "Today"}
</p>


<div className="card p-3 shadow-sm mb-4">
  <h6>⚠️ Risk Insight</h6>
    <p>
  Risk Score:{" "}
  <b style={{
    color:
      riskScore === "High" ? "red" :
      riskScore === "Medium" ? "orange" : "green"
  }}>
    {riskScore}
  </b>
</p>

  <p>
  Overall Risk Level:{" "}
  <b style={{
    color:
      dominantSeverity === "Severe"
        ? "#ff4d4f"
        : dominantSeverity === "Moderate"
        ? "#faad14"
        : "#52c41a"
  }}>
    {dominantSeverity}
  </b>
</p>

  <p>
    High risk diseases:{" "}
    {topDiseases.length === 0 ? (
      <span>-</span>
    ) : (
      topDiseases.map((d, i) => (
        <span key={i}>
          {d._id}
          {i < topDiseases.length - 1 ? ", " : ""}
        </span>
      ))
    )}
  </p>
</div>
<h5 className="mt-4">High Risk Designations</h5>
<p style={{color:"#6c757d"}}>
Number of employees diagnosed with at least one disease in each designation
</p>


<div className="card p-3 shadow-sm mb-4">


  <h6>🚨 Top Risk Alerts</h6>

  <ul style={{ marginBottom: 0 }}>
    {topAlerts.map((d, i) => (
      <li key={i}>
        {d._id} → {d.count} cases
      </li>
    ))}
  </ul>
</div>

<h5 className="mt-4">High Risk Districts</h5>
<p style={{color:"#6c757d"}}>
Number of cases reported in each district
</p>

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={districtRisk}>
    <CartesianGrid stroke="#E4EAF1"/>
    <XAxis
      dataKey="_id"
      angle={-30}
      textAnchor="end"
      interval={0}
    />
    <YAxis/>
    <Tooltip
  formatter={(value, name, props) => [
    `${value} cases`,
    `Top Disease: ${props.payload.topDisease || "-"}`
  ]}
/>
    <Bar dataKey="count" fill="#8884d8"/>
  </BarChart>
</ResponsiveContainer>

<ResponsiveContainer width="100%" height={300}>
<BarChart data={sortedDesignation}>
<CartesianGrid stroke="#E4EAF1"/>
<XAxis
  dataKey="_id"
  angle={-30}
  textAnchor="end"
  interval={0}
/>
<YAxis/>
<Tooltip
  formatter={(value, name, props) => [
    `${value} cases`,
    `Top Disease: ${props.payload.topDisease || "-"}`
  ]}
/>
<Bar dataKey="count" fill="#5A7FA8" />
</BarChart>
</ResponsiveContainer>


<h5 className="mt-5">High Risk Age Groups</h5>
<p style={{color:"#6c757d"}}>
Number of employees diagnosed with diseases within each age range
</p>
<ResponsiveContainer width="100%" height={300}>
<BarChart data={sortedAge}>
<CartesianGrid stroke="#E4EAF1"/>
<XAxis
  dataKey="_id"
  angle={-30}
  textAnchor="end"
  interval={0}
/>
<YAxis/>
<Tooltip
  formatter={(value, name, props) => [
    `${value} cases`,
    `Top Disease: ${props.payload.topDisease || "-"}`
  ]}
/>
<Bar dataKey="count" fill="#7B9FC9"/>
</BarChart>
</ResponsiveContainer>

<h5 className="mt-5">Top Diseases</h5>

<ResponsiveContainer width="100%" height={300}>
<BarChart data={sortedDisease}>
<CartesianGrid stroke="#E4EAF1"/>
<XAxis
  dataKey="_id"
  angle={-30}
  textAnchor="end"
  interval={0}
/>
<YAxis/>
<Tooltip
  formatter={(value) =>
    `${value} cases (${((value / totalCases) * 100).toFixed(1)}%)`
  }
/>
<Bar dataKey="count" fill="#6F8FB5"/>
</BarChart>
</ResponsiveContainer>

<h5 className="mt-5">Severity Distribution</h5>

<ResponsiveContainer width="100%" height={300}>

<BarChart data={sortedSeverity}>

<CartesianGrid stroke="#E4EAF1"/>

<XAxis
  dataKey="_id"
  angle={-30}
  textAnchor="end"
  interval={0}
/>
<YAxis/>
<Tooltip
  formatter={(value, name, props) => [
    `${value} cases`,
    `Disease: ${props.payload.topDisease}`
  ]}
/>

<Bar dataKey="count">
  {sortedSeverity.map((entry, index) => (
    <Cell
      key={`cell-${index}`}
      fill={
        entry._id === "Severe"
          ? "#ff4d4f"
          : entry._id === "Moderate"
          ? "#faad14"
          : "#52c41a"
      }
    />
  ))}
</Bar>

</BarChart>

</ResponsiveContainer>



</div>

  );

}

export default RiskHotspots;