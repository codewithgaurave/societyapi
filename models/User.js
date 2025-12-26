// models/User.js
import mongoose from "mongoose";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    registrationID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    profileImage: {
      type: String,
    },
    fullName: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    whatsappNumber: {
      type: Number,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    address: {
      type: String,
      required: true,
    },
    pincode: {
      type: Number,
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      required: true,
      enum: ["society member", "society service"],
    },
    serviceCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
    },
    experience: {
      type: String,
    },
    adharCard: {
      type: String,
    },
    serviceCharge: {
      type: String,
    },
    otherCharges: { // ✅ Changed from perHourCharge to otherCharges
      type: String,
    },

    // 🔹 Tatkal Seva toggle
    tatkalEnabled: {
      type: Boolean,
      default: false,
    },

    // IST timestamps
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// Helper: generate unique USR-XXXXXX ID
userSchema.statics.generateRegistrationID = async function () {
  const User = this;
  let unique = false;
  let registrationID = "";

  while (!unique) {
    const random = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
    registrationID = `USR-${random}`;

    const exists = await User.findOne({ registrationID }).lean();
    if (!exists) unique = true;
  }

  return registrationID;
};

// ✅ IMPORTANT: registrationID before validation
userSchema.pre("validate", async function (next) {
  try {
    if (this.isNew && !this.registrationID) {
      const Model = this.constructor;
      this.registrationID = await Model.generateRegistrationID();
    }
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ IST timestamps on save
userSchema.pre("save", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  if (!this.createdAtIST) this.createdAtIST = istTime;
  this.updatedAtIST = istTime;
  next();
});

// ✅ IST update on findOneAndUpdate
userSchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("User", userSchema);