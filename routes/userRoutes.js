import express from "express";
import {
  registerUser,
  loginUser,
  verifyMobileForReset,
  resetPassword,
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
  getSocietyServiceUsersByLocation,
  getAllSocietyServiceUsers,
  listTatkalUsersByPincode,
  getUsersForMap,
} from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadUserFields } from "../config/cloudinary.js";

const router = express.Router();

// 🔹 PUBLIC: get all users (safe)
router.get("/public/all", getAllUsersPublic);

// 🔹 PUBLIC: get all users for map display
router.get("/public/map", getUsersForMap);

// 🔹 PUBLIC: get all tatkal-enabled service providers
router.get("/tatkal", listTatkalUsers);

router.get(
  "/tatkal/by-pincode",
  listTatkalUsersByPincode
);

// 🔹 PUBLIC: get full details of a user by id
router.get("/:id/details", getUserDetailsById);

// 🔹 Registration
router.post("/register", uploadUserFields, registerUser);

// 🔹 Login
router.post("/login", loginUser);

// 🔹 Forget Password - Step 1: Verify mobile number
router.post("/forget-password/verify", verifyMobileForReset);

// 🔹 Forget Password - Step 2: Reset password
router.post("/forget-password/reset", resetPassword);

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

// 🔹 PUBLIC: society service users by location
router.get(
  "/public/society-service/by-location",
  getSocietyServiceUsersByLocation
);

// 🔹 DEBUG: get all society service users
router.get(
  "/debug/society-service/all",
  getAllSocietyServiceUsers
);


export default router;