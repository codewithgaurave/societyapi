// routes/appVersionRoutes.js
import express from "express";
import { getAppVersion, setAppVersion } from "../controllers/appVersionController.js";
import { authenticateAdmin } from "../middleware/adminAuth.js";

const router = express.Router();

// Public — app checks this on splash
router.get("/", getAppVersion);

// Temporarily public for initial setup — will be secured after
router.post("/", setAppVersion);

export default router;
