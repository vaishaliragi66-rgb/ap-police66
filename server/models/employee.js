const mongoose = require("mongoose");
const { Schema } = mongoose;

const EmployeeSchema = new Schema(
  {
    ABS_NO: { type: String, required: true, unique: true, trim: true },
    Name: { type: String, required: true, trim: true },
    Email: { type: String, required: true, unique: true, lowercase: true },
    Password: { type: String, required: true },

    Designation: { type: String, default: "" },
    DOB: { type: Date, default: null },

    Blood_Group: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", ""],
      default: ""
    },

    Height: { type: String, default: "" },
    Weight: { type: String, default: "" },
    Phone_No: { type: String, default: "" },

    Photo: { type: String, default: "" },

    Address: {
      Street: { type: String, default: "" },
      District: { type: String, default: "" },
      State: { type: String, default: "" },
      Pincode: { type: String, default: "" }
    },

    FamilyMembers: [
      { type: Schema.Types.ObjectId, ref: "FamilyMember" }
    ],

    Medical_History: [
      {
        Date: { type: Date, default: Date.now },
        Diseases: [{ type: Schema.Types.ObjectId, ref: "Disease" }],
        Diagnosis: { type: String, default: "" },
        Medicines: [
          {
            Medicine_Name: String,
            Quantity: Number
          }
        ],
        Notes: { type: String, default: "" }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", EmployeeSchema);
