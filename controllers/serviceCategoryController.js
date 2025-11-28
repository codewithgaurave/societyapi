// controllers/serviceCategoryController.js
import ServiceCategory from "../models/ServiceCategory.js";

// Create category (Admin-only via JWT)
export const createServiceCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const exists = await ServiceCategory.findOne({ name }).lean();
    if (exists) {
      return res
        .status(409)
        .json({ message: "Service category with this name already exists" });
    }

    const category = await ServiceCategory.create({ name, description });

    return res.status(201).json({
      message: "Service category created successfully",
      category,
    });
  } catch (err) {
    console.error("createServiceCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all categories (public, only active)
export const listServiceCategories = async (_req, res) => {
  try {
    const categories = await ServiceCategory.find({ isActive: true }).lean();
    return res.json({ categories });
  } catch (err) {
    console.error("listServiceCategories error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get single category by id
export const getServiceCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await ServiceCategory.findById(id).lean();
    if (!category) {
      return res.status(404).json({ message: "Service category not found" });
    }
    return res.json({ category });
  } catch (err) {
    console.error("getServiceCategoryById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update category (Admin-only)
export const updateServiceCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await ServiceCategory.findByIdAndUpdate(
      id,
      { name, description, isActive },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Service category not found" });
    }

    return res.json({
      message: "Service category updated successfully",
      category,
    });
  } catch (err) {
    console.error("updateServiceCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Soft delete (isActive = false)
export const deleteServiceCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await ServiceCategory.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Service category not found" });
    }

    return res.json({
      message: "Service category deactivated successfully",
      category,
    });
  } catch (err) {
    console.error("deleteServiceCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
