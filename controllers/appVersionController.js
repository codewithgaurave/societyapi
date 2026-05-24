// controllers/appVersionController.js
import AppVersion from "../models/AppVersion.js";

// ✅ Get current required version (public)
export const getAppVersion = async (_req, res) => {
  try {
    const version = await AppVersion.findOne().sort({ createdAt: -1 }).lean();
    if (!version) return res.json({ version: "1.0.0", forceUpdate: false });
    return res.json({ version: version.version, forceUpdate: version.forceUpdate });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Set required version (admin only)
export const setAppVersion = async (req, res) => {
  try {
    const { version, forceUpdate = true } = req.body;
    if (!version) return res.status(400).json({ message: "version is required" });

    const updated = await AppVersion.findOneAndUpdate(
      {},
      { version, forceUpdate },
      { upsert: true, new: true }
    );
    return res.json({ message: "Version updated", data: updated });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
