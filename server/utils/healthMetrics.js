const parseMetricNumber = (value) => {
  if (value === null || value === undefined) return null;
  const match = String(value).trim().match(/[\d.]+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const calculateBMI = (heightCm, weightKg) => {
  const height = parseMetricNumber(heightCm);
  const weight = parseMetricNumber(weightKg);

  if (!height || !weight || height <= 0 || weight <= 0) return "";

  const heightM = height / 100;
  return (weight / (heightM * heightM)).toFixed(2);
};

const normalizePatientMetrics = ({ Height, Weight, BMI } = {}) => {
  const normalizedHeight = Height === null || Height === undefined ? "" : String(Height).trim();
  const normalizedWeight = Weight === null || Weight === undefined ? "" : String(Weight).trim();

  return {
    Height: normalizedHeight,
    Weight: normalizedWeight,
    BMI: calculateBMI(normalizedHeight, normalizedWeight) || (BMI ? String(BMI).trim() : "")
  };
};

const validateRequiredPatientMetrics = ({ Height, Weight } = {}) => {
  const height = parseMetricNumber(Height);
  const weight = parseMetricNumber(Weight);

  if (!height || height <= 0) {
    return "Height is required and must be a positive number in cm";
  }

  if (!weight || weight <= 0) {
    return "Weight is required and must be a positive number in kg";
  }

  return null;
};

module.exports = {
  calculateBMI,
  normalizePatientMetrics,
  parseMetricNumber,
  validateRequiredPatientMetrics
};
