import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // For single date leave (existing)
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    // For weekly recurring leave (new)
    leaveType: {
      type: String,
      enum: ["single", "weekly"],
      default: "single",
    },
    weeklyDays: {
      type: [Number], // 0=Sunday, 1=Monday, ..., 6=Saturday
      default: [],
      validate: {
        validator: function(days) {
          // Check all values are between 0-6
          return days.every(day => day >= 0 && day <= 6);
        },
        message: "Weekly days must be between 0 (Sunday) and 6 (Saturday)"
      }
    },
    reason: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // IST timestamps
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for weekly days names
holidaySchema.virtual("weeklyDaysNames").get(function() {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return this.weeklyDays.map(day => dayNames[day]);
});

// Validation for leave type
holidaySchema.pre("save", function(next) {
  if (this.leaveType === "single") {
    if (!this.startDate || !this.endDate) {
      return next(new Error("startDate and endDate are required for single date leave"));
    }
  } else if (this.leaveType === "weekly") {
    if (!this.weeklyDays || this.weeklyDays.length === 0) {
      return next(new Error("At least one weekly day is required for weekly leave"));
    }
    // Clear date fields for weekly leave
    this.startDate = undefined;
    this.endDate = undefined;
  }
  next();
});

// IST on save
holidaySchema.pre("save", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  if (!this.createdAtIST) this.createdAtIST = istTime;
  this.updatedAtIST = istTime;
  next();
});

// IST on update
holidaySchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("Holiday", holidaySchema);