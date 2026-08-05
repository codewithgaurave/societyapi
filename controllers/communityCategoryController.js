// controllers/communityCategoryController.js
import CommunityCategory from "../models/CommunityCategory.js";

// Public: Get all active categories
export const getCategories = async (req, res) => {
  try {
    const categories = await CommunityCategory.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    return res.json({ categories });
  } catch (err) {
    console.error("getCategories error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Get all categories (including inactive)
export const adminGetCategories = async (req, res) => {
  try {
    const categories = await CommunityCategory.find()
      .sort({ order: 1, createdAt: 1 })
      .lean();
    return res.json({ categories });
  } catch (err) {
    console.error("adminGetCategories error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Create category
export const createCategory = async (req, res) => {
  try {
    const { value, label, icon, color, order } = req.body;
    if (!value?.trim() || !label?.trim()) {
      return res.status(400).json({ message: "value and label are required" });
    }
    const exists = await CommunityCategory.findOne({ value: value.trim().toLowerCase() });
    if (exists) return res.status(409).json({ message: "Category with this value already exists" });

    const category = await CommunityCategory.create({
      value: value.trim().toLowerCase(),
      label: label.trim(),
      icon: icon || "message",
      color: color || "#6366F1",
      order: order ?? 0,
    });
    return res.status(201).json({ message: "Category created", category });
  } catch (err) {
    console.error("createCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Update category
export const updateCategory = async (req, res) => {
  try {
    const { label, icon, color, isActive, order } = req.body;
    const category = await CommunityCategory.findByIdAndUpdate(
      req.params.id,
      { ...(label && { label: label.trim() }), ...(icon && { icon }), ...(color && { color }), ...(isActive !== undefined && { isActive }), ...(order !== undefined && { order }) },
      { new: true }
    );
    if (!category) return res.status(404).json({ message: "Category not found" });
    return res.json({ message: "Category updated", category });
  } catch (err) {
    console.error("updateCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Delete category
export const deleteCategory = async (req, res) => {
  try {
    const category = await CommunityCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    return res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("deleteCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Seed default categories (run once)
export const seedDefaultCategories = async (req, res) => {
  try {
    const defaults = [
      { value: "post", label: "Post", icon: "message", color: "#6366F1", order: 0 },
      { value: "complaint", label: "Complaint", icon: "warning_2", color: "#EF4444", order: 1 },
      { value: "info", label: "Info", icon: "info_circle", color: "#3B82F6", order: 2 },
      { value: "event", label: "Event", icon: "calendar", color: "#8B5CF6", order: 3 },
      { value: "lost_found", label: "Lost & Found", icon: "search_normal", color: "#F97316", order: 4 },
    ];
    let created = 0;
    for (const d of defaults) {
      const exists = await CommunityCategory.findOne({ value: d.value });
      if (!exists) { await CommunityCategory.create(d); created++; }
    }
    return res.json({ message: `Seeded ${created} default categories` });
  } catch (err) {
    console.error("seedDefaultCategories error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
