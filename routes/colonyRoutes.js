import express from "express";
import {
  addColony,
  getColonies,
  updateColony,
  deleteColony,
  importFromExcel,
  downloadSampleTemplate,
  uploadExcel,
  bulkDeleteColonies
} from "../controllers/colonyController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getColonies);

// Admin only routes
router.post("/", requireAuth, addColony);
router.put("/:id", requireAuth, updateColony);
router.delete("/:id", requireAuth, deleteColony);
router.post("/bulk-delete", requireAuth, bulkDeleteColonies);

// Excel import routes (Admin only)
router.post("/import", 
  requireAuth, 
  (req, res, next) => {
    uploadExcel(req, res, (err) => {
      if (err) {
        return res.status(400).json({ 
          message: err.message || "File upload error" 
        });
      }
      next();
    });
  }, 
  importFromExcel
);

router.get("/download-template", requireAuth, downloadSampleTemplate);

export default router;