// controllers/serviceTemplateController.js
import ServiceTemplate from "../models/ServiceTemplate.js";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import { PLANS } from "./subscriptionController.js";

// ✅ Create template (society service user)
export const createServiceTemplate = async (req, res) => {
  try {
    const { userId, title, description } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const imageUrl = req.file?.path || req.file?.secure_url;
    if (!imageUrl) {
      return res.status(400).json({
        message: "templateImage file is required",
      });
    }

    // user exist check + role check
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "society service") {
      return res.status(400).json({
        message: "Only society service users can create service templates",
      });
    }

    // Enforce template creation limits
    const subscription = await Subscription.findOne({ user: userId, status: "active" }).lean();
    const planKey = (subscription?.plan === "free" || !subscription)
      ? "free_service"
      : subscription.plan;
    const planDetails = PLANS[planKey] || PLANS["free_service"];
    const limit = planDetails?.limits?.templatesAllowed ?? 0;

    if (limit !== -1) {
      const activeCount = await ServiceTemplate.countDocuments({ user: userId });
      if (activeCount >= limit) {
        return res.status(403).json({
          message: `Template creation limit reached. Your current plan (${planDetails.displayName}) allows only ${limit} templates. Please upgrade your plan.`,
          code: "TEMPLATE_LIMIT_EXCEEDED",
        });
      }
    }

    const template = await ServiceTemplate.create({
      user: userId,
      title,
      description,
      imageUrl,
      serviceCategory: user.serviceCategory || undefined,
    });

    return res.status(201).json({
      message: "Service template created successfully",
      template,
    });
  } catch (err) {
    console.error("createServiceTemplate error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get templates (optional filter by userId)
// GET /api/service-templates
// GET /api/service-templates?userId=xxxxx
export const getServiceTemplates = async (req, res) => {
  try {
    const { userId } = req.query;

    const filter = { isActive: true };
    if (userId) {
      filter.user = userId;
    }

    const templates = await ServiceTemplate.find(filter)
      .populate("user", "fullName mobileNumber serviceCategory tatkalEnabled role")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ templates });
  } catch (err) {
    console.error("getServiceTemplates error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete template (hard delete)
// DELETE /api/service-templates/:id
export const deleteServiceTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await ServiceTemplate.findByIdAndDelete(id).lean();

    if (!template) {
      return res.status(404).json({ message: "Service template not found" });
    }

    return res.json({
      message: "Service template deleted successfully",
      template,
    });
  } catch (err) {
    console.error("deleteServiceTemplate error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
