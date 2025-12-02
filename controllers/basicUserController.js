// controllers/basicUserController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import BasicUser from "../models/BasicUser.js";

const JWT_SECRET = process.env.JWT_SECRET;
const BASIC_JWT_EXPIRES_IN = process.env.BASIC_JWT_EXPIRES_IN || "7d";
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

const signBasicUserJwt = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      type: "basic-user",
    },
    JWT_SECRET,
    { expiresIn: BASIC_JWT_EXPIRES_IN }
  );

// ✅ Register basic user
// POST /api/basic-users/register
export const registerBasicUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, address } = req.body;

    if (!name || !email || !password || !phoneNumber || !address) {
      return res.status(400).json({
        message: "name, email, password, phoneNumber, address are required",
      });
    }

    const existing = await BasicUser.findOne({ email }).lean();
    if (existing) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await BasicUser.create({
      name,
      email,
      password: hash,
      phoneNumber,
      address,
    });

    const token = signBasicUserJwt(user);

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error("registerBasicUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Login basic user
// POST /api/basic-users/login
export const loginBasicUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }

    const user = await BasicUser.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "User is inactive" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signBasicUserJwt(user);

    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        isActive: user.isActive,
      },
      token,
    });
  } catch (err) {
    console.error("loginBasicUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get own profile
// GET /api/basic-users/me
export const getMyBasicProfile = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await BasicUser.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("getMyBasicProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Edit / update own profile (PATCH)
// PATCH /api/basic-users/me
export const updateMyBasicProfile = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, email, password, phoneNumber, address, isActive } = req.body;

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (address !== undefined) updates.address = address;
    if (typeof isActive !== "undefined") updates.isActive = !!isActive;

    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      updates.password = hash;
    }

    const user = await BasicUser.findByIdAndUpdate(userId, updates, {
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
    console.error("updateMyBasicProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete own account (hard delete)
// DELETE /api/basic-users/me
export const deleteMyBasicAccount = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await BasicUser.findByIdAndDelete(userId).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Account deleted successfully",
      user,
    });
  } catch (err) {
    console.error("deleteMyBasicAccount error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
