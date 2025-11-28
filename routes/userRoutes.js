// routes/userRoutes.js
import express from "express";
import {
  registerUser,
  loginUser,
  getMyProfile,
  listUsers,
  setUserBlockStatus,
  updateMyProfile,
  adminUpdateUser,
  deleteUser,
} from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadUserFields } from "../config/cloudinary.js"; // path adjust if needed

const router = express.Router();

// 🔹 Registration (with profile photo: field name = profilePhoto)
router.post("/register", uploadUserFields, registerUser);

// 🔹 Login
router.post("/login", loginUser);

// 🔹 User: get own profile
router.get("/me", requireAuth, getMyProfile);

// 🔹 User: update own profile (can also send new profilePhoto)
router.put("/me", requireAuth, uploadUserFields, updateMyProfile);

// 🔹 Admin: list all users
router.get("/", requireAuth, listUsers);

// 🔹 Admin: block/unblock user
router.patch("/:id/block", requireAuth, setUserBlockStatus);

// 🔹 Admin: update any user
router.put("/:id", requireAuth, adminUpdateUser);

// 🔹 Admin: delete user
router.delete("/:id", requireAuth, deleteUser);

export default router;
