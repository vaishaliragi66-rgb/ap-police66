const mongoose = require("mongoose");

const MasterCategorySchema = new mongoose.Schema(
  {
    Institute_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    category_name: {
      type: String,
      required: true,
      trim: true
    },
    normalized_name: {
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
    seed_version: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

MasterCategorySchema.index(
  { Institute_ID: 1, normalized_name: 1 },
  { unique: true }
);

module.exports = mongoose.model("MasterCategory", MasterCategorySchema);
