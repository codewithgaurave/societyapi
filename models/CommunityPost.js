// models/CommunityPost.js
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    createdAtIST: { type: String },
  },
  { timestamps: true }
);

const communityPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Society filter — same pincode wale hi dekh sakte hain
    pincode: { type: Number, required: true, index: true },

    // Optional colony filter
    colony: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Colony",
      default: null,
    },

    type: {
      type: String,
      enum: ["post", "complaint", "info", "event", "lost_found"],
      default: "post",
      index: true,
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    // Images (local uploads)
    images: [{ type: String }],

    // Likes
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Comments
    comments: [commentSchema],

    isActive: { type: Boolean, default: true },

    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

communityPostSchema.pre("save", function (next) {
  const ist = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });
  if (!this.createdAtIST) this.createdAtIST = ist;
  this.updatedAtIST = ist;
  next();
});

communityPostSchema.pre("findOneAndUpdate", function (next) {
  this.set({
    updatedAtIST: new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    }),
  });
  next();
});

export default mongoose.model("CommunityPost", communityPostSchema);
