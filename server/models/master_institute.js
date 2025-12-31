const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;

const InstituteSchema = new Schema({
  Institute_ID: { type: Number, unique: true },
  Institute_Name: { type: String, required: true, unique: true },

  Profile_Pic: {
    type: String,
    default: null
  },

  Address: {
    Street: { type: String, required: true },
    District: { type: String, required: true },
    State: { type: String, required: true },
    Pincode: { type: String, required: true }
  },

  Email_ID: { type: String, required: true },
  password: { type: String, required: true },
  Contact_No: { type: String },

  Medicine_Inventory: [
    {
      Medicine_ID: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
      Quantity: { type: Number, default: 0 }
    }
  ],

  Employees: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
  Family_member: [{ type: Schema.Types.ObjectId, ref: "FamilyMember" }],
  Orders: [{ type: Schema.Types.ObjectId, ref: "Order" }]
});

InstituteSchema.plugin(AutoIncrement, { inc_field: "Institute_ID" });

module.exports = mongoose.model("Institute", InstituteSchema);
