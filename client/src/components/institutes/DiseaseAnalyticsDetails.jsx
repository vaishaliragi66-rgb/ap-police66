import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

function DiseaseAnalyticsDetails() {

  const { type, value } = useParams();
  const location = useLocation();

  const filters = location.state || {};

  const [diseaseData, setDiseaseData] = useState([]);
  const [designationData, setDesignationData] = useState([]);
  const [ageData, setAgeData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {

    try {

      const institute = JSON.parse(localStorage.getItem("institute"));

      const res = await axios.get(
        `http://localhost:6100/api/analytics/${type}-details/${value}`,
        {
          params: {
            instituteId: institute._id,
            category: filters.category,
            fromDate: filters.fromDate,
            toDate: filters.toDate
          }
        }
      );

      setDiseaseData(res.data.diseaseDistribution || []);
      setDesignationData(res.data.designationDistribution || []);
      setAgeData(res.data.ageDistribution || []);

    } catch (err) {
      console.error(err);
    }

  };

  return (

    <div className="container mt-4">

      <h3>Analytics Details ({value})</h3>
      <p style={{color:"#6c757d"}}>
        Showing results for:
        {filters.category || "All Diseases"} |
        {filters.fromDate || "Start"} - {filters.toDate || "Today"}
        </p>

      {/* Disease Distribution */}

      <div className="mt-4">

        <h5>Disease Distribution</h5>

        <ResponsiveContainer width="100%" height={300}>

          <BarChart data={diseaseData}>

            <CartesianGrid stroke="#E4EAF1" />

            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />

            <Bar dataKey="count" fill="#5A7FA8" />

          </BarChart>

        </ResponsiveContainer>

      </div>

      {/* Show designation distribution only when age is clicked */}

      {type === "age" && designationData.length > 0 && (

        <div className="mt-5">

          <h5>Designation Distribution</h5>

          <ResponsiveContainer width="100%" height={300}>

            <BarChart data={designationData}>

              <CartesianGrid stroke="#E4EAF1" />

              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />

              <Bar dataKey="count" fill="#7B9FC9" />

            </BarChart>

          </ResponsiveContainer>

        </div>

      )}

      {/* Show age distribution when designation is clicked */}

      {type === "designation" && ageData.length > 0 && (

        <div className="mt-5">

          <h5>Age Distribution</h5>

          <ResponsiveContainer width="100%" height={300}>

            <BarChart data={ageData}>

              <CartesianGrid stroke="#E4EAF1" />

              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />

              <Bar dataKey="count" fill="#6F8FB5" />

            </BarChart>

          </ResponsiveContainer>

        </div>

      )}

    </div>

  );

}

export default DiseaseAnalyticsDetails;