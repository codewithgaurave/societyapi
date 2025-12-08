import Holiday from "../models/Holiday.js";
import User from "../models/User.js";

// ✅ Apply for leave (society service user)
// Now supports both single date and weekly recurring leave
export const applyHoliday = async (req, res) => {
  try {
    const { userId, startDate, endDate, reason, leaveType = "single", weeklyDays = [] } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
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

    let holidayData = {
      user: userId,
      reason,
      leaveType,
    };

    if (leaveType === "single") {
      // Validate single date leave
      if (!startDate || !endDate) {
        return res.status(400).json({
          message: "startDate and endDate are required for single date leave",
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

      // Check for overlapping single date leaves
      const existingSingleLeave = await Holiday.findOne({
        user: userId,
        leaveType: "single",
        $or: [
          { startDate: { $lte: end }, endDate: { $gte: start } },
        ],
        status: { $in: ["pending", "approved"] }
      });

      if (existingSingleLeave) {
        return res.status(400).json({
          message: "You already have a leave request for these dates",
        });
      }

      holidayData.startDate = start;
      holidayData.endDate = end;

    } else if (leaveType === "weekly") {
      // Validate weekly recurring leave
      if (!Array.isArray(weeklyDays) || weeklyDays.length === 0) {
        return res.status(400).json({
          message: "weeklyDays array is required for weekly leave",
        });
      }

      // Validate days are between 0-6
      const invalidDays = weeklyDays.filter(day => day < 0 || day > 6 || !Number.isInteger(day));
      if (invalidDays.length > 0) {
        return res.status(400).json({
          message: "weeklyDays must contain integers between 0 (Sunday) and 6 (Saturday)",
        });
      }

      // Remove duplicates
      const uniqueDays = [...new Set(weeklyDays)];
      
      // Check if user already has weekly leave configured
      const existingWeeklyLeave = await Holiday.findOne({
        user: userId,
        leaveType: "weekly",
        status: { $in: ["pending", "approved"] }
      });

      if (existingWeeklyLeave) {
        return res.status(400).json({
          message: "You already have a weekly leave request. Please cancel it first.",
        });
      }

      holidayData.weeklyDays = uniqueDays;

    } else {
      return res.status(400).json({
        message: "Invalid leaveType. Must be 'single' or 'weekly'",
      });
    }

    const holiday = await Holiday.create(holidayData);

    return res.status(201).json({
      message: `Holiday applied successfully (${leaveType} type)`,
      holiday,
    });
  } catch (err) {
    console.error("applyHoliday error:", err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: Object.values(err.errors).map(e => e.message).join(', ')
      });
    }
    
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
      .sort({ createdAt: -1 })
      .lean();

    // Format response to include weekly days names
    const formattedHolidays = holidays.map(holiday => {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weeklyDaysNames = holiday.weeklyDays?.map(day => dayNames[day]) || [];
      
      return {
        ...holiday,
        weeklyDaysNames
      };
    });

    return res.json({ holidays: formattedHolidays });
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

// ✅ NEW: Check if user is on leave for a specific date
export const checkLeaveStatus = async (req, res) => {
  try {
    const { userId, date } = req.query;

    if (!userId || !date) {
      return res.status(400).json({
        message: "userId and date are required",
      });
    }

    const checkDate = new Date(date);
    if (Number.isNaN(checkDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const dayOfWeek = checkDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    // Check single date leaves
    const singleDateLeave = await Holiday.findOne({
      user: userId,
      leaveType: "single",
      startDate: { $lte: checkDate },
      endDate: { $gte: checkDate },
      status: "approved"
    }).lean();

    // Check weekly recurring leaves
    const weeklyLeave = await Holiday.findOne({
      user: userId,
      leaveType: "weekly",
      weeklyDays: { $in: [dayOfWeek] },
      status: "approved"
    }).lean();

    const isOnLeave = !!(singleDateLeave || weeklyLeave);
    const leaveType = singleDateLeave ? "single" : (weeklyLeave ? "weekly" : null);

    return res.json({
      isOnLeave,
      leaveType,
      date: checkDate.toISOString().split('T')[0],
      dayOfWeek,
      dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek],
      singleDateLeave: singleDateLeave || null,
      weeklyLeave: weeklyLeave || null
    });
  } catch (err) {
    console.error("checkLeaveStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ NEW: Get user's weekly leave schedule
export const getWeeklySchedule = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const weeklyLeave = await Holiday.findOne({
      user: userId,
      leaveType: "weekly",
      status: "approved"
    }).populate("user", "fullName mobileNumber serviceCategory").lean();

    if (!weeklyLeave) {
      return res.json({
        hasWeeklyLeave: false,
        message: "No weekly leave schedule found"
      });
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const schedule = dayNames.map((name, index) => ({
      dayNumber: index,
      dayName: name,
      isLeaveDay: weeklyLeave.weeklyDays.includes(index)
    }));

    return res.json({
      hasWeeklyLeave: true,
      weeklyLeave,
      schedule,
      leaveDays: weeklyLeave.weeklyDays.map(day => dayNames[day]),
      totalLeaveDays: weeklyLeave.weeklyDays.length
    });
  } catch (err) {
    console.error("getWeeklySchedule error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};