// routes/serviceTemplateRoutes.js
import express from "express";
import {
  createServiceTemplate,
  getServiceTemplates,
  deleteServiceTemplate,
} from "../controllers/serviceTemplateController.js";
import { uploadTemplateImage } from "../config/cloudinary.js";
import { requireAuth } from "../middleware/auth.js";
import { requireServicePlan } from "../middleware/requireSubscription.js";

const router = express.Router();

// Add template — requires basic+ plan
router.post("/", requireAuth, requireServicePlan, uploadTemplateImage, createServiceTemplate);

// Get templates (public)
router.get("/", getServiceTemplates);

// Delete template — requires basic+ plan
router.delete("/:id", requireAuth, requireServicePlan, deleteServiceTemplate);

export default router;
