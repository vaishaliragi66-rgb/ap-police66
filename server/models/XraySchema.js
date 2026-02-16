const mongoose = require("mongoose");
const { Schema } = mongoose;

const XraySchema = new Schema({
  Xray_ID: {
    type: Number,
    unique: true
  },

  Xray_Type: {
    type: String,
    required: true
  },

  Body_Part: {
    type: String,
    required: true
  },

  Side: {
    type: String,
    enum: ["Left", "Right", "Both", "NA"],
    default: "NA"
  },

  View: {
    type: String
  },

  Film_Size: {
    type: String
  }

}, { timestamps: true });

/* AUTO-INCREMENT WITHOUT COUNTER */
XraySchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const lastXray = await mongoose
      .model("Xray")
      .findOne()
      .sort({ Xray_ID: -1 })
      .select("Xray_ID");

    this.Xray_ID = lastXray ? lastXray.Xray_ID + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Xray", XraySchema);
