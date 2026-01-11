const mongoose = require("mongoose");
const { Schema } = mongoose;
const bcrypt = require("bcrypt");

const AdminSchema = new Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    
    password: { 
      type: String, 
      required: true,
      minlength: [8, 'Password must be at least 8 characters long']
    },
    
    dob: { 
      type: Date, 
      default: null 
    },
    
    address: { 
      type: String, 
      default: "",
      trim: true 
    },
    
    role: { 
      type: String, 
      enum: ["admin", "super-admin"],
      default: "admin" 
    },
    
    isActive: { 
      type: Boolean, 
      default: true 
    },
    
    lastLogin: { 
      type: Date, 
      default: null 
    },
    
    permissions: {
      canManageAdmins: { type: Boolean, default: false },
      canManageEmployees: { type: Boolean, default: true },
      canManageSettings: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: true }
    }
  },
  { 
    timestamps: true 
  }
);

// Hash password before saving
AdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
AdminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for admin's full name (if you want to split name later)
AdminSchema.virtual('fullName').get(function() {
  return this.name;
});

// Remove password when converting to JSON
AdminSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Admin", AdminSchema);