// models/ServiceTemplate.js
import mongoose from "mongoose";

const serviceTemplateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String },
    description: { type: String },
    imageUrl: { type: String, required: true },
    // optional: category copy for faster filter
    serviceCategory: { type: String },
    isActive: { type: Boolean, default: true },

    // IST timestamps
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// IST on save
serviceTemplateSchema.pre("save", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  if (!this.createdAtIST) this.createdAtIST = istTime;
  this.updatedAtIST = istTime;
  next();
});

// IST on update
serviceTemplateSchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("ServiceTemplate", serviceTemplateSchema);
