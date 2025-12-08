import express from "express";
import {
  applyHoliday,
  getHolidays,
  deleteHoliday,
  checkLeaveStatus,
  getWeeklySchedule,
} from "../controllers/holidayController.js";

const router = express.Router();

// Apply for holiday (society service user)
// For single date: { userId, startDate, endDate, reason, leaveType: "single" }
// For weekly: { userId, weeklyDays: [0,6], reason, leaveType: "weekly" }
// weeklyDays: 0=Sunday, 1=Monday, ..., 6=Saturday
router.post("/", applyHoliday);

// Get holidays (all or by userId)
router.get("/", getHolidays);

// Delete holiday by id
router.delete("/:id", deleteHoliday);

// NEW: Check if user is on leave for specific date
// GET /api/holidays/check?userId=xxx&date=2024-01-15
router.get("/check", checkLeaveStatus);

// NEW: Get user's weekly leave schedule
// GET /api/holidays/weekly-schedule/:userId
router.get("/weekly-schedule/:userId", getWeeklySchedule);

export default router;