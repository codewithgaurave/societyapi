// controllers/mainCategoryController.js
import MainCategory from "../models/MainCategory.js";
import ServiceCategory from "../models/ServiceCategory.js";

// ✅ Create Main Category (Admin-only via JWT)
export const createMainCategory = async (req, res) => {
  try {
    const { name, description, serviceCategoryIds = [] } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    // Check duplicate name
    const exists = await MainCategory.findOne({ name }).lean();
    if (exists) {
      return res
        .status(409)
        .json({ message: "Main category with this name already exists" });
    }

    // Optional: validate service category ids exist
    if (serviceCategoryIds.length > 0) {
      const count = await ServiceCategory.countDocuments({
        _id: { $in: serviceCategoryIds },
        isActive: true,
      });
      if (count !== serviceCategoryIds.length) {
        return res.status(400).json({
          message: "One or more serviceCategoryIds are invalid or inactive",
        });
      }
    }

    const mainCategory = await MainCategory.create({
      name,
      description,
      serviceCategories: serviceCategoryIds,
    });

    return res.status(201).json({
      message: "Main category created successfully",
      mainCategory,
    });
  } catch (err) {
    console.error("createMainCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Public: Get all active Main Categories (with active service categories)
export const listMainCategoriesPublic = async (_req, res) => {
  try {
    const mainCategories = await MainCategory.find({ isActive: true })
      .populate({
        path: "serviceCategories",
        match: { isActive: true }, // only active service categories
      })
      .lean();

    return res.json({ mainCategories });
  } catch (err) {
    console.error("listMainCategoriesPublic error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: Get all Main Categories (active + inactive)
export const listMainCategoriesAdmin = async (_req, res) => {
  try {
    const mainCategories = await MainCategory.find({})
      .populate("serviceCategories")
      .lean();

    return res.json({ mainCategories });
  } catch (err) {
    console.error("listMainCategoriesAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Public: Get single active Main Category by id
export const getMainCategoryByIdPublic = async (req, res) => {
  try {
    const { id } = req.params;

    const mainCategory = await MainCategory.findOne({
      _id: id,
      isActive: true,
    })
      .populate({
        path: "serviceCategories",
        match: { isActive: true },
      })
      .lean();

    if (!mainCategory) {
      return res.status(404).json({ message: "Main category not found" });
    }

    return res.json({ mainCategory });
  } catch (err) {
    console.error("getMainCategoryByIdPublic error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: Get single Main Category (active/inactive)
export const getMainCategoryByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const mainCategory = await MainCategory.findById(id)
      .populate("serviceCategories")
      .lean();

    if (!mainCategory) {
      return res.status(404).json({ message: "Main category not found" });
    }

    return res.json({ mainCategory });
  } catch (err) {
    console.error("getMainCategoryByIdAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update Main Category (Admin-only)
// Can update: name, description, isActive, serviceCategoryIds
export const updateMainCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, serviceCategoryIds } = req.body;

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (serviceCategoryIds !== undefined) {
      // validate service category ids if provided
      if (serviceCategoryIds.length > 0) {
        const count = await ServiceCategory.countDocuments({
          _id: { $in: serviceCategoryIds },
        });
        if (count !== serviceCategoryIds.length) {
          return res.status(400).json({
            message: "One or more serviceCategoryIds are invalid",
          });
        }
      }
      updateData.serviceCategories = serviceCategoryIds;
    }

    const mainCategory = await MainCategory.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("serviceCategories");

    if (!mainCategory) {
      return res.status(404).json({ message: "Main category not found" });
    }

    return res.json({
      message: "Main category updated successfully",
      mainCategory,
    });
  } catch (err) {
    console.error("updateMainCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Soft delete Main Category (isActive = false)
export const deleteMainCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const mainCategory = await MainCategory.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!mainCategory) {
      return res.status(404).json({ message: "Main category not found" });
    }

    return res.json({
      message: "Main category deactivated successfully",
      mainCategory,
    });
  } catch (err) {
    console.error("deleteMainCategory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
