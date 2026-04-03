import React, { useState } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Predict() {
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    designation: "",
    height: "",
    weight: "",
    temperature: "",
    pulse: "",
    systolic_bp: "",
    diastolic_bp: "",
    comorbidity_count: "",
  });
  const calculateBMI = () => {
    const heightM = formData.height / 100;
    return formData.weight / (heightM * heightM);
  };

  const [prediction, setPrediction] = useState(null);

  // handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // handle predict click
  const handlePredict = async (e) => {
    e.preventDefault();

    console.log("clicked");

    try {
      const res = await fetch(`${BACKEND_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          age: Number(formData.age),
          gender: Number(formData.gender),
          designation: Number(formData.designation),
          bmi: calculateBMI(),
          temperature: Number(formData.temperature),
          pulse: Number(formData.pulse),
          systolic_bp: Number(formData.systolic_bp),
          diastolic_bp: Number(formData.diastolic_bp),
          comorbidity_count: Number(formData.comorbidity_count),
        }),
      });

      const data = await res.json();

      console.log("response:", data);

      // Check if response is an error
      if (!res.ok || data.error) {
        setPrediction({ error: data.error || data.details || "Prediction failed" });
        return;
      }

      // Check if response is an array
      if (!Array.isArray(data)) {
        setPrediction({ error: "Invalid response format from server" });
        return;
      }

      setPrediction(data);
    } catch (error) {
      console.error("Error:", error);
      setPrediction({ error: "Failed to connect to prediction service" });
    }
  };

  return (
    <div className="container mt-4">
      <h3>Disease Prediction</h3>

      <form onSubmit={handlePredict}>
        <div className="mb-3">
          <label>Age</label>
          <input
            type="number"
            name="age"
            className="form-control"
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Gender (0 = Female, 1 = Male)</label>
          <input
            type="number"
            name="gender"
            className="form-control"
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
            <label>Designation (Encoded)</label>
            <input
              type="number"
              name="designation"
              className="form-control"
              onChange={handleChange}
            />
          </div>
          <div className="mb-3">
            <label>Height (cm)</label>
            <input type="number" name="height" className="form-control" onChange={handleChange} />
          </div>

          <div className="mb-3">
            <label>Weight (kg)</label>
            <input type="number" name="weight" className="form-control" onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label>Temperature (°C)</label>
            <input type="number" name="temperature" className="form-control" onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label>Pulse</label>
            <input type="number" name="pulse" className="form-control" onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label>Systolic BP</label>
            <input type="number" name="systolic_bp" className="form-control" onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label>Diastolic BP</label>
            <input type="number" name="diastolic_bp" className="form-control" onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label>Comorbidity Count</label>
            <input type="number" name="comorbidity_count" className="form-control" onChange={handleChange} />
          </div>
        <button type="submit" className="btn btn-primary">
          Predict
        </button>
      </form>

      {/* RESULT */}
      {prediction && (
        <div className="mt-4">
          <h5>Prediction Result</h5>
          
          {/* Error case */}
          {prediction.error && (
            <div className="alert alert-danger mt-3">
              <strong>Error:</strong> {prediction.error}
            </div>
          )}

          {/* Success - no disease risk */}
          {Array.isArray(prediction) && prediction.length === 0 && (
            <div className="alert alert-success mt-3">
              No significant disease risk detected ✅
            </div>
          )}

          {/* Success - diseases detected */}
          {Array.isArray(prediction) && prediction.length > 0 && prediction.map((item, index) => (
            <div
              key={index}
              className="card p-3 mb-2 shadow-sm"
              style={{ borderLeft: "5px solid #0d6efd" }}
            >
              <h6>{item.disease}</h6>
              <p>Probability: {(item.probability * 100).toFixed(1)}%</p>
              <p>
                Risk:{" "}
                <span
                  className={
                    item.risk === "High"
                      ? "text-danger"
                      : item.risk === "Medium"
                      ? "text-warning"
                      : "text-success"
                  }
                >
                  {item.risk}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Predict;