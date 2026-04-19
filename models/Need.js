// models/Need.js
import mongoose from "mongoose";

const needSchema = new mongoose.Schema(
  {
    // jis member ne need post ki hai
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // kis type ki service chahiye (Electrician, Plumber, etc.)
    serviceCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: true,
      index: true,
    },

    // kis colony ke liye need hai (optional agar pincode hai to)
    colony: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Colony",
      required: false,
      index: true,
    },

    // Pincode (agar colony nahi select ki)
    pincode: {
      type: Number,
      required: false,
      index: true,
    },

    // need ka description
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // optional: status future ke liye (agar use karna ho)
    status: {
      type: String,
      enum: ["open", "in-progress", "completed", "cancelled"],
      default: "open",
    },

    // ✅ Location fields (GPS se auto-detect ya Places API se)
    fullAddress: { type: String },
    lat: { type: Number },
    lng: { type: Number },

    // IST timestamps
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// IST on save
needSchema.pre("save", function (next) {
  const ist = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  if (!this.createdAtIST) this.createdAtIST = ist;
  this.updatedAtIST = ist;
  next();
});

// IST on update
needSchema.pre("findOneAndUpdate", function (next) {
  const ist = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: ist });
  next();
});

export default mongoose.model("Need", needSchema);
