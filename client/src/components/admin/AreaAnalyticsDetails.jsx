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

export default function AreaAnalyticsDetails() {

  const { district } = useParams();
  const BACKEND_API = import.meta.env.VITE_BACKEND_API

  const [diseaseData, setDiseaseData] = useState([]);
  const [ageData, setAgeData] = useState([]);
  const [designationData, setDesignationData] = useState([]);

  useEffect(() => {

    fetch(`${BACKEND_API}/admin-analytics/area-details/${district}`)
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

        const designations = data.designations.map(d => ({
          name: d._id,
          count: d.count
        }));

        setDiseaseData(diseases);
        setAgeData(ages);
        setDesignationData(designations);

      });

  }, [district]);

  return (
    <div className="container mt-4">

      <h2>Analytics for Area: {district}</h2>

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

      {/* Designation Chart */}

      <h5 className="mt-5">Designation Distribution</h5>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={designationData}>
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


