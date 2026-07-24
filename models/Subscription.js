// models/Subscription.js
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      required: true,
      default: "free",
    },
    userType: {
      type: String,
      required: true,
      enum: ["society service", "society member"],
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    price: { type: Number, default: 0 },
    paymentId: { type: String }, // Razorpay payment ID
    orderId: { type: String },   // Razorpay order ID
    subscriptionId: { type: String }, // Razorpay subscription ID
    needsUsedThisMonth: { type: Number, default: 0 },
    appliesUsedThisMonth: { type: Number, default: 0 }, // For workers
    needsResetDate: { type: Date, default: Date.now },

    // IST timestamps
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

subscriptionSchema.pre("save", function (next) {
  const istTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true });
  if (!this.createdAtIST) this.createdAtIST = istTime;
  this.updatedAtIST = istTime;
  next();
});

// Check if subscription is currently active
subscriptionSchema.methods.isActive = function () {
  if (this.status !== "active") return false;
  if (!this.endDate) return true; // No expiry (e.g. Free plan)
  if (new Date() > this.endDate) return false;
  return true;
};

export default mongoose.model("Subscription", subscriptionSchema);
