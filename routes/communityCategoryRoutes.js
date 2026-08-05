// routes/communityCategoryRoutes.js
import express from "express";
import {
  getCategories,
  adminGetCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategories,
} from "../controllers/communityCategoryController.js";
import { authenticateAdmin } from "../middleware/adminAuth.js";

const router = express.Router();

// Public: active categories only
router.get("/", getCategories);

// Admin protected
router.get("/admin/all", authenticateAdmin, adminGetCategories);
router.post("/admin/seed", authenticateAdmin, seedDefaultCategories);
router.post("/admin", authenticateAdmin, createCategory);
router.put("/admin/:id", authenticateAdmin, updateCategory);
router.delete("/admin/:id", authenticateAdmin, deleteCategory);

export default router;
