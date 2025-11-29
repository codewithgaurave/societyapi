// models/Colony.js
import mongoose from "mongoose";

const colonySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
    },
    landmark: {
      type: String,
    },
    city: {
      type: String,
    },
    pincode: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// IST on save
colonySchema.pre("save", function (next) {
  const ist = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  });

  if (!this.createdAtIST) this.createdAtIST = ist;
  this.updatedAtIST = ist;
  next();
});

// IST on update
colonySchema.pre("findOneAndUpdate", function (next) {
  const ist = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  });

  this.set({ updatedAtIST: ist });
  next();
});

export default mongoose.model("Colony", colonySchema);
