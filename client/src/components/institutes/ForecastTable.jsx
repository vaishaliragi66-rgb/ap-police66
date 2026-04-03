import React, { useEffect, useState } from "react";
import axios from "axios";

const getBadge = (confidence) => {
  if (confidence === "High")
    return "bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm font-semibold";
  if (confidence === "Medium")
    return "bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-sm font-semibold";
  return "bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-semibold";
};
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const ForecastDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/forecast/next-month`)
      .then((res) => {
        // Check if response has expected structure
        if (res.data && res.data.age_groups && res.data.designations) {
          setData(res.data);
        } else if (res.data && res.data.error) {
          setError(res.data.error);
        } else {
          setError("Invalid response format from server");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || err.message || "Failed to load forecast data");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-6 text-lg">Loading AI Forecast...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-red-500">Failed to load data</div>;
  }

  // 🔥 Summary calculations
  const totalAgeGroups = Object.keys(data.age_groups).length;
  const totalDesignations = Object.keys(data.designations).length;

  const highRiskCount = Object.values(data.designations)
    .flat()
    .filter((d) => d.confidence === "High").length;

  return (
    <div className="p-6 space-y-10 bg-gray-50 min-h-screen">
      
      {/* 🔥 HEADER */}
      <h1 className="text-3xl font-bold text-gray-800">
        Health Forecast Dashboard
      </h1>

      {/* 🔥 SUMMARY CARDS */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl shadow">
          <h3 className="text-gray-500">Age Groups</h3>
          <p className="text-2xl font-bold">{totalAgeGroups}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <h3 className="text-gray-500">Designations</h3>
          <p className="text-2xl font-bold">{totalDesignations}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <h3 className="text-gray-500">High Risk Alerts</h3>
          <p className="text-2xl font-bold text-red-600">{highRiskCount}</p>
        </div>
      </div>

      {/* 🔵 AGE GROUP TABLE */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Age Group Forecast</h2>

        <table className="w-full">
          <thead>
            <tr className="text-left border-b">
              <th className="p-3">Age Group</th>
              <th className="p-3">Predicted Diseases</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.age_groups).map(([age, diseases]) => (
              <tr key={age} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{age}</td>
                <td className="p-3 space-x-2">
                  {diseases.length === 0 ? (
                    <span className="text-green-600 font-semibold">
                      No significant risk
                    </span>
                  ) : (
                    diseases.map((d, i) => (
                      <span key={i} className={getBadge(d.confidence)}>
                        {d.disease}
                      </span>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🔵 DESIGNATION TABLE */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Designation Forecast</h2>

        <table className="w-full">
          <thead>
            <tr className="text-left border-b">
              <th className="p-3">Designation</th>
              <th className="p-3">Predicted Diseases</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.designations).map(([desig, diseases]) => (
              <tr key={desig} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{desig}</td>
                <td className="p-3 space-x-2">
                  {diseases.length === 0 ? (
                    <span className="text-green-600 font-semibold">
                      No significant risk
                    </span>
                  ) : (
                    diseases.map((d, i) => (
                      <span key={i} className={getBadge(d.confidence)}>
                        {d.disease}
                      </span>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default ForecastDashboard;