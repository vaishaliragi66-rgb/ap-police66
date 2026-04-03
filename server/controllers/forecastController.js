const { spawn } = require("child_process");
const path = require("path");

exports.getBatchForecast = (req, res) => {
  const scriptPath = path.join(__dirname, "..", "utils", "forecast_model", "run_forecast_model.py");
  const py = spawn("python", [scriptPath]);

  let result = "";
  let errorOutput = "";

  py.stdout.on("data", (data) => {
    console.log("FORECAST OUTPUT:", data.toString());
    result += data.toString();
  });

  py.stderr.on("data", (data) => {
    console.error("FORECAST ERROR:", data.toString());
    errorOutput += data.toString();
  });

  py.on("error", (error) => {
    console.error("Failed to start Python process:", error);
    return res.status(500).json({ 
      error: "Failed to start forecast service",
      details: error.message 
    });
  });

  py.on("close", (code) => {
    console.log("Forecast Python exited with code:", code);
    
    if (code !== 0) {
      return res.status(500).json({ 
        error: "Forecast generation failed", 
        details: errorOutput || "Unknown error",
        exitCode: code
      });
    }

    if (!result || result.trim() === "") {
      return res.status(500).json({ 
        error: "No output from forecast service" 
      });
    }

    try {
      const parsedResult = JSON.parse(result);
      res.json(parsedResult);
    } catch (err) {
      console.error("Failed to parse forecast result:", err);
      res.status(500).json({ 
        error: "Invalid response from forecast service",
        details: err.message,
        rawOutput: result.substring(0, 200)
      });
    }
  });
};