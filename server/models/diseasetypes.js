const mongoose = require("mongoose");

const DiseaseSchema = new mongoose.Schema({
  id: Number,
  name: String
});

const SubGroupSchema = new mongoose.Schema({
  id: Number,
  name: String,
  diseases: [DiseaseSchema]   // actual diseases
});

const DiseaseTypeSchema = new mongoose.Schema({
  id: Number,
  name: String,               // Cardiovascular Diseases
  subgroups: [SubGroupSchema] // Hypertension, IHD, etc.
});

const MainSchema = new mongoose.Schema({
  id: Number,
  category: String,           // Communicable / Non-communicable
  types: [DiseaseTypeSchema]
});

module.exports = mongoose.model("diseasetypes", MainSchema);