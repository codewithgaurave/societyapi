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
    const { value, label, subtitle, icon, color, order } = req.body;
    if (!value?.trim() || !label?.trim()) {
      return res.status(400).json({ message: "value and label are required" });
    }
    const exists = await CommunityCategory.findOne({ value: value.trim().toLowerCase() });
    if (exists) return res.status(409).json({ message: "Category with this value already exists" });

    const category = await CommunityCategory.create({
      value: value.trim().toLowerCase(),
      label: label.trim(),
      subtitle: subtitle ? subtitle.trim() : "",
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
    const { label, subtitle, icon, color, isActive, order } = req.body;
    const updateData = {};
    if (label !== undefined) updateData.label = label.trim();
    if (subtitle !== undefined) updateData.subtitle = subtitle.trim();
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (order !== undefined) updateData.order = order;

    const category = await CommunityCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
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
      {
        value: "complaint",
        label: "RWA Notice Board",
        subtitle: "सोसाइटी की महत्वपूर्ण जानकारी एवं नोटिस",
        icon: "megaphone",
        color: "#EF4444",
        order: 0,
      },
      {
        value: "lost_found",
        label: "Lost & Found",
        subtitle: "खोई हुई चीजें ढूंढें या मिली हुई चीजें साझा करें",
        icon: "search_normal",
        color: "#F97316",
        order: 1,
      },
      {
        value: "event",
        label: "Events & Celebrations",
        subtitle: "सोसाइटी के इवेंट्स, त्योहार और सेलिब्रेशन में जुड़ें",
        icon: "calendar",
        color: "#10B981",
        order: 2,
      },
      {
        value: "info",
        label: "Complaints & Suggestions",
        subtitle: "सोसाइटी से जुड़ी शिकायत व सुझाव",
        icon: "warning_2",
        color: "#3B82F6",
        order: 3,
      },
      {
        value: "post",
        label: "Post",
        subtitle: "सोसाइटी सदस्यों के साथ सामान्य बातचीत",
        icon: "message",
        color: "#6366F1",
        order: 4,
      },
      {
        value: "blood_donations",
        label: "Blood Donations",
        subtitle: "ब्लड डोनेशन से जुड़ें, किसी की जान बचाएं",
        icon: "blood",
        color: "#DC2626",
        order: 5,
      },
      {
        value: "appreciations_awards",
        label: "Appreciations & Awards",
        subtitle: "किसी के अच्छे काम की सराहना करें और सम्मान दें",
        icon: "like",
        color: "#8B5CF6",
        order: 6,
      },
      {
        value: "volunteer",
        label: "Volunteer",
        subtitle: "समुदाय सेवा के लिए वॉलिंटियर करें",
        icon: "volunteer",
        color: "#EC4899",
        order: 7,
      },
      {
        value: "sell_give_away_used_items",
        label: "Sell/Give Away Used Items",
        subtitle: "अपने उपयोग की चीजें बेचें या किसी को मुफ्त दें",
        icon: "shop",
        color: "#059669",
        order: 8,
      },
      {
        value: "car_pool",
        label: "Car Pool",
        subtitle: "साथ यात्रा करें, ईंधन बचाएं, पर्यावरण बचाएं",
        icon: "car",
        color: "#EAB308",
        order: 9,
      },
    ];

    let created = 0;
    let updated = 0;
    for (const d of defaults) {
      const exists = await CommunityCategory.findOne({ value: d.value });
      if (!exists) {
        await CommunityCategory.create(d);
        created++;
      } else {
        await CommunityCategory.updateOne(
          { value: d.value },
          {
            $set: {
              subtitle: d.subtitle,
              label: d.label,
              icon: d.icon,
              color: d.color,
              order: d.order,
            },
          }
        );
        updated++;
      }
    }
    return res.json({ message: `Seeded ${created} new categories, updated ${updated} categories.` });
  } catch (err) {
    console.error("seedDefaultCategories error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
