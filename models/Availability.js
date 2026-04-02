// models/Availability.js
import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🔹 Type of availability:
    // "single"  - ek specific date ke liye
    // "range"   - startDate se endDate tak
    // "always"  - permanent (koi date nahi)
    availabilityType: {
      type: String,
      enum: ["single", "range", "always"],
      default: "single",
    },

    // single / range ke liye date fields
    date: {
      type: Date, // single type ke liye
    },
    startDate: {
      type: Date, // range type ke liye
    },
    endDate: {
      type: Date, // range type ke liye
    },

    // HH:mm format e.g. "09:00", "18:30"
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    notes: {
      type: String,
    },

    // 🔹 Multiple colonies jaha ye user available hai
    colonies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Colony",
      },
    ],

    // IST timestamps
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// ✅ IST on save
availabilitySchema.pre("save", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  if (!this.createdAtIST) this.createdAtIST = istTime;
  this.updatedAtIST = istTime;
  next();
});

// ✅ IST on update
availabilitySchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("Availability", availabilitySchema);
