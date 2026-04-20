// routes/needRoutes.js
import express from "express";
import {
  createNeed,
  getAllNeeds,
  getNeedsByUser,
  deleteNeed,
  getNeedWithUserDetails,
  getColonySpecificNeeds,
  getNeedsByServiceCategoryAndPincode,
  getMyAvailableNeeds,
} from "../controllers/needController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireMemberPlan } from "../middleware/requireSubscription.js";

const router = express.Router();

// 🔹 Create need — requires auth + any member plan (free allows 3/month, plus unlimited)
router.post("/", requireAuth, requireMemberPlan, createNeed);

// 🔹 Get all needs (public)
router.get("/", getAllNeeds);

// 🔹 Get needs by service category and pincode
router.get("/by-location", getNeedsByServiceCategoryAndPincode);

// 🔹 Get needs based on user's availability colonies
router.get("/my-available-needs/:userId", getMyAvailableNeeds);

// 🔹 Get needs of a specific user
router.get("/user/:userId", getNeedsByUser);

router.get("/:id/details", getNeedWithUserDetails);

// 🔹 Delete need
router.delete("/:id", requireAuth, deleteNeed);

router.get("/provider/:userId/by-colony", getColonySpecificNeeds);

export default router;