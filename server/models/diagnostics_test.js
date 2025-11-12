const mongoose = require("mongoose");
const { Schema } = mongoose;

const DiagnosisTestSchema = new Schema({
  Test_Name: { type: String, required: true, unique: true },
  Group: { type: String },
  Reference_Range: { type: String },
  Units: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("DiagnosisTest", DiagnosisTestSchema);