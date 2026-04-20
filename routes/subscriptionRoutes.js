// routes/subscriptionRoutes.js
import express from "express";
import {
  getPlans,
  getMySubscription,
  upgradeSubscription,
  checkNeedLimit,
  getAllSubscriptions,
  createOrder,
  verifyPayment,
} from "../controllers/subscriptionController.js";
import { requireAuth } from "../middleware/auth.js";
import { authenticateAdmin } from "../middleware/adminAuth.js";

const router = express.Router();

// Public: get plans by userType
router.get("/plans", getPlans);

// Auth required
router.get("/my", requireAuth, getMySubscription);
router.post("/upgrade", requireAuth, upgradeSubscription);
router.get("/check-need-limit", requireAuth, checkNeedLimit);
router.post("/create-order", requireAuth, createOrder);
router.post("/verify-payment", requireAuth, verifyPayment);

// Admin only
router.get("/all", authenticateAdmin, getAllSubscriptions);

export default router;
