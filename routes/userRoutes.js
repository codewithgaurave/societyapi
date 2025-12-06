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
  setMyTatkalStatus,
  listTatkalUsers,
  getUserDetailsById,
  getAllUsersPublic,     
} from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadUserFields } from "../config/cloudinary.js";

const router = express.Router();

// 🔹 PUBLIC: get all users (safe)
router.get("/public/all", getAllUsersPublic);

// 🔹 PUBLIC: get all tatkal-enabled service providers
router.get("/tatkal", listTatkalUsers);

// 🔹 PUBLIC: get full details of a user by id
router.get("/:id/details", getUserDetailsById);

// 🔹 Registration
router.post("/register", uploadUserFields, registerUser);

// 🔹 Login
router.post("/login", loginUser);

// 🔹 User: own profile
router.get("/me", requireAuth, getMyProfile);

// 🔹 User: update own profile
router.put("/me", requireAuth, uploadUserFields, updateMyProfile);

// 🔹 User: toggle tatkal seva
router.patch("/me/tatkal", requireAuth, setMyTatkalStatus);

// 🔹 Admin: list all users
router.get("/", requireAuth, listUsers);

// 🔹 Admin: block/unblock user
router.patch("/:id/block", requireAuth, setUserBlockStatus);

// 🔹 Admin: update user
router.put("/:id", requireAuth, adminUpdateUser);

// 🔹 Admin: delete user
router.delete("/:id", requireAuth, deleteUser);

export default router;