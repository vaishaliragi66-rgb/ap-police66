const mongoose = require('mongoose');
const { Schema } = mongoose;

const EmployeeSchema = new Schema({
  ABS_NO: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  Name: { 
    type: String, 
    required: true,
    trim: true 
  },
  Email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true 
  },
  Password: { 
    type: String, 
    required: true 
  },
  Designation: { 
    type: String,
    trim: true 
  },
  DOB: { 
    type: Date 
  },
  Blood_Group: { 
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', '']
  },
  Height: { 
    type: String,
    trim: true 
  },
  Weight: { 
    type: String,
    trim: true 
  },
  Phone_No: { 
    type: String,
    trim: true 
  },
  Photo: { 
    type: String,
    default: "" 
  },
  Address: {
    Street: { type: String, trim: true },
    District: { type: String, trim: true },
    State: { type: String, trim: true },
    Pincode: { type: String, trim: true }
  },
  FamilyMembers: [{ 
    type: Schema.Types.ObjectId, 
    ref: "FamilyMember" 
  }],
  Medical_History: [{
    Date: { 
      type: Date, 
      default: Date.now 
    },
    Disease: [{ 
      type: Schema.Types.ObjectId, 
      ref: "Disease" 
    }],
    Diagnosis: String,
    Medicines: [{
      Medicine_Name: String,
      Quantity: Number
    }],
    Notes: String,
    Disease: [{ type: Schema.Types.ObjectId, ref: "Disease" }]
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model("Employee", EmployeeSchema);