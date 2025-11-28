// models/Slider.js
import mongoose from "mongoose";

const sliderSchema = new mongoose.Schema(
  {
    title: { type: String },
    description: { type: String },
    imageUrl: { type: String, required: true },
    targetUrl: { type: String }, // optional: kis page pe le jaye
    sortOrder: { type: Number, default: 0 }, // ordering
    isActive: { type: Boolean, default: true },

    // IST timestamps
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// IST on save
sliderSchema.pre("save", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  if (!this.createdAtIST) this.createdAtIST = istTime;
  this.updatedAtIST = istTime;
  next();
});

// IST on update
sliderSchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("Slider", sliderSchema);
