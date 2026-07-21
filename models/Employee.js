// models/Employee.js
import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    empCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    designation: {
      type: String,
      trim: true,
      default: "Sales Executive",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // IST timestamps
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// IST timestamps on save
employeeSchema.pre("save", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  if (!this.createdAtIST) this.createdAtIST = istTime;
  this.updatedAtIST = istTime;
  next();
});

// IST update on findOneAndUpdate
employeeSchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("Employee", employeeSchema);
