// controllers/availabilityController.js
import Availability from "../models/Availability.js";
import User from "../models/User.js";
import axios from "axios";

// Helper: HH:mm basic validation
const isValidTime = (t) => /^\d{2}:\d{2}$/.test(t);

// Helper: normalize colonyIds from body
const normalizeColonyIds = (colonyIds) => {
  if (!colonyIds) return [];
  if (Array.isArray(colonyIds)) return colonyIds.filter(Boolean);
  // if string (e.g. single id or comma separated)
  if (typeof colonyIds === "string") {
    if (colonyIds.includes(",")) {
      return colonyIds
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
    return [colonyIds.trim()];
  }
  return [];
};

// ✅ Add availability (by token - logged in user)
// availabilityType: "single" | "range" | "always"
export const addMyAvailability = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      availabilityType = "single",
      date,
      startDate,
      endDate,
      startTime,
      endTime,
      isAvailable,
      notes,
      colonyIds,
      lat, // ✅ GPS
      lng, // ✅ GPS
      address, // ✅ Manual address
    } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ message: "startTime aur endTime required hain" });
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return res.status(400).json({ message: "startTime/endTime HH:mm format mein hona chahiye" });
    }

    if (!["single", "range", "always"].includes(availabilityType)) {
      return res.status(400).json({ message: "availabilityType: single, range, ya always hona chahiye" });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "society service") {
      return res.status(400).json({ message: "Only society service users can set availability" });
    }

    const coloniesArr = normalizeColonyIds(colonyIds);

    // ✅ Location Geocoding Logic
    let locationData = { type: "Point", coordinates: [0, 0] };
    let cityData = null;
    let stateData = null;
    let finalAddress = address;

    if (lat && lng) {
      locationData = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)]
      };
    }

    if ((lat && lng) || address) {
      try {
        const addressString = (lat && lng) ? `${lat},${lng}` : `${address}, India`;
        const mode = (lat && lng) ? "latlng" : "address";
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?${mode}=${encodeURIComponent(addressString)}&key=${process.env.GOOGLE_MAP_API_KEY}`;

        const geoResponse = await axios.get(geoUrl, { timeout: 4000 });

        if (geoResponse.data.status === "OK" && geoResponse.data.results.length > 0) {
          const result = geoResponse.data.results[0];

          if (!lat && !lng) {
            locationData = {
              type: "Point",
              coordinates: [result.geometry.location.lng, result.geometry.location.lat]
            };
          }

          if (!finalAddress) finalAddress = result.formatted_address;

          // Exhaustive search through all results for city and state
          for (const res of geoResponse.data.results) {
            const compArr = res.address_components;
            compArr.forEach(comp => {
              const types = comp.types;
              if (!cityData && (types.includes("locality") || types.includes("administrative_area_level_2") || types.includes("administrative_area_level_3") || types.includes("sublocality_level_1"))) {
                cityData = comp.long_name;
              }
              if (!stateData && types.includes("administrative_area_level_1")) {
                stateData = comp.long_name;
              }
            });
            if (cityData && stateData) break;
          }
        }
      } catch (geoErr) {
        console.error("Availability geocoding error:", geoErr.message);
      }
    }

    const availData = {
      user: userId,
      availabilityType,
      startTime,
      endTime,
      isAvailable: typeof isAvailable === "boolean" ? isAvailable : true,
      notes,
      colonies: coloniesArr,
      location: locationData,
      address: finalAddress,
      city: cityData,
      state: stateData
    };

    if (availabilityType === "single") {
      if (!date) return res.status(400).json({ message: "single type ke liye date required hai" });
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ message: "Invalid date" });
      availData.date = d;

    } else if (availabilityType === "range") {
      if (!startDate || !endDate) return res.status(400).json({ message: "range type ke liye startDate aur endDate required hain" });
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return res.status(400).json({ message: "Invalid date format" });
      if (e < s) return res.status(400).json({ message: "endDate, startDate se pehle nahi ho sakti" });
      availData.startDate = s;
      availData.endDate = e;

    }
    // always type ke liye koi date nahi chahiye

    const availability = await Availability.create(availData);

    const populated = await Availability.findById(availability._id)
      .populate("user", "fullName mobileNumber serviceCategory role tatkalEnabled")
      .populate("colonies", "name address city pincode")
      .lean();

    return res.status(201).json({
      message: "Availability added successfully",
      availability: populated,
    });
  } catch (err) {
    console.error("addMyAvailability error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Edit availability (only owner or admin)
export const updateAvailability = async (req, res) => {
  try {
    const auth = req.user || {};
    const { id } = req.params;
    const { date, startTime, endTime, isAvailable, notes, colonyIds, lat, lng, address } = req.body;

    const availability = await Availability.findById(id);
    if (!availability) {
      return res.status(404).json({ message: "Availability not found" });
    }

    // Authorization: user owner or admin
    const isAdmin = !!auth.adminId;
    const isOwner = auth.sub && String(availability.user) === String(auth.sub);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const updates = {};

    if (date !== undefined) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      updates.date = d;
    }

    if (startTime !== undefined) {
      if (!isValidTime(startTime)) {
        return res.status(400).json({ message: "Invalid startTime format" });
      }
      updates.startTime = startTime;
    }

    if (endTime !== undefined) {
      if (!isValidTime(endTime)) {
        return res.status(400).json({ message: "Invalid endTime format" });
      }
      updates.endTime = endTime;
    }

    if (isAvailable !== undefined) updates.isAvailable = !!isAvailable;
    if (notes !== undefined) updates.notes = notes;

    if (colonyIds !== undefined) {
      updates.colonies = normalizeColonyIds(colonyIds);
    }

    // ✅ Location Updates
    if (lat !== undefined && lng !== undefined) {
      updates.location = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)]
      };
    }
    if (address !== undefined) updates.address = address;

    const updated = await Availability.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("user", "fullName mobileNumber serviceCategory role tatkalEnabled")
      .populate("colonies", "name address city pincode")
      .lean();

    return res.json({
      message: "Availability updated successfully",
      availability: updated,
    });
  } catch (err) {
    console.error("updateAvailability error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete availability (only owner or admin)
export const deleteAvailability = async (req, res) => {
  try {
    const auth = req.user || {};
    const { id } = req.params;

    const availability = await Availability.findById(id);
    if (!availability) {
      return res.status(404).json({ message: "Availability not found" });
    }

    const isAdmin = !!auth.adminId;
    const isOwner = auth.sub && String(availability.user) === String(auth.sub);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const deleted = await Availability.findByIdAndDelete(id)
      .populate("user", "fullName mobileNumber serviceCategory role tatkalEnabled")
      .populate("colonies", "name address city pincode")
      .lean();

    return res.json({
      message: "Availability deleted successfully",
      availability: deleted,
    });
  } catch (err) {
    console.error("deleteAvailability error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Show all availability (admin / public)
// GET /api/availability
export const getAllAvailability = async (_req, res) => {
  try {
    const list = await Availability.find({})
      .populate("user", "fullName mobileNumber serviceCategory role tatkalEnabled")
      .populate("colonies", "name address city pincode")
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({ availability: list });
  } catch (err) {
    console.error("getAllAvailability error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Show my availability (by token)
// GET /api/availability/me
export const getMyAvailability = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const list = await Availability.find({ user: userId })
      .populate("colonies", "name address city pincode")
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({ availability: list });
  } catch (err) {
    console.error("getMyAvailability error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Show availability by userId (public / admin)
// GET /api/availability/user/:userId
export const getAvailabilityByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const list = await Availability.find({ user: userId })
      .populate("colonies", "name address city pincode")
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({ availability: list });
  } catch (err) {
    console.error("getAvailabilityByUserId error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get single availability by id
// GET /api/availability/:id
export const getAvailabilityById = async (req, res) => {
  try {
    const { id } = req.params;

    const availability = await Availability.findById(id)
      .populate("user", "fullName mobileNumber serviceCategory role tatkalEnabled")
      .populate("colonies", "name address city pincode")
      .lean();

    if (!availability) {
      return res.status(404).json({ message: "Availability not found" });
    }

    return res.json({ availability });
  } catch (err) {
    console.error("getAvailabilityById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
