import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

export default function DesignationAnalyticsDetails() {

  const { designation } = useParams();

  const [diseaseData, setDiseaseData] = useState([]);
  const [ageData, setAgeData] = useState([]);
  const [areaData, setAreaData] = useState([]);
  const BACKEND_API = import.meta.env.VITE_BACKEND_API

  useEffect(() => {

    fetch(`${BACKEND_API}/admin-analytics/designation-details/${designation}`)
      .then(res => res.json())
      .then(data => {

        const diseases = data.diseases.map(d => ({
          name: d._id,
          count: d.count
        }));

        const ages = data.ages.map(d => ({
          name: d._id,
          count: d.count
        }));

        const areas = data.areas.map(d => ({
          name: d._id,
          count: d.count
        }));

        setDiseaseData(diseases);
        setAgeData(ages);
        setAreaData(areas);

      });

  }, [designation]);

  return (
    <div className="container mt-4">

      <h2>Analytics for Designation: {designation}</h2>

      {/* Disease Chart */}

      <h5 className="mt-4">Disease Distribution</h5>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={diseaseData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#4a70a9" />
        </BarChart>
      </ResponsiveContainer>

      {/* Age Chart */}

      <h5 className="mt-5">Age Distribution</h5>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={ageData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#28a745" />
        </BarChart>
      </ResponsiveContainer>

      {/* Area Chart */}

      <h5 className="mt-5">Area Distribution</h5>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={areaData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#ff7f50" />
        </BarChart>
      </ResponsiveContainer>

    </div>
  );
}
