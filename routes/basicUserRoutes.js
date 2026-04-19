// routes/basicUserRoutes.js
import express from "express";
import {
  registerBasicUser,
  loginBasicUser,
  getMyBasicProfile,
  updateMyBasicProfile,
  deleteMyBasicAccount,
} from "../controllers/basicUserController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// 🔹 Register
router.post("/register", registerBasicUser);

// 🔹 Login
router.post("/login", loginBasicUser);

// 🔹 Get own profile
router.get("/me", requireAuth, getMyBasicProfile);

// 🔹 Patch / update own profile
router.patch("/me", requireAuth, updateMyBasicProfile);

// 🔹 Delete own account
router.delete("/me", requireAuth, deleteMyBasicAccount);

export default router;
