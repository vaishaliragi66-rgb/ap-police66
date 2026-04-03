const { spawn } = require("child_process");
const path = require("path");

exports.predictDisease = (req, res) => {
  const inputData = req.body;

  console.log("Incoming data:", inputData);

  // Validate input data
  if (!inputData || Object.keys(inputData).length === 0) {
    return res.status(400).json({ error: "No input data provided" });
  }

  const scriptPath = path.join(__dirname, "..", "utils", "run_model.py");
  const py = spawn("python", [scriptPath, JSON.stringify(inputData)]);

  let result = "";
  let errorOutput = "";

  py.stdout.on("data", (data) => {
    console.log("PYTHON OUTPUT:", data.toString());
    result += data.toString();
  });

  py.stderr.on("data", (data) => {
    console.error("PYTHON ERROR:", data.toString());
    errorOutput += data.toString();
  });

  py.on("error", (error) => {
    console.error("Failed to start Python process:", error);
    return res.status(500).json({ 
      error: "Failed to start prediction service",
      details: error.message 
    });
  });

  py.on("close", (code) => {
    console.log("Python exited with code:", code);
    
    if (code !== 0) {
      return res.status(500).json({ 
        error: "Prediction failed", 
        details: errorOutput || "Unknown error",
        exitCode: code
      });
    }

    if (!result || result.trim() === "") {
      return res.status(500).json({ 
        error: "No output from prediction service" 
      });
    }

    try {
      const parsedResult = JSON.parse(result);
      res.json(parsedResult);
    } catch (err) {
      console.error("Failed to parse result:", err);
      res.status(500).json({ 
        error: "Invalid response from prediction service",
        details: err.message,
        rawOutput: result.substring(0, 200)
      });
    }
  });
};