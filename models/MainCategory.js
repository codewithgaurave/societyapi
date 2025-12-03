// models/MainCategory.js
import mongoose from "mongoose";

const mainCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
    },
    // Service Categories added under this Main Category
    serviceCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceCategory",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },

    // optional IST timestamps
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

// Auto-save IST time on create
mainCategorySchema.pre("save", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  if (!this.createdAtIST) this.createdAtIST = istTime;
  this.updatedAtIST = istTime;
  next();
});

// Auto-update IST time on update
mainCategorySchema.pre("findOneAndUpdate", function (next) {
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });

  this.set({ updatedAtIST: istTime });
  next();
});

export default mongoose.model("MainCategory", mainCategorySchema);
