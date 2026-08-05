// models/CommunityCategory.js
import mongoose from "mongoose";

const communityCategorySchema = new mongoose.Schema(
  {
    value: { type: String, required: true, unique: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    icon: { type: String, default: "message" }, // icon name string (for app)
    color: { type: String, default: "#6366F1" }, // hex color
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

communityCategorySchema.pre("save", function (next) {
  const ist = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true });
  if (!this.createdAtIST) this.createdAtIST = ist;
  this.updatedAtIST = ist;
  next();
});

communityCategorySchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAtIST: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }) });
  next();
});

export default mongoose.model("CommunityCategory", communityCategorySchema);
