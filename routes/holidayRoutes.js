// routes/holidayRoutes.js
import express from "express";
import {
  applyHoliday,
  getHolidays,
  deleteHoliday,
} from "../controllers/holidayController.js";

const router = express.Router();

// Apply for holiday (society service user)
// Body JSON: { userId, startDate, endDate, reason }
router.post("/", applyHoliday);

// Get holidays (all or by userId)
router.get("/", getHolidays);

// Delete holiday by id
router.delete("/:id", deleteHoliday);

export default router;
