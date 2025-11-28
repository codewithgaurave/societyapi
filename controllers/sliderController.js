// controllers/sliderController.js
import Slider from "../models/Slider.js";

// ✅ Create slider (Admin)
export const createSlider = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const { title, description, targetUrl, sortOrder } = req.body;

    const imageUrl = req.file?.path || req.file?.secure_url;
    if (!imageUrl) {
      return res.status(400).json({
        message: "sliderImage file is required",
      });
    }

    const slider = await Slider.create({
      title,
      description,
      imageUrl,
      targetUrl,
      sortOrder,
    });

    return res.status(201).json({
      message: "Slider created successfully",
      slider,
    });
  } catch (err) {
    console.error("createSlider error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Public: get active sliders (for app / website)
export const getActiveSliders = async (_req, res) => {
  try {
    const sliders = await Slider.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.json({ sliders });
  } catch (err) {
    console.error("getActiveSliders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: list all sliders (active + inactive)
export const listAllSliders = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const sliders = await Slider.find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.json({ sliders });
  } catch (err) {
    console.error("listAllSliders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: update slider (text + optional new image)
export const updateSlider = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const { id } = req.params;
    const { title, description, targetUrl, sortOrder, isActive } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (targetUrl !== undefined) updates.targetUrl = targetUrl;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    if (isActive !== undefined) updates.isActive = isActive;

    const imageUrl = req.file?.path || req.file?.secure_url;
    if (imageUrl) {
      updates.imageUrl = imageUrl;
    }

    const slider = await Slider.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!slider) {
      return res.status(404).json({ message: "Slider not found" });
    }

    return res.json({
      message: "Slider updated successfully",
      slider,
    });
  } catch (err) {
    console.error("updateSlider error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: delete / deactivate slider
export const deleteSlider = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const { id } = req.params;

    // soft delete: isActive = false
    const slider = await Slider.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).lean();

    if (!slider) {
      return res.status(404).json({ message: "Slider not found" });
    }

    return res.json({
      message: "Slider deactivated successfully",
      slider,
    });
  } catch (err) {
    console.error("deleteSlider error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
