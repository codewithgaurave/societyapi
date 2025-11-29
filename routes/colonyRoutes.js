// routes/colonyRoutes.js
import express from "express";
import {
  addColony,
  getColonies,
  updateColony,
  deleteColony,
} from "../controllers/colonyController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Public
router.get("/", getColonies);

// Admin only
router.post("/", requireAuth, addColony);
router.put("/:id", requireAuth, updateColony);
router.delete("/:id", requireAuth, deleteColony);

export default router;
