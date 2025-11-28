// routes/sliderRoutes.js
import express from "express";
import {
  createSlider,
  getActiveSliders,
  listAllSliders,
  updateSlider,
  deleteSlider,
} from "../controllers/sliderController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadSliderImage } from "../config/cloudinary.js";

const router = express.Router();

// Public: get all active sliders
router.get("/", getActiveSliders);

// Admin: list all sliders
router.get("/all", requireAuth, listAllSliders);

// Admin: create slider (image + text)
router.post("/", requireAuth, uploadSliderImage, createSlider);

// Admin: update slider (image optional)
router.put("/:id", requireAuth, uploadSliderImage, updateSlider);

// Admin: delete (deactivate) slider
router.delete("/:id", requireAuth, deleteSlider);

export default router;
