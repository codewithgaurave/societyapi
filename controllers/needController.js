// controllers/needController.js
import Need from "../models/Need.js";
import User from "../models/User.js";
import Colony from "../models/Colony.js";
import ServiceCategory from "../models/ServiceCategory.js";
import Availability from "../models/Availability.js";
import Holiday from "../models/Holiday.js";
import ServiceTemplate from "../models/ServiceTemplate.js";


// ✅ Create need (society member need post karega)
// Body: { userId, serviceCategoryId, colonyId, description, fullAddress?, lat?, lng? }
export const createNeed = async (req, res) => {
  try {
    const { userId, serviceCategoryId, colonyId, description, fullAddress, lat, lng, pincode } = req.body;

    if (!userId || !serviceCategoryId || (!colonyId && !pincode) || !description) {
      return res.status(400).json({
        message:
          "userId, serviceCategoryId, (colonyId ya pincode) aur description required hain",
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

    // colony check (sirf agar colonyId di hai)
    if (colonyId) {
      const colony = await Colony.findById(colonyId).lean();
      if (!colony || !colony.isActive) {
        return res
          .status(400)
          .json({ message: "Colony invalid ya inactive hai" });
      }
    }

    const needData = {
      user: userId,
      serviceCategory: serviceCategoryId,
      description,
      // ✅ Save location data if provided
      ...(colonyId && { colony: colonyId }),
      ...(pincode && { pincode: Number(pincode) }),
      ...(fullAddress && { fullAddress }),
      ...(lat !== undefined && lat !== null && { lat: parseFloat(lat) }),
      ...(lng !== undefined && lng !== null && { lng: parseFloat(lng) }),
    };

    const need = await Need.create(needData);

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
    const { serviceCategoryId, colonyId, status, pincode } = req.query;

    const filter = {};
    if (serviceCategoryId) filter.serviceCategory = serviceCategoryId;
    if (colonyId) filter.colony = colonyId;
    if (status) filter.status = status;
    if (pincode) filter.pincode = Number(pincode);

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
    const { serviceCategoryId } = req.query;

    if (!serviceCategoryId) {
      return res.status(400).json({ 
        message: "serviceCategoryId query parameter required" 
      });
    }

    // 1️⃣ Check user exists and is service provider
    const user = await User.findById(userId)
      .populate("serviceCategory", "name")
      .lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "society service") {
      return res.status(400).json({ 
        message: "Only service providers can access this" 
      });
    }

    // 2️⃣ Verify service category matches
    if (user.serviceCategory?._id?.toString() !== serviceCategoryId) {
      return res.status(400).json({ 
        message: `Service category mismatch. You provide ${user.serviceCategory?.name}, but requested different category` 
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

    // 6️⃣ Now fetch needs that match:
    //    - Service Category se match
    //    - Colony me match (jo user ki availability colonies me hai)
    //    - Status open ho
    const needs = await Need.find({
      serviceCategory: serviceCategoryId,
      colony: { $in: colonyIds },
      status: "open" // sirf open needs
    })
    .populate("user", "fullName mobileNumber registrationID role address pincode")
    .populate("serviceCategory", "name")
    .populate("colony", "name address city pincode")
    .sort({ createdAt: -1 })
    .lean();

    // 7️⃣ Get colony details for response
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

// ✅ Get needs for logged-in user based on their availability colonies
// GET /api/needs/my-available-needs/:userId
export const getMyAvailableNeeds = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.serviceCategory) return res.status(400).json({ message: "User ki service category set nahi hai" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // single: aaj ki date match karo
    // range: aaj startDate aur endDate ke beech ho
    // always: koi date check nahi
    const availabilityRecords = await Availability.find({
      user: userId,
      isAvailable: true,
      $or: [
        { availabilityType: "always" },
        { availabilityType: "single", date: { $gte: today } },
        { availabilityType: "range", startDate: { $lte: today }, endDate: { $gte: today } },
        // range jo aage bhi chalegi
        { availabilityType: "range", startDate: { $gte: today } },
      ]
    })
    .select("colonies")
    .lean();

    const colonyIds = [];
    availabilityRecords.forEach(record => {
      if (record.colonies && Array.isArray(record.colonies)) {
        record.colonies.forEach(colonyId => {
          if (!colonyIds.includes(colonyId.toString())) {
            colonyIds.push(colonyId.toString());
          }
        });
      }
    });

    // 4️⃣ Extract colony pincodes and ensure ObjectId conversion
    const colonies = await Colony.find({ _id: { $in: colonyIds } }).select("pincode").lean();
    const colonyPincodes = colonies.map(c => Number(c.pincode)).filter(p => !isNaN(p));
    
    // Add user's own profile pincode as fallback
    if (user.pincode) {
      colonyPincodes.push(Number(user.pincode));
    }

    const { lat: userLat, lng: userLng } = req.query;

    console.log(`🔍 Finding needs for: CID=${user.serviceCategory}, Colonies=[${colonyIds}], PINs=[${colonyPincodes}]`);

    // 5️⃣ Find needs matching category and (colony OR pincode)
    let needs = await Need.find({
      serviceCategory: user.serviceCategory,
      status: "open",
      $or: [
        { colony: { $in: colonyIds } },
        { pincode: { $in: colonyPincodes } }
      ]
    })
    .populate("user", "fullName mobileNumber registrationID")
    .populate("serviceCategory", "name")
    .populate("colony", "name address city pincode")
    .lean();

    console.log(`✅ Found ${needs.length} potential needs before sorting`);

    // 6️⃣ Calculate distance and sort if lat/lng are provided
    if (userLat && userLng) {
      const p1 = { lat: parseFloat(userLat), lng: parseFloat(userLng) };
      
      needs = needs.map(need => {
        if (need.lat && need.lng) {
          const p2 = { lat: need.lat, lng: need.lng };
          // Standard Haversine distance in KM
          const R = 6371;
          const dLat = (p2.lat - p1.lat) * Math.PI / 180;
          const dLng = (p2.lng - p1.lng) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          need.distance = R * c;
        } else {
          need.distance = 999999; // Far away or unknown
        }
        return need;
      });

      // Sort: closest first
      needs.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
    } else {
      // Sort by newest first if no location
      needs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.json({
      message: `${needs.length} needs milein aapke working area mein`,
      count: needs.length,
      needs
    });

  } catch (err) {
    console.error("getMyAvailableNeeds error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ NEW: Get needs by service category and pincode with availability filtering
export const getNeedsByServiceCategoryAndPincode = async (req, res) => {
  try {
    const { serviceCategoryId, pincode, userId } = req.query;

    if (!serviceCategoryId || !pincode) {
      return res.status(400).json({
        message: "serviceCategoryId and pincode are required"
      });
    }

    let colonyIds = [];

    // If userId provided, get colonies where user has availability
    if (userId) {
      const availabilityRecords = await Availability.find({
        user: userId,
        isAvailable: true
      })
      .select("colonies")
      .lean();

      const userColonyIds = [];
      availabilityRecords.forEach(record => {
        if (record.colonies && Array.isArray(record.colonies)) {
          record.colonies.forEach(colonyId => {
            if (!userColonyIds.includes(colonyId.toString())) {
              userColonyIds.push(colonyId.toString());
            }
          });
        }
      });
      colonyIds = userColonyIds;
    } else {
      // If no userId, find all colonies with matching pincode
      const colonies = await Colony.find({ 
        pincode: Number(pincode),
        isActive: true 
      }).lean();
      colonyIds = colonies.map(colony => colony._id);
    }

    if (colonyIds.length === 0) {
      return res.json({
        message: userId ? "No availability set in any colony. Set availability first." : "No active colonies found for this pincode",
        count: 0,
        needs: [],
        colonies: [],
        filters: { serviceCategoryId, pincode: Number(pincode) }
      });
    }

    // Find needs matching service category and colonies
    const needs = await Need.find({
      serviceCategory: serviceCategoryId,
      colony: { $in: colonyIds },
      status: "open"
    })
    .populate("user", "fullName mobileNumber registrationID role address pincode")
    .populate("serviceCategory", "name description")
    .populate("colony", "name address city pincode")
    .sort({ createdAt: -1 })
    .lean();

    // Get colony details for response
    const colonies = await Colony.find({ _id: { $in: colonyIds } }).lean();

    return res.json({
      message: `Found ${needs.length} needs for the specified category and location`,
      count: needs.length,
      needs,
      colonies,
      filters: {
        serviceCategoryId,
        pincode: Number(pincode)
      }
    });

  } catch (err) {
    console.error("getNeedsByServiceCategoryAndPincode error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};