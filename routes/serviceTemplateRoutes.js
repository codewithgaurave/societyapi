// routes/serviceTemplateRoutes.js
import express from "express";
import {
  createServiceTemplate,
  getServiceTemplates,
  deleteServiceTemplate,
} from "../controllers/serviceTemplateController.js";
import { uploadTemplateImage } from "../config/cloudinary.js";

const router = express.Router();

// Add template (society service user)
// Body: form-data (userId, title, description, templateImage)
router.post("/", uploadTemplateImage, createServiceTemplate);

// Get templates (all or by userId)
router.get("/", getServiceTemplates);

// Delete template by id
router.delete("/:id", deleteServiceTemplate);

export default router;
