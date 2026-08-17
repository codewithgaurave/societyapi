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
        value: "sell_giveaway",
        label: "Sell / Give Away Used Items",
        subtitle: "अपने उपयोग की चीजें बेचें या किसी को मुफ्त दें।",
        icon: "shop",
        color: "#16A34A",
        order: 0,
      },
      {
        value: "lost_found",
        label: "Lost & Found Items",
        subtitle: "खोई हुई चीजें ढूंढें या मिली हुई चीजें साझा करें।",
        icon: "search_normal",
        color: "#0284C7",
        order: 1,
      },
      {
        value: "pet_care",
        label: "Pet Care Support",
        subtitle: "पालतू जानवरों से जुड़ी मदद, देखभाल और सपोर्ट पाएं।",
        icon: "pets",
        color: "#EA580C",
        order: 2,
      },
      {
        value: "car_pool",
        label: "Car Pool",
        subtitle: "साथ यात्रा करें, ईंधन बचाएं, पर्यावरण बचाएं।",
        icon: "car",
        color: "#7C3AED",
        order: 3,
      },
      {
        value: "events_celebrations",
        label: "Events & Celebrations",
        subtitle: "सोसाइटी के इवेंट्स, त्योहार और सेलिब्रेशन में जुड़ें।",
        icon: "calendar",
        color: "#E11D48",
        order: 4,
      },
      {
        value: "notice_board",
        label: "Community Notice Board",
        subtitle: "ज़रूरी सूचनाएं, अपडेट और अनाउंसमेंट साझा करें।",
        icon: "megaphone",
        color: "#0284C7",
        order: 5,
      },
      {
        value: "community_suggestions",
        label: "Suggestions to Community",
        subtitle: "अपने सुझाव दें और मिलकर अपनी सोसाइटी बेहतर बनाएं।",
        icon: "lightbulb",
        color: "#16A34A",
        order: 6,
      },
      {
        value: "rwa_suggestions",
        label: "Suggestions to RWA",
        subtitle: "RWA के लिए अपने सुझाव और फीडबैक दें।",
        icon: "people",
        color: "#EA580C",
        order: 7,
      },
      {
        value: "appreciations",
        label: "Appreciations",
        subtitle: "किसी के अच्छे काम की सराहना करें और सम्मान दें।",
        icon: "like",
        color: "#7C3AED",
        order: 8,
      },
      {
        value: "volunteer",
        label: "Volunteer",
        subtitle: "समुदाय सेवा के लिए वॉलिंटियर करें, मिलकर समाज को बेहतर बनाएं।",
        icon: "volunteer",
        color: "#0D9488",
        order: 9,
      },
      {
        value: "blood_donation",
        label: "Blood Donation",
        subtitle: "ब्लड डोनेशन से जुड़ें, किसी की जान बचाएं।",
        icon: "blood",
        color: "#DC2626",
        order: 10,
      },
      {
        value: "emergency_help",
        label: "Emergency Help",
        subtitle: "आपातकाल में तुरंत मदद पाएं, एक-दूसरे के साथ खड़े रहें।",
        icon: "emergency",
        color: "#1D4ED8",
        order: 11,
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
