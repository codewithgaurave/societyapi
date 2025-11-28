// controllers/userController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.USER_JWT_EXPIRES_IN || "7d";
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

const signUserJwt = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      type: "user",
      registrationID: user.registrationID,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

// ✅ User Registration (with profile photo)
export const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      mobileNumber,
      whatsappNumber,
      email,
      password,
      address,
      pincode,
      role,
      serviceCategory,
      experience,
      adharCard,
      serviceCharge,
      perHourCharge,
    } = req.body;

    if (!fullName || !mobileNumber || !password || !address || !pincode || !role) {
      return res.status(400).json({
        message:
          "fullName, mobileNumber, password, address, pincode, role are required",
      });
    }

    if (!["society member", "society service"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await User.findOne({ mobileNumber }).lean();
    if (existing) {
      return res
        .status(409)
        .json({ message: "User with this mobileNumber already exists" });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const profileImage = req.file?.path || req.file?.secure_url || null;

    const user = await User.create({
      // registrationID auto-generate hoga model ke pre('validate') se
      profileImage,
      fullName,
      mobileNumber,
      whatsappNumber,
      email,
      password: hash,
      address,
      pincode,
      role,
      serviceCategory,
      experience,
      adharCard,
      serviceCharge,
      perHourCharge,
      // tatkalEnabled default false hi rahega
    });

    const token = signUserJwt(user);

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        registrationID: user.registrationID,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        whatsappNumber: user.whatsappNumber,
        email: user.email,
        address: user.address,
        pincode: user.pincode,
        role: user.role,
        serviceCategory: user.serviceCategory,
        experience: user.experience,
        adharCard: user.adharCard,
        serviceCharge: user.serviceCharge,
        perHourCharge: user.perHourCharge,
        profileImage: user.profileImage,
        tatkalEnabled: user.tatkalEnabled,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error("registerUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ User Login (by mobileNumber + password)
export const loginUser = async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    if (!mobileNumber || !password) {
      return res
        .status(400)
        .json({ message: "mobileNumber and password are required" });
    }

    const user = await User.findOne({ mobileNumber }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "User is blocked" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signUserJwt(user);

    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        registrationID: user.registrationID,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        whatsappNumber: user.whatsappNumber,
        email: user.email,
        address: user.address,
        pincode: user.pincode,
        role: user.role,
        serviceCategory: user.serviceCategory,
        experience: user.experience,
        adharCard: user.adharCard,
        serviceCharge: user.serviceCharge,
        perHourCharge: user.perHourCharge,
        profileImage: user.profileImage,
        tatkalEnabled: user.tatkalEnabled,
      },
      token,
    });
  } catch (err) {
    console.error("loginUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get own profile (User token required)
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ User: update own profile (edit)
export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      fullName,
      mobileNumber,
      whatsappNumber,
      email,
      password,
      address,
      pincode,
      role,
      serviceCategory,
      experience,
      adharCard,
      serviceCharge,
      perHourCharge,
    } = req.body;

    const updates = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (mobileNumber !== undefined) updates.mobileNumber = mobileNumber;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (pincode !== undefined) updates.pincode = pincode;
    if (role !== undefined) updates.role = role;
    if (serviceCategory !== undefined) updates.serviceCategory = serviceCategory;
    if (experience !== undefined) updates.experience = experience;
    if (adharCard !== undefined) updates.adharCard = adharCard;
    if (serviceCharge !== undefined) updates.serviceCharge = serviceCharge;
    if (perHourCharge !== undefined) updates.perHourCharge = perHourCharge;

    // password change (optional)
    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      updates.password = hash;
    }

    // new profile photo if provided
    const profileImage = req.file?.path || req.file?.secure_url;
    if (profileImage) {
      updates.profileImage = profileImage;
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error("updateMyProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ NEW: User: toggle tatkal seva on/off
// PATCH /api/users/me/tatkal  { "tatkalEnabled": true/false }
export const setMyTatkalStatus = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { tatkalEnabled } = req.body;

    if (typeof tatkalEnabled === "undefined") {
      return res
        .status(400)
        .json({ message: "tatkalEnabled is required (true/false)" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Optionally only allow if role is "society service"
    if (user.role !== "society service") {
      return res.status(400).json({
        message: "Tatkal seva toggle only allowed for society service users",
      });
    }

    user.tatkalEnabled = !!tatkalEnabled;
    await user.save();

    return res.json({
      message: `Tatkal seva ${user.tatkalEnabled ? "enabled" : "disabled"} successfully`,
      tatkalEnabled: user.tatkalEnabled,
    });
  } catch (err) {
    console.error("setMyTatkalStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: list all users
export const listUsers = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const users = await User.find({}, "-password").lean();
    return res.json({ users });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: block / unblock user
export const setUserBlockStatus = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const { id } = req.params;
    const { isBlocked } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isBlocked: !!isBlocked },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: `User ${isBlocked ? "blocked" : "unblocked"} successfully`,
      user,
    });
  } catch (err) {
    console.error("setUserBlockStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: update any user (edit)
export const adminUpdateUser = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const { id } = req.params;
    const {
      fullName,
      mobileNumber,
      whatsappNumber,
      email,
      password,
      address,
      pincode,
      role,
      serviceCategory,
      experience,
      adharCard,
      serviceCharge,
      perHourCharge,
      isBlocked,
      tatkalEnabled,
    } = req.body;

    const updates = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (mobileNumber !== undefined) updates.mobileNumber = mobileNumber;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (pincode !== undefined) updates.pincode = pincode;
    if (role !== undefined) updates.role = role;
    if (serviceCategory !== undefined) updates.serviceCategory = serviceCategory;
    if (experience !== undefined) updates.experience = experience;
    if (adharCard !== undefined) updates.adharCard = adharCard;
    if (serviceCharge !== undefined) updates.serviceCharge = serviceCharge;
    if (perHourCharge !== undefined) updates.perHourCharge = perHourCharge;
    if (isBlocked !== undefined) updates.isBlocked = !!isBlocked;
    if (tatkalEnabled !== undefined) updates.tatkalEnabled = !!tatkalEnabled;

    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      updates.password = hash;
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User updated successfully",
      user,
    });
  } catch (err) {
    console.error("adminUpdateUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: delete user (hard delete)
export const deleteUser = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const { id } = req.params;

    const user = await User.findByIdAndDelete(id).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User deleted successfully",
      user,
    });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
