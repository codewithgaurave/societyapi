// controllers/colonyController.js
import Colony from "../models/Colony.js";

// Admin: Add colony
export const addColony = async (req, res) => {
  try {
    const { name, address, city, pincode, landmark, description } = req.body;

    if (!name || !pincode) {
      return res.status(400).json({ message: "name and pincode are required" });
    }

    const colony = await Colony.create({
      name,
      address,
      city,
      pincode,
      landmark,
      description,
    });

    return res.status(201).json({
      message: "Colony added successfully",
      colony,
    });
  } catch (err) {
    console.error("addColony error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all colonies (public)
export const getColonies = async (req, res) => {
  try {
    const colonies = await Colony.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    return res.json({ colonies });
  } catch (err) {
    console.error("getColonies error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: update colony
export const updateColony = async (req, res) => {
  try {
    const { id } = req.params;

    const colony = await Colony.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!colony) {
      return res.status(404).json({ message: "Colony not found" });
    }

    return res.json({ message: "Colony updated successfully", colony });
  } catch (err) {
    console.error("updateColony error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: delete colony
export const deleteColony = async (req, res) => {
  try {
    const { id } = req.params;

    const colony = await Colony.findByIdAndDelete(id).lean();

    if (!colony) {
      return res.status(404).json({ message: "Colony not found" });
    }

    return res.json({ message: "Colony deleted successfully", colony });
  } catch (err) {
    console.error("deleteColony error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
