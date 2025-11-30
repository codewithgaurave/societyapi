// controllers/needController.js
import Need from "../models/Need.js";
import User from "../models/User.js";
import Colony from "../models/Colony.js";
import ServiceCategory from "../models/ServiceCategory.js";

// ✅ Create need (society member need post karega)
// Body: { userId, serviceCategoryId, colonyId, description }
export const createNeed = async (req, res) => {
  try {
    const { userId, serviceCategoryId, colonyId, description } = req.body;

    if (!userId || !serviceCategoryId || !colonyId || !description) {
      return res.status(400).json({
        message:
          "userId, serviceCategoryId, colonyId aur description required hain",
      });
    }

    // user check
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "society member") {
      return res.status(400).json({
        message: "Sirf society member hi need post kar sakta hai",
      });
    }

    // service category check
    const serviceCat = await ServiceCategory.findById(serviceCategoryId).lean();
    if (!serviceCat || !serviceCat.isActive) {
      return res
        .status(400)
        .json({ message: "Service category invalid ya inactive hai" });
    }

    // colony check
    const colony = await Colony.findById(colonyId).lean();
    if (!colony || !colony.isActive) {
      return res
        .status(400)
        .json({ message: "Colony invalid ya inactive hai" });
    }

    const need = await Need.create({
      user: userId,
      serviceCategory: serviceCategoryId,
      colony: colonyId,
      description,
      // status: "open" by default
    });

    const populated = await Need.findById(need._id)
      .populate("user", "fullName mobileNumber registrationID role")
      .populate("serviceCategory", "name")
      .populate("colony", "name address city pincode")
      .lean();

    return res.status(201).json({
      message: "Need post ho gayi",
      need: populated,
    });
  } catch (err) {
    console.error("createNeed error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get all needs (public, optional filters)
// GET /api/needs
// GET /api/needs?serviceCategoryId=...&colonyId=...&status=open
export const getAllNeeds = async (req, res) => {
  try {
    const { serviceCategoryId, colonyId, status } = req.query;

    const filter = {};
    if (serviceCategoryId) filter.serviceCategory = serviceCategoryId;
    if (colonyId) filter.colony = colonyId;
    if (status) filter.status = status;

    const needs = await Need.find(filter)
      .populate("user", "fullName mobileNumber registrationID role")
      .populate("serviceCategory", "name")
      .populate("colony", "name address city pincode")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ needs });
  } catch (err) {
    console.error("getAllNeeds error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get needs by userId (public)
// GET /api/needs/user/:userId
export const getNeedsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const needs = await Need.find({ user: userId })
      .populate("serviceCategory", "name")
      .populate("colony", "name address city pincode")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ needs });
  } catch (err) {
    console.error("getNeedsByUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete need (user khud ya admin future me, abhi simple public by id)
// DELETE /api/needs/:id
export const deleteNeed = async (req, res) => {
  try {
    const { id } = req.params;

    const need = await Need.findByIdAndDelete(id).lean();

    if (!need) {
      return res.status(404).json({ message: "Need not found" });
    }

    return res.json({
      message: "Need delete ho gayi",
      need,
    });
  } catch (err) {
    console.error("deleteNeed error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
