import Plan from "../models/Plan.js";

// ✅ Get all plans (Admin)
export const getAllPlansAdmin = async (req, res) => {
  try {
    if (!req.admin) return res.status(403).json({ message: "Admins only" });
    const plans = await Plan.find().sort({ userType: 1, price: 1 }).lean();
    return res.json({ plans });
  } catch (err) {
    console.error("getAllPlansAdmin error:", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};

// ✅ Create a new Plan (Admin)
export const createPlan = async (req, res) => {
  try {
    if (!req.admin) return res.status(403).json({ message: "Admins only" });
    const {
      name,
      displayName,
      userType,
      price,
      durationDays,
      features,
      limits,
      isActive,
    } = req.body;

    if (!name || !displayName || !userType) {
      return res.status(400).json({ message: "name, displayName, and userType are required." });
    }

    const exists = await Plan.findOne({ name, userType });
    if (exists) {
      return res.status(409).json({ message: "A plan with this name and userType already exists." });
    }

    const plan = await Plan.create({
      name,
      displayName,
      userType,
      price,
      durationDays,
      features,
      limits,
      isActive,
    });

    return res.status(201).json({ message: "Plan created successfully", plan });
  } catch (err) {
    console.error("createPlan error:", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};

// ✅ Update a Plan (Admin)
export const updatePlan = async (req, res) => {
  try {
    if (!req.admin) return res.status(403).json({ message: "Admins only" });
    const { id } = req.params;
    
    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // Update fields dynamically
    const fieldsToUpdate = [
      "name", "displayName", "userType", "price", 
      "durationDays", "features", "limits", "isActive"
    ];

    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        plan[field] = req.body[field];
      }
    });

    await plan.save();
    return res.json({ message: "Plan updated successfully", plan });
  } catch (err) {
    console.error("updatePlan error:", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};

// ✅ Delete a Plan (Admin)
export const deletePlan = async (req, res) => {
  try {
    if (!req.admin) return res.status(403).json({ message: "Admins only" });
    const { id } = req.params;

    const plan = await Plan.findByIdAndDelete(id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    return res.json({ message: "Plan deleted successfully" });
  } catch (err) {
    console.error("deletePlan error:", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};
