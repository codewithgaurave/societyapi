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

const router = express.Router();

// 🔹 Add availability (logged in user)
router.post("/me", requireAuth, addMyAvailability);

// 🔹 Get my availability (by token)
router.get("/me", requireAuth, getMyAvailability);

// 🔹 Get availability by userId (public)
router.get("/user/:userId", getAvailabilityByUserId);

// 🔹 Get all availability (public / admin dashboard etc.)
router.get("/", getAllAvailability);

// 🔹 Get single availability by id (public)
router.get("/:id", getAvailabilityById);

// 🔹 Update availability (owner or admin)
router.put("/:id", requireAuth, updateAvailability);

// 🔹 Delete availability (owner or admin)
router.delete("/:id", requireAuth, deleteAvailability);

export default router;
