const mongoose = require("mongoose");
const { Schema } = mongoose;

const DiagnosticPanelTestMappingSchema = new Schema(
  {
    panel_id: {
      type: Schema.Types.ObjectId,
      ref: "DiagnosticPanel",
      required: true,
      index: true
    },
    test_id: {
      type: Schema.Types.ObjectId,
      ref: "MasterValue",
      required: true
    },
    sequence_order: {
      type: Number,
      default: 0,
      index: true
    }
  },
  { timestamps: true }
);

DiagnosticPanelTestMappingSchema.index({ panel_id: 1, sequence_order: 1 });
DiagnosticPanelTestMappingSchema.index({ panel_id: 1, test_id: 1 }, { unique: true });
DiagnosticPanelTestMappingSchema.index({ test_id: 1 });

module.exports = mongoose.model("DiagnosticPanelTestMapping", DiagnosticPanelTestMappingSchema);
