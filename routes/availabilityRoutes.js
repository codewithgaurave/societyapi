// routes/availabilityRoutes.js
import express from "express";
import {
  addMyAvailability,
  updateAvailability,
  deleteAvailability,
  getAllAvailability,
  getMyAvailability,
  getAvailabilityByUserId,
  getAvailabilityById,
} from "../controllers/availabilityController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireServicePlan } from "../middleware/requireSubscription.js";

const router = express.Router();

// 🔹 Add availability — requires basic+ plan (society service)
router.post("/me", requireAuth, requireServicePlan, addMyAvailability);

// 🔹 Get my availability (by token)
router.get("/me", requireAuth, getMyAvailability);

// 🔹 Get availability by userId (public)
router.get("/user/:userId", getAvailabilityByUserId);

// 🔹 Get all availability (public / admin dashboard etc.)
router.get("/", getAllAvailability);

// 🔹 Get single availability by id (public)
router.get("/:id", getAvailabilityById);

// 🔹 Update availability — requires basic+ plan
router.put("/:id", requireAuth, requireServicePlan, updateAvailability);

// 🔹 Delete availability — requires basic+ plan
router.delete("/:id", requireAuth, requireServicePlan, deleteAvailability);

export default router;
