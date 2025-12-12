// controllers/needController.js
import Need from "../models/Need.js";
import User from "../models/User.js";
import Colony from "../models/Colony.js";
import ServiceCategory from "../models/ServiceCategory.js";
import Availability from "../models/Availability.js";
import Holiday from "../models/Holiday.js";
import ServiceTemplate from "../models/ServiceTemplate.js";


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

// ✅ Get need + full user details by needId
// GET /api/needs/:id/details
export const getNeedWithUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Need dhoondo
    const need = await Need.findById(id)
      .populate("user", "fullName mobileNumber whatsappNumber email registrationID role profileImage address pincode serviceCategory experience tatkalEnabled")
      .populate("serviceCategory", "name")
      .populate("colony", "name address city pincode")
      .lean();

    if (!need) {
      return res.status(404).json({ message: "Need not found" });
    }

    const userId = need.user?._id || need.user;

    // 2️⃣ User ka full detail (jaise tumne getUserDetailsById me kiya tha)
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found for this need" });
    }

    const [availability, holidays, templates] = await Promise.all([
      Availability.find({ user: userId })
        .populate("colonies", "name address city pincode")
        .sort({ date: 1, startTime: 1 })
        .lean(),
      Holiday.find({ user: userId })
        .sort({ startDate: -1 })
        .lean(),
      ServiceTemplate.find({ user: userId, isActive: true })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const now = new Date();

    const hasActiveHoliday = holidays.some((h) => {
      if (!h.startDate || !h.endDate) return false;
      const start = new Date(h.startDate);
      const end = new Date(h.endDate);
      return start <= now && end >= now && h.status !== "rejected";
    });

    const hasTemplates = templates.length > 0;

    // 3️⃣ Final response
    return res.json({
      need,           // jis need ki id bheji thi uska full detail
      user,           // user ka basic detail
      availability,   // user ka availability
      holidays,       // user ki holidays
      templates,      // user ke active service templates
      hasActiveHoliday,
      hasTemplates,
    });
  } catch (err) {
    console.error("getNeedWithUserDetails error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ Get needs for a service provider based on THEIR availability colonies
// Aur sirf uske service category ke needs
export const getColonySpecificNeeds = async (req, res) => {
  try {
    const { userId } = req.params;
    const { serviceCategory } = req.query;

    if (!serviceCategory) {
      return res.status(400).json({ 
        message: "serviceCategory query parameter required" 
      });
    }

    // 1️⃣ Check user exists and is service provider
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "society service") {
      return res.status(400).json({ 
        message: "Only service providers can access this" 
      });
    }

    // 2️⃣ Verify service category matches
    if (user.serviceCategory !== serviceCategory) {
      return res.status(400).json({ 
        message: `Service category mismatch. You provide ${user.serviceCategory}, but requested ${serviceCategory}` 
      });
    }

    // 3️⃣ Get ALL colonies where this provider has availability (present/future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const availabilityRecords = await Availability.find({
      user: userId,
      date: { $gte: today }, // aaj aur aage ki dates
      isAvailable: true
    })
    .select("colonies date startTime endTime")
    .populate("colonies", "name address city pincode")
    .lean();

    // 4️⃣ Extract unique colony IDs
    const colonyIds = [];
    const colonyDetailsMap = new Map();
    
    availabilityRecords.forEach(record => {
      if (record.colonies && Array.isArray(record.colonies)) {
        record.colonies.forEach(colony => {
          if (colony && !colonyIds.includes(colony._id.toString())) {
            colonyIds.push(colony._id.toString());
            colonyDetailsMap.set(colony._id.toString(), {
              id: colony._id,
              name: colony.name,
              address: colony.address,
              city: colony.city,
              pincode: colony.pincode
            });
          }
        });
      }
    });

    // 5️⃣ Agar koi availability nahi hai, to empty array return karo
    if (colonyIds.length === 0) {
      return res.json({
        message: "No availability set in any colony. Set availability first.",
        needs: [],
        availableColonies: [],
        user: {
          id: user._id,
          name: user.fullName,
          serviceCategory: user.serviceCategory
        }
      });
    }

    // 6️⃣ Find service category ID
    const serviceCat = await ServiceCategory.findOne({ 
      name: serviceCategory,
      isActive: true 
    }).lean();

    if (!serviceCat) {
      return res.status(404).json({ 
        message: "Service category not found or inactive" 
      });
    }

    // 7️⃣ Now fetch needs that match:
    //    - Service Category se match
    //    - Colony me match (jo user ki availability colonies me hai)
    //    - Status open ho
    const needs = await Need.find({
      serviceCategory: serviceCat._id,
      colony: { $in: colonyIds },
      status: "open" // sirf open needs
    })
    .populate("user", "fullName mobileNumber registrationID role address pincode")
    .populate("serviceCategory", "name")
    .populate("colony", "name address city pincode")
    .sort({ createdAt: -1 })
    .lean();

    // 8️⃣ Get colony details for response
    const availableColonies = Array.from(colonyDetailsMap.values());

    return res.json({
      message: `Found ${needs.length} needs in your available colonies`,
      user: {
        id: user._id,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        serviceCategory: user.serviceCategory,
        experience: user.experience,
        tatkalEnabled: user.tatkalEnabled
      },
      availableColonies: availableColonies,
      needs: needs,
      stats: {
        totalNeeds: needs.length,
        availableColoniesCount: availableColonies.length,
        availabilityRecordsCount: availabilityRecords.length
      }
    });

  } catch (err) {
    console.error("getColonySpecificNeeds error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};