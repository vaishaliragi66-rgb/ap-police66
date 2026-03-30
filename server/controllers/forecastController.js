const { spawn } = require("child_process");

exports.getBatchForecast = (req, res) => {
  const py = spawn("python", [
    "utils/forecast_model/run_forecast_model.py"
  ]);

  let result = "";

  py.stdout.on("data", (data) => {
    result += data.toString();
  });

  py.stderr.on("data", (data) => {
    console.error("PYTHON ERROR:", data.toString());
  });

  py.on("close", () => {
    try {
      res.json(JSON.parse(result));
    } catch (err) {
      res.status(500).json({ error: "Batch forecast failed" });
    }
  });
};