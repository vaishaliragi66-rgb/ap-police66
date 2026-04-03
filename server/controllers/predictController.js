const { spawn } = require("child_process");
const path = require("path");

exports.predictDisease = (req, res) => {
  const inputData = req.body;

  console.log("Incoming data:", inputData);

  // Validate input data
  const requiredFields = ['age', 'gender', 'designation', 'bmi', 'temperature', 'pulse', 'systolic_bp', 'diastolic_bp', 'comorbidity_count'];
  const missingFields = requiredFields.filter(field => inputData[field] === undefined || inputData[field] === null);
  
  if (missingFields.length > 0) {
    return res.status(400).json({ 
      error: "Missing required fields", 
      missingFields 
    });
  }

  const scriptPath = path.join(__dirname, "..", "utils", "run_model.py");
  const py = spawn("python", [scriptPath, JSON.stringify(inputData)]);

  let result = "";
  let errorOutput = "";
  let completed = false;

  // Set timeout to prevent hanging
  const timeout = setTimeout(() => {
    if (!completed) {
      completed = true;
      py.kill();
      return res.status(504).json({ 
        error: "Prediction request timeout",
        details: "The prediction service took too long to respond"
      });
    }
  }, 30000); // 30 seconds timeout

  py.stdout.on("data", (data) => {
    console.log("PYTHON OUTPUT:", data.toString());
    result += data.toString();
  });

  py.stderr.on("data", (data) => {
    console.error("PYTHON ERROR:", data.toString());
    errorOutput += data.toString();
  });

  py.on("error", (error) => {
    if (completed) return;
    completed = true;
    clearTimeout(timeout);
    
    console.error("Failed to start Python process:", error);
    return res.status(500).json({ 
      error: "Failed to start prediction service",
      details: "Python runtime not available or script not found"
    });
  });

  py.on("close", (code) => {
    if (completed) return;
    completed = true;
    clearTimeout(timeout);
    
    console.log("Python exited with code:", code);
    
    if (code !== 0) {
      return res.status(500).json({ 
        error: "Prediction failed", 
        details: errorOutput || "Python script exited with error",
        exitCode: code
      });
    }

    if (!result || result.trim() === "") {
      return res.status(500).json({ 
        error: "No output from prediction service",
        details: errorOutput || "Python script produced no output"
      });
    }

    try {
      const parsedResult = JSON.parse(result);
      res.json(parsedResult);
    } catch (err) {
      console.error("Failed to parse result:", err);
      res.status(500).json({ 
        error: "Invalid response from prediction service",
        details: "Failed to parse JSON output",
        rawOutput: result.substring(0, 200)
      });
    }
  });
};