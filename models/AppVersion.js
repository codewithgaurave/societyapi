// models/AppVersion.js
import mongoose from "mongoose";

const appVersionSchema = new mongoose.Schema(
  {
    version: { type: String, required: true }, // e.g. "1.0.7"
    forceUpdate: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("AppVersion", appVersionSchema);
