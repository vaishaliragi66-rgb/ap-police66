const { spawn } = require("child_process");
const path = require("path");

exports.getBatchForecast = (req, res) => {
  const scriptPath = path.join(__dirname, "..", "utils", "forecast_model", "run_forecast_model.py");
  const py = spawn("python", [scriptPath]);

  let result = "";
  let errorOutput = "";
  let completed = false;

  // Set longer timeout for forecast (more data processing)
  const timeout = setTimeout(() => {
    if (!completed) {
      completed = true;
      py.kill();
      return res.status(504).json({ 
        error: "Forecast request timeout",
        details: "The forecast service took too long to respond"
      });
    }
  }, 60000); // 60 seconds timeout

  py.stdout.on("data", (data) => {
    console.log("FORECAST OUTPUT:", data.toString());
    result += data.toString();
  });

  py.stderr.on("data", (data) => {
    console.error("FORECAST ERROR:", data.toString());
    errorOutput += data.toString();
  });

  py.on("error", (error) => {
    if (completed) return;
    completed = true;
    clearTimeout(timeout);
    
    console.error("Failed to start Python process:", error);
    return res.status(500).json({ 
      error: "Failed to start forecast service",
      details: "Python runtime not available or script not found"
    });
  });

  py.on("close", (code) => {
    if (completed) return;
    completed = true;
    clearTimeout(timeout);
    
    console.log("Forecast Python exited with code:", code);
    
    if (code !== 0) {
      return res.status(500).json({ 
        error: "Forecast generation failed", 
        details: errorOutput || "Python script exited with error",
        exitCode: code
      });
    }

    if (!result || result.trim() === "") {
      return res.status(500).json({ 
        error: "No output from forecast service",
        details: errorOutput || "Python script produced no output"
      });
    }

    try {
      const parsedResult = JSON.parse(result);
      res.json(parsedResult);
    } catch (err) {
      console.error("Failed to parse forecast result:", err);
      res.status(500).json({ 
        error: "Invalid response from forecast service",
        details: "Failed to parse JSON output",
        rawOutput: result.substring(0, 200)
      });
    }
  });
};