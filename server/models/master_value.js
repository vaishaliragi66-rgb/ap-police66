const mongoose = require("mongoose");

const MasterValueSchema = new mongoose.Schema(
  {
    Institute_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterCategory",
      required: true,
      index: true
    },
    value_name: {
      type: String,
      required: true,
      trim: true
    },
    normalized_value: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

MasterValueSchema.index(
  { Institute_ID: 1, category_id: 1, normalized_value: 1 },
  { unique: true }
);

module.exports = mongoose.model("MasterValue", MasterValueSchema);
