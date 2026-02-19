const mongoose = require("mongoose");
const { Schema } = mongoose;

const EmployeeSchema = new Schema(
  {
    ABS_NO: { type: String, required: true, unique: true, trim: true },
    Name: { type: String, required: true, trim: true },
    Email: { type: String, required: true, unique: true, lowercase: true },
    Password: { type: String, required: true },

    Designation: { type: String,required: true, default: "" },
    DOB: { type: Date, required: true,default: null },
    Gender :{type:String,required: true},
    Blood_Group: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", ""],
      default: ""
    },
    

    Height: { type: String,required: true, default: "" },
    Weight: { type: String,required: true, default: "" },
    Phone_No: { type: String,required: true, default: "" },

    Photo: { type: String,required: true, default: "" },

    Address: {
      Street: { type: String,required: true, default: "" },
      District: { type: String,required: true, default: "" },
      State: { type: String, required: true, default: "" },
      Pincode: { type: String, required: true, default: "" }
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