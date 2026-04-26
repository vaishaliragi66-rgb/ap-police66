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
    name: {
      type: String,
      trim: true,
      default: ""
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

MasterValueSchema.index({ Institute_ID: 1, category_id: 1, name: 1 });

// Fast path for Tests APIs that filter by institute/category and exclude archived rows.
MasterValueSchema.index({ Institute_ID: 1, category_id: 1, "meta.archived": 1, status: 1, value_name: 1 });

// Fast path for test-only queries (meta.kind="test") in /tests endpoint.
MasterValueSchema.index({ Institute_ID: 1, category_id: 1, "meta.kind": 1, "meta.archived": 1, status: 1, name: 1 });

MasterValueSchema.pre("validate", function (next) {
  if (this.value_name) {
    this.name = this.value_name;
  }
  next();
});

module.exports = mongoose.model("MasterValue", MasterValueSchema);
