// routes/mainCategoryRoutes.js
import express from "express";
import {
  createMainCategory,
  listMainCategoriesPublic,
  listMainCategoriesAdmin,
  getMainCategoryByIdPublic,
  getMainCategoryByIdAdmin,
  updateMainCategory,
  deleteMainCategory,
} from "../controllers/mainCategoryController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * PUBLIC ROUTES
 */

// Public: list all active main categories (with active service categories)
router.get("/", listMainCategoriesPublic);

// Public: get single active main category
router.get("/:id", getMainCategoryByIdPublic);

/**
 * ADMIN ROUTES (protected)
 */

// Admin: list all main categories (active + inactive)
router.get("/admin/all/list", requireAuth, listMainCategoriesAdmin);

// Admin: get single main category (active/inactive)
router.get("/admin/:id", requireAuth, getMainCategoryByIdAdmin);

// Admin: create main category
router.post("/", requireAuth, createMainCategory);

// Admin: update main category (name/desc/isActive/serviceCategoryIds)
router.put("/:id", requireAuth, updateMainCategory);

// Admin: soft delete main category
router.delete("/:id", requireAuth, deleteMainCategory);

export default router;
