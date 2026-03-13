const mongoose = require("mongoose");
const { Schema } = mongoose;

const XrayRecordSchema = new Schema({
  Institute: { 
    type: Schema.Types.ObjectId, 
    ref: "Institute", 
    required: true 
  },

  Employee: { 
    type: Schema.Types.ObjectId, 
    ref: "Employee", 
    required: true 
  },

  IsFamilyMember: { 
    type: Boolean, 
    default: false 
  },

  FamilyMember: { 
    type: Schema.Types.ObjectId, 
    ref: "FamilyMember", 
    default: null 
  },

  Xrays: [
    {
      Xray_ID: { 
  type: Number 
},
      Xray_Type:{
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
      },

      Findings: { 
        type: String 
      },

      Impression: { 
        type: String 
      },

      Remarks: { 
        type: String 
      },

      Timestamp: { 
        type: Date, 
        default: Date.now 
      }
      ,
      // Allow uploaded reports to be stored per-Xray
      Reports: [
        {
          filename: { type: String },
          originalname: { type: String },
          url: { type: String },
          uploadedBy: { type: String },
          uploadedAt: { type: Date, default: Date.now }
        }
      ]
    }
  ],

  Xray_Notes: { 
    type: String 
  }

}, {
  timestamps: true
});

// Add reports metadata for uploaded X-ray reports
XrayRecordSchema.add({
  Reports: [
    {
      filename: { type: String },
      originalname: { type: String },
      url: { type: String },
      uploadedBy: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model("XrayRecord", XrayRecordSchema);
