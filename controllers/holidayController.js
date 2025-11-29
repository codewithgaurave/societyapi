// controllers/holidayController.js
import Holiday from "../models/Holiday.js";
import User from "../models/User.js";

// ✅ Apply for leave (society service user)
export const applyHoliday = async (req, res) => {
  try {
    const { userId, startDate, endDate, reason } = req.body;

    if (!userId || !startDate || !endDate) {
      return res.status(400).json({
        message: "userId, startDate and endDate are required",
      });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "society service") {
      return res.status(400).json({
        message: "Only society service users can apply for holiday",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (end < start) {
      return res
        .status(400)
        .json({ message: "endDate must be greater than or equal to startDate" });
    }

    const holiday = await Holiday.create({
      user: userId,
      startDate: start,
      endDate: end,
      reason,
      // status: "pending" by default
    });

    return res.status(201).json({
      message: "Holiday applied successfully",
      holiday,
    });
  } catch (err) {
    console.error("applyHoliday error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get holidays (all or by user)
// GET /api/holidays
// GET /api/holidays?userId=xxxxx
export const getHolidays = async (req, res) => {
  try {
    const { userId } = req.query;

    const filter = {};
    if (userId) filter.user = userId;

    const holidays = await Holiday.find(filter)
      .populate("user", "fullName mobileNumber serviceCategory role tatkalEnabled")
      .sort({ startDate: -1 })
      .lean();

    return res.json({ holidays });
  } catch (err) {
    console.error("getHolidays error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete holiday (cancel leave)
// DELETE /api/holidays/:id
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await Holiday.findByIdAndDelete(id).lean();

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    return res.json({
      message: "Holiday deleted successfully",
      holiday,
    });
  } catch (err) {
    console.error("deleteHoliday error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
