const { spawn } = require("child_process");

exports.predictDisease = (req, res) => {
  const inputData = req.body;

  console.log("Incoming data:", inputData);

  const py = spawn("python", [
    "utils/run_model.py",   // ✅ FIXED PATH
    JSON.stringify(inputData),
  ]);

  let result = "";

  py.stdout.on("data", (data) => {
    console.log("PYTHON OUTPUT:", data.toString());
    result += data.toString();
  });

  py.stderr.on("data", (data) => {
    console.error("PYTHON ERROR:", data.toString());
  });

  py.on("close", (code) => {
    console.log("Python exited with:", code);
    res.json({ prediction: result.trim() });
  });
};