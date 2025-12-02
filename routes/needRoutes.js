// routes/needRoutes.js
import express from "express";
import {
  createNeed,
  getAllNeeds,
  getNeedsByUser,
  deleteNeed,
  getNeedWithUserDetails,
} from "../controllers/needController.js";
// import { requireAuth } from "../middleware/auth.js"; // agar auth se karna ho

const router = express.Router();

// 🔹 Create need (society member)
// Abhi body se userId aa raha hai. Agar token se karna ho to controller thoda change hoga.
router.post("/", createNeed);

// 🔹 Get all needs (public, with filters)
router.get("/", getAllNeeds);

// 🔹 Get needs of a specific user
router.get("/user/:userId", getNeedsByUser);

router.get("/:id/details", getNeedWithUserDetails);


// 🔹 Delete need by id (abhi public, chahe to auth laga sakte ho)
router.delete("/:id", deleteNeed);

export default router;
