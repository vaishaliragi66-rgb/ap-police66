const mongoose = require("mongoose");
const { Schema } = mongoose;

const DiagnosticPanelSchema = new Schema(
  {
    Institute_ID: {
      type: Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    name: { type: String, required: true },
    normalized_name: { type: String, required: true, index: true },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "MasterValue",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true
    }
  },
  { timestamps: true }
);

DiagnosticPanelSchema.index({ Institute_ID: 1, normalized_name: 1 }, { unique: true });

module.exports = mongoose.model("DiagnosticPanel", DiagnosticPanelSchema);
