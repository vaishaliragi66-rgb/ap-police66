const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;
const InstituteSchema = new Schema({
  Institute_ID: { type: Number, unique: true },
  Institute_Name: { type: String, required: true, unique: true },
  Email_ID: { type: String },
  Address: { type: String },
  Contact_No: { type: String }
});
module.exports=mongoose.model('Institute',InstituteSchema);