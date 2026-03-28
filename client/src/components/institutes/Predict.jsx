import React, { useState } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Predict() {
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    bmi: "",
    fever: "",
    high_pulse: "",
  });

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
          bmi: Number(formData.bmi),
          fever: Number(formData.fever),
          high_pulse: Number(formData.high_pulse),
        }),
      });

      const data = await res.json();

      console.log("response:", data);

      setPrediction(data);
    } catch (error) {
      console.error("Error:", error);
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
          <label>BMI</label>
          <input
            type="number"
            name="bmi"
            className="form-control"
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Fever (0 = No, 1 = Yes)</label>
          <input
            type="number"
            name="fever"
            className="form-control"
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>High Pulse (0 = No, 1 = Yes)</label>
          <input
            type="number"
            name="high_pulse"
            className="form-control"
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Predict
        </button>
      </form>

      {/* RESULT */}
      {prediction && (
        <div className="mt-4">
          <h5>Prediction Result</h5>
          <pre>{JSON.stringify(prediction, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default Predict;