// controllers/availabilityController.js
import Availability from "../models/Availability.js";
import User from "../models/User.js";

// Helper: HH:mm basic validation
const isValidTime = (t) => /^\d{2}:\d{2}$/.test(t);

// Helper: normalize colonyIds from body
const normalizeColonyIds = (colonyIds) => {
  if (!colonyIds) return [];
  if (Array.isArray(colonyIds)) return colonyIds.filter(Boolean);
  // if string (e.g. single id or comma separated)
  if (typeof colonyIds === "string") {
    if (colonyIds.includes(",")) {
      return colonyIds
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
    return [colonyIds.trim()];
  }
  return [];
};

// ✅ Add availability (by token - logged in user)
export const addMyAvailability = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { date, startTime, endTime, isAvailable, notes, colonyIds } = req.body;

    if (!date || !startTime || !endTime) {
      return res
        .status(400)
        .json({ message: "date, startTime, endTime are required" });
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return res
        .status(400)
        .json({ message: "startTime/endTime must be in HH:mm format" });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "society service") {
      return res
        .status(400)
        .json({ message: "Only society service users can set availability" });
    }

    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const coloniesArr = normalizeColonyIds(colonyIds);

    const availability = await Availability.create({
      user: userId,
      date: dateObj,
      startTime,
      endTime,
      isAvailable: typeof isAvailable === "boolean" ? isAvailable : true,
      notes,
      colonies: coloniesArr,
    });

    const populated = await Availability.findById(availability._id)
      .populate("user", "fullName mobileNumber serviceCategory role tatkalEnabled")
      .populate("colonies", "name address city pincode")
      .lean();

    return res.status(201).json({
      message: "Availability added successfully",
      availability: populated,
    });
  } catch (err) {
    console.error("addMyAvailability error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Edit availability (only owner or admin)
export const updateAvailability = async (req, res) => {
  try {
    const auth = req.user || {};
    const { id } = req.params;
    const { date, startTime, endTime, isAvailable, notes, colonyIds } = req.body;

    const availability = await Availability.findById(id);
    if (!availability) {
      return res.status(404).json({ message: "Availability not found" });
    }

    // Authorization: user owner or admin
    const isAdmin = !!auth.adminId;
    const isOwner = auth.sub && String(availability.user) === String(auth.sub);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const updates = {};

    if (date !== undefined) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      updates.date = d;
    }

    if (startTime !== undefined) {
      if (!isValidTime(startTime)) {
        return res.status(400).json({ message: "Invalid startTime format" });
      }
      updates.startTime = startTime;
    }

    if (endTime !== undefined) {
      if (!isValidTime(endTime)) {
        return res.status(400).json({ message: "Invalid endTime format" });
      }
      updates.endTime = endTime;
    }

    if (isAvailable !== undefined) updates.isAvailable = !!isAvailable;
    if (notes !== undefined) updates.notes = notes;

    if (colonyIds !== undefined) {
      updates.colonies = normalizeColonyIds(colonyIds);
    }

    const updated = await Availability.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("user", "fullName mobileNumber serviceCategory role tatkalEnabled")
      .populate("colonies", "name address city pincode")
      .lean();

    return res.json({
      message: "Availability updated successfully",
      availability: updated,
    });
  } catch (err) {
    console.error("updateAvailability error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete availability (only owner or admin)
export const deleteAvailability = async (req, res) => {
  try {
    const auth = req.user || {};
    const { id } = req.params;

    const availability = await Availability.findById(id);
    if (!availability) {
      return res.status(404).json({ message: "Availability not found" });
    }

    const isAdmin = !!auth.adminId;
    const isOwner = auth.sub && String(availability.user) === String(auth.sub);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const deleted = await Availability.findByIdAndDelete(id)
      .populate("user", "fullName mobileNumber serviceCategory role tatkalEnabled")
      .populate("colonies", "name address city pincode")
      .lean();

    return res.json({
      message: "Availability deleted successfully",
      availability: deleted,
    });
  } catch (err) {
    console.error("deleteAvailability error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Show all availability (admin / public)
// GET /api/availability
export const getAllAvailability = async (_req, res) => {
  try {
    const list = await Availability.find({})
      .populate("user", "fullName mobileNumber serviceCategory role tatkalEnabled")
      .populate("colonies", "name address city pincode")
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({ availability: list });
  } catch (err) {
    console.error("getAllAvailability error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Show my availability (by token)
// GET /api/availability/me
export const getMyAvailability = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const list = await Availability.find({ user: userId })
      .populate("colonies", "name address city pincode")
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({ availability: list });
  } catch (err) {
    console.error("getMyAvailability error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Show availability by userId (public / admin)
// GET /api/availability/user/:userId
export const getAvailabilityByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const list = await Availability.find({ user: userId })
      .populate("colonies", "name address city pincode")
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({ availability: list });
  } catch (err) {
    console.error("getAvailabilityByUserId error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get single availability by id
// GET /api/availability/:id
export const getAvailabilityById = async (req, res) => {
  try {
    const { id } = req.params;

    const availability = await Availability.findById(id)
      .populate("user", "fullName mobileNumber serviceCategory role tatkalEnabled")
      .populate("colonies", "name address city pincode")
      .lean();

    if (!availability) {
      return res.status(404).json({ message: "Availability not found" });
    }

    return res.json({ availability });
  } catch (err) {
    console.error("getAvailabilityById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
