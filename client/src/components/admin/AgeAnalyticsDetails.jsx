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

export default function AgeAnalyticsDetails() {

  const BACKEND_API = import.meta.env.VITE_BACKEND_API

  const { ageRange } = useParams();

  const [diseaseData, setDiseaseData] = useState([]);
  const [designationData, setDesignationData] = useState([]);
  const [areaData, setAreaData] = useState([]);

  useEffect(() => {

    fetch(`${BACKEND_API}/admin-analytics/age-details/${ageRange}`)
      .then(res => res.json())
      .then(data => {

        setDiseaseData(data.diseases);
        setDesignationData(data.designations);
        setAreaData(data.areas);

      });

  }, [ageRange]);

  return (
    <div className="container mt-4">

      <h2 className="mb-4">Analytics for Age {ageRange}</h2>

      {/* Disease Chart */}

      <h5>Disease Distribution</h5>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={diseaseData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="_id" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#4a70a9" />
        </BarChart>
      </ResponsiveContainer>


      {/* Designation Chart */}

      <h5 className="mt-5">Designation Distribution</h5>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={designationData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="_id" />
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
          <XAxis dataKey="_id" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#ff7f50" />
        </BarChart>
      </ResponsiveContainer>

    </div>
  );
}