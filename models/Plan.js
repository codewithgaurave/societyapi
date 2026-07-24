// models/Plan.js
import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
      // For Society Service (Providers)
      maxAppliesPerMonth: { type: Number, default: 0 }, // 0 = cannot apply (Free plan), -1 = unlimited
      tatkalEnabled: { type: Boolean, default: false },
      templatesAllowed: { type: Number, default: 0 },
      priorityListing: { type: Boolean, default: false },
      verifiedBadge: { type: Boolean, default: false },
      canViewDirectContact: { type: Boolean, default: false },
      
      // For Society Member
      maxNeedsPerMonth: { type: Number, default: 3 }, // -1 = unlimited
      maxApplicationsPerNeed: { type: Number, default: 5 }, // -1 = unlimited applications
      directWorkerContact: { type: Boolean, default: false },
      featuredNeed: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Plan", planSchema);
