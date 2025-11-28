// routes/serviceCategoryRoutes.js
import express from "express";
import {
  createServiceCategory,
  listServiceCategories,
  getServiceCategoryById,
  updateServiceCategory,
  deleteServiceCategory,
} from "../controllers/serviceCategoryController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Public: list all active categories
router.get("/", listServiceCategories);

// Public: get single category
router.get("/:id", getServiceCategoryById);

// Admin-protected: create / update / delete
router.post("/", requireAuth, createServiceCategory);
router.put("/:id", requireAuth, updateServiceCategory);
router.delete("/:id", requireAuth, deleteServiceCategory);

export default router;
