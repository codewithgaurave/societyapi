// models/Plan.js
import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["free", "basic", "pro", "premium", "plus"],
    },
    displayName: { type: String, required: true },
    userType: {
      type: String,
      required: true,
      enum: ["society service", "society member"],
    },
    price: { type: Number, required: true, default: 0 },
    durationDays: { type: Number, default: 30 },
    features: [{ type: String }],
    limits: {
      needsPerMonth: { type: Number, default: -1 }, // -1 = unlimited
      templatesAllowed: { type: Number, default: 0 },
      tatkalEnabled: { type: Boolean, default: false },
      priorityListing: { type: Boolean, default: false },
      verifiedBadge: { type: Boolean, default: false },
      featuredInTatkal: { type: Boolean, default: false },
      analyticsEnabled: { type: Boolean, default: false },
      whatsappLeads: { type: Boolean, default: false },
      directWorkerContact: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Plan", planSchema);
