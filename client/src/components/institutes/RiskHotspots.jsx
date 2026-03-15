import React, { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { useLocation } from "react-router-dom";
function RiskHotspots() {

  const [designationRisk,setDesignationRisk]=useState([]);
  const [ageRisk,setAgeRisk]=useState([]);
  const [diseaseRisk,setDiseaseRisk]=useState([]);
    const [severityData,setSeverityData]=useState([]);
  const location = useLocation();
  const filters = location.state || {};
  useEffect(()=>{

    fetchData();

  },[]);

  const BACKEND_API = import.meta.env.VITE_BACKEND_API

  const fetchData = async ()=>{

    const institute = JSON.parse(localStorage.getItem("institute"));

    const res = await axios.get(
        `${BACKEND_API}/api/analytics/risk-hotspots`,
        {
            params:{
            instituteId: institute._id,
            category: filters.category,
            fromDate: filters.fromDate,
            toDate: filters.toDate
            }
        }
        );

    setDesignationRisk(res.data.designationRisk);
    setAgeRisk(res.data.ageRisk);
    setDiseaseRisk(res.data.diseaseRisk);
    setSeverityData(res.data.severityData);

  };

  return(

<div className="container mt-4">

<h3>Health Risk Hotspots</h3>
<p style={{color:"#6c757d"}}>
Showing results for:
{filters.category || "All Diseases"} |
{filters.fromDate || "Start"} - {filters.toDate || "Today"}
</p>

<h5 className="mt-4">High Risk Designations</h5>
<p style={{color:"#6c757d"}}>
Number of employees diagnosed with at least one disease in each designation
</p>
<ResponsiveContainer width="100%" height={300}>
<BarChart data={designationRisk}>
<CartesianGrid stroke="#E4EAF1"/>
<XAxis dataKey="_id"/>
<YAxis/>
<Tooltip/>
<Bar dataKey="count" fill="#5A7FA8"/>
</BarChart>
</ResponsiveContainer>

<h5 className="mt-5">High Risk Age Groups</h5>
<p style={{color:"#6c757d"}}>
Number of employees diagnosed with diseases within each age range
</p>
<ResponsiveContainer width="100%" height={300}>
<BarChart data={ageRisk}>
<CartesianGrid stroke="#E4EAF1"/>
<XAxis dataKey="_id"/>
<YAxis/>
<Tooltip/>
<Bar dataKey="count" fill="#7B9FC9"/>
</BarChart>
</ResponsiveContainer>

<h5 className="mt-5">Top Diseases</h5>

<ResponsiveContainer width="100%" height={300}>
<BarChart data={diseaseRisk}>
<CartesianGrid stroke="#E4EAF1"/>
<XAxis dataKey="_id"/>
<YAxis/>
<Tooltip/>
<Bar dataKey="count" fill="#6F8FB5"/>
</BarChart>
</ResponsiveContainer>

<h5 className="mt-5">Severity Distribution</h5>

<ResponsiveContainer width="100%" height={300}>

<BarChart data={severityData}>

<CartesianGrid stroke="#E4EAF1"/>

<XAxis dataKey="_id"/>
<YAxis/>
<Tooltip/>

<Bar dataKey="count" fill="#6F8FB5"/>

</BarChart>

</ResponsiveContainer>

</div>

  );

}

export default RiskHotspots;