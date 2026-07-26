// routes/serviceCategoryRoutes.js
import express from "express";
import {
  createServiceCategory,
  listServiceCategories,
  getServiceCategoryById,
  updateServiceCategory,
  deleteServiceCategory,
  updateServiceCategoryIcon,
} from "../controllers/serviceCategoryController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadCategoryIcon } from "../config/cloudinary.js";

const router = express.Router();

// Public: list all active categories
router.get("/", listServiceCategories);

// Public: get single category
router.get("/:id", getServiceCategoryById);

// Admin-protected: create / update / delete
router.post("/", requireAuth, createServiceCategory);
router.put("/:id", requireAuth, updateServiceCategory);
router.delete("/:id", requireAuth, deleteServiceCategory);
router.patch("/:id/icon", requireAuth, uploadCategoryIcon, updateServiceCategoryIcon);

export default router;
