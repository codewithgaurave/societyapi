import express from "express";
import {
  getAllPlansAdmin,
  createPlan,
  updatePlan,
  deletePlan,
} from "../controllers/planController.js";
import { authenticateAdmin } from "../middleware/adminAuth.js";

const router = express.Router();

// All plan CRUD routes are admin-only
router.get("/all", authenticateAdmin, getAllPlansAdmin);
router.post("/add", authenticateAdmin, createPlan);
router.put("/:id", authenticateAdmin, updatePlan);
router.delete("/:id", authenticateAdmin, deletePlan);

export default router;
