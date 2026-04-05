// controllers/userController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import User from "../models/User.js";

// ✅ NEW imports for combined details
import Availability from "../models/Availability.js";
import Holiday from "../models/Holiday.js";
import ServiceTemplate from "../models/ServiceTemplate.js";
import ServiceCategory from "../models/ServiceCategory.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.USER_JWT_EXPIRES_IN || "7d";
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

const signUserJwt = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      type: "user",
      registrationID: user.registrationID,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

// ✅ User Registration (with profile photo)
export const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      mobileNumber,
      whatsappNumber,
      email,
      password,
      address,
      pincode,
      role,
      serviceCategory,
      experience,
      adharCard,
      serviceCharge,
      otherCharges,
      lat, // ✅ Add lat
      lng, // ✅ Add lng
    } = req.body;

    if (!fullName || !mobileNumber || !password || !address || !pincode || !role) {
      return res.status(400).json({
        message:
          "fullName, mobileNumber, password, address, pincode, role are required",
      });
    }

    if (!["society member", "society service"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await User.findOne({ mobileNumber }).lean();
    if (existing) {
      return res
        .status(409)
        .json({ message: "User with this mobileNumber already exists" });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const profileImage = req.file?.path || req.file?.secure_url || null;

    // ✅ Location logic
    let locationData = { type: "Point", coordinates: [0, 0] };
    let fullAddressData = null; // Start as null to avoid redundancy
    let cityData = null;
    let stateData = null;

    // Priority 1: Use lat/lng if provided from frontend
    if (lat && lng) {
      locationData = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)]
      };
    } 

    // Priority 2: Geocode to get robust details
    try {
      const addressString = (lat && lng) ? `${lat},${lng}` : `${address}, ${pincode}, India`;
      const mode = (lat && lng) ? "latlng" : "address";
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?${mode}=${encodeURIComponent(addressString)}&key=${process.env.GOOGLE_MAP_API_KEY}`;
      
      const geoResponse = await axios.get(geoUrl, { timeout: 5000 });
      
      if (geoResponse.data.status === "OK" && geoResponse.data.results.length > 0) {
        const result = geoResponse.data.results[0];
        
        if (!lat || !lng) {
          locationData = {
            type: "Point",
            coordinates: [result.geometry.location.lng, result.geometry.location.lat]
          };
        }
        
        // Loop through all results until we find city and state
        for (const res of geoResponse.data.results) {
          const components = res.address_components;
          
          components.forEach(comp => {
            const types = comp.types;
            
            // ✅ IMPROVED CITY EXTRACTION
            if (!cityData) {
              if (types.includes("locality") || 
                  types.includes("administrative_area_level_2") || 
                  types.includes("sublocality_level_1") ||
                  types.includes("sublocality")) {
                cityData = comp.long_name;
              }
            }

            // ✅ IMPROVED STATE EXTRACTION
            if (!stateData) {
              if (types.includes("administrative_area_level_1")) {
                stateData = comp.long_name;
              }
            }
          });

          if (cityData && stateData) break; 
        }

        // Final fallback: if cityData still null, use the most likely component from any result
        if (!cityData) {
          cityData = geoResponse.data.results[0]?.address_components?.find(c => 
            c.types.includes("locality") || 
            c.types.includes("administrative_area_level_2") ||
            c.types.includes("sublocality_level_1")
          )?.long_name || "Unknown City";
        }
        if (!stateData) {
          stateData = geoResponse.data.results[0]?.address_components?.find(c => 
            c.types.includes("administrative_area_level_1")
          )?.long_name || "Unknown State";
        }

        console.log(`📍 Geocoding Success: City=${cityData}, State=${stateData}`);

        // Address redundancy check: 
        // If Google's formatted address is identical to what user typed/selected, we keep fullAddress as null
        const formatted = result.formatted_address;
        if (formatted && formatted.toLowerCase() !== address.toLowerCase()) {
          fullAddressData = formatted;
        }
      }
    } catch (geoErr) {
      console.error("Geocoding error:", geoErr.message);
    }

    const user = await User.create({
      profileImage,
      fullName,
      mobileNumber,
      whatsappNumber,
      email,
      password: hash,
      address,
      pincode,
      role,
      serviceCategory,
      experience,
      adharCard,
      serviceCharge,
      otherCharges,
      location: locationData,
      fullAddress: fullAddressData,
      // city: cityData,
      // state: stateData,
    });

    const token = signUserJwt(user);

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        registrationID: user.registrationID,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        whatsappNumber: user.whatsappNumber,
        email: user.email,
        address: user.address,
        pincode: user.pincode,
        role: user.role,
        serviceCategory: user.serviceCategory,
        experience: user.experience,
        adharCard: user.adharCard,
        serviceCharge: user.serviceCharge,
        otherCharges: user.otherCharges, // ✅ Changed from perHourCharge to otherCharges
        profileImage: user.profileImage,
        tatkalEnabled: user.tatkalEnabled,
        location: user.location,
        fullAddress: user.fullAddress,
        city: user.city,
        state: user.state,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error("registerUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Step 1: Verify mobile number and return user name
export const verifyMobileForReset = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: "mobileNumber is required" });
    }

    const user = await User.findOne({ mobileNumber }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User found",
      fullName: user.fullName,
      mobileNumber: user.mobileNumber,
    });
  } catch (err) {
    console.error("verifyMobileForReset error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Step 2: Reset password with mobile number and new password
export const resetPassword = async (req, res) => {
  try {
    const { mobileNumber, newPassword } = req.body;

    if (!mobileNumber || !newPassword) {
      return res.status(400).json({
        message: "mobileNumber and newPassword are required",
      });
    }

    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.password = hash;
    await user.save();

    return res.json({
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ User Login (by mobileNumber + password)
export const loginUser = async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    if (!mobileNumber || !password) {
      return res
        .status(400)
        .json({ message: "mobileNumber and password are required" });
    }

    const user = await User.findOne({ mobileNumber }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "User is blocked" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signUserJwt(user);

    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        registrationID: user.registrationID,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        whatsappNumber: user.whatsappNumber,
        email: user.email,
        address: user.address,
        pincode: user.pincode,
        role: user.role,
        serviceCategory: user.serviceCategory,
        experience: user.experience,
        adharCard: user.adharCard,
        serviceCharge: user.serviceCharge,
        otherCharges: user.otherCharges, // ✅ Changed from perHourCharge to otherCharges
        profileImage: user.profileImage,
        tatkalEnabled: user.tatkalEnabled,
        location: user.location,
        fullAddress: user.fullAddress,
        city: user.city,
        state: user.state,
      },
      token,
    });
  } catch (err) {
    console.error("loginUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get own profile (User token required)
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get service category name if exists
    let serviceName = null;
    if (user.serviceCategory) {
      const ServiceCategory = (await import("../models/ServiceCategory.js")).default;
      const category = await ServiceCategory.findById(user.serviceCategory).lean();
      serviceName = category?.name || null;
    }

    // Add serviceName field
    const userWithServiceName = {
      ...user,
      serviceName
    };

    return res.json({ user: userWithServiceName });
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ User: update own profile (edit)
export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      fullName,
      mobileNumber,
      whatsappNumber,
      email,
      password,
      address,
      pincode,
      role,
      serviceCategory,
      experience,
      adharCard,
      serviceCharge,
      otherCharges, // ✅ Changed from perHourCharge to otherCharges
    } = req.body;

    const updates = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (mobileNumber !== undefined) updates.mobileNumber = mobileNumber;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (pincode !== undefined) updates.pincode = pincode;
    if (role !== undefined) updates.role = role;
    if (serviceCategory !== undefined) updates.serviceCategory = serviceCategory;
    if (experience !== undefined) updates.experience = experience;
    if (adharCard !== undefined) updates.adharCard = adharCard;
    if (serviceCharge !== undefined) updates.serviceCharge = serviceCharge;
    if (otherCharges !== undefined) updates.otherCharges = otherCharges; // ✅ Changed

    // password change (optional)
    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      updates.password = hash;
    }

    // new profile photo if provided
    const profileImage = req.file?.path || req.file?.secure_url;
    if (profileImage) {
      updates.profileImage = profileImage;
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error("updateMyProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ User: toggle tatkal seva on/off
export const setMyTatkalStatus = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { tatkalEnabled } = req.body;

    if (typeof tatkalEnabled === "undefined") {
      return res
        .status(400)
        .json({ message: "tatkalEnabled is required (true/false)" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "society service") {
      return res.status(400).json({
        message: "Tatkal seva toggle only allowed for society service users",
      });
    }

    user.tatkalEnabled = !!tatkalEnabled;
    await user.save();

    return res.json({
      message: `Tatkal seva ${user.tatkalEnabled ? "enabled" : "disabled"} successfully`,
      tatkalEnabled: user.tatkalEnabled,
    });
  } catch (err) {
    console.error("setMyTatkalStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ PUBLIC: list all tatkal-enabled society service users with nearby range and search
export const listTatkalUsers = async (req, res) => {
  try {
    const { serviceCategoryId, pincode, colonyId, date, lat, lng, radius, search } = req.query;
    console.log(`🔍 listTatkalUsers called with search="${search}", pincode="${pincode}", lat=${lat}, lng=${lng}`);

    const baseFilter = {
      tatkalEnabled: true,
      isBlocked: false,
      role: "society service",
    };

    if (serviceCategoryId) baseFilter.serviceCategory = serviceCategoryId;
    if (pincode) {
      // Handle both string and number pincodes in DB
      baseFilter.pincode = { $in: [pincode, String(pincode), Number(pincode)] };
    }

    // ✅ Search Filtering (Handled in aggregation pipeline below)

    let users;
    const latNum = lat ? parseFloat(lat) : null;
    const lngNum = lng ? parseFloat(lng) : null;
    const radiusInMeters = radius ? parseFloat(radius) * 1000 : 100000; // Default 100km for better testing visibility

    console.log(`🔍 Tatkal Search Request:`, { 
      search, 
      lat: latNum, 
      lng: lngNum, 
      radius: radiusInMeters / 1000 + "km",
      colonyId,
      date 
    });

    // Standard Aggregation Phases
    const lookupStage = {
      $lookup: {
        from: "servicecategories",
        localField: "serviceCategory",
        foreignField: "_id",
        as: "serviceCategory"
      }
    };
    const unwindStage = {
      $unwind: {
        path: "$serviceCategory",
        preserveNullAndEmptyArrays: true
      }
    };

    try {
      if (latNum !== null && lngNum !== null && !isNaN(latNum) && !isNaN(lngNum)) {
        // 📍 PROXIMITY SEARCH (Includes Distance)
        const geoNearStage = {
          $geoNear: {
            near: { type: "Point", coordinates: [lngNum, latNum] },
            distanceField: "distance",
            maxDistance: radiusInMeters,
            query: baseFilter,
            spherical: true
          }
        };

        const pipeline = [geoNearStage, lookupStage, unwindStage];

        if (search) {
          const searchRegex = new RegExp(search.trim(), "i");
          pipeline.push({
            $match: {
              $or: [
                { fullName: searchRegex },
                { address: searchRegex },
                { fullAddress: searchRegex },
                { "serviceCategory.name": searchRegex }
              ]
            }
          });
        }

        users = await User.aggregate(pipeline);
        console.log(`📍 Found ${users.length} workers nearby`);
      } else {
        // 🌐 GLOBAL SEARCH (No proximity filtering)
        const pipeline = [{ $match: baseFilter }, lookupStage, unwindStage];

        if (search) {
          const searchRegex = new RegExp(search.trim(), "i");
          pipeline.push({
            $match: {
              $or: [
                { fullName: searchRegex },
                { address: searchRegex },
                { fullAddress: searchRegex },
                { "serviceCategory.name": searchRegex }
              ]
            }
          });
        }

        users = await User.aggregate(pipeline);
        console.log(`🌐 Found ${users.length} workers in total`);
      }
    } catch (aggError) {
      console.error("❌ Aggregation failed:", aggError);
      throw aggError; // caught by outer catch
    }

    // Explicitly hide sensitive data
    users = users.map(u => {
      const { password, otp, ...rest } = u;
      return rest;
    });

    // ✅ Filter by availability if location/date specified (existing logic)
    if (colonyId || date) {
      const { default: Availability } = await import("../models/Availability.js");
      
      const availabilityFilter = { isAvailable: true };
      if (colonyId) availabilityFilter.colonies = colonyId;
      if (date) availabilityFilter.date = new Date(date);

      const availableUsers = await Availability.find(availabilityFilter)
        .populate("user", "_id")
        .lean();
      
      const availableUserIds = availableUsers.map(av => av.user ? av.user._id.toString() : null).filter(id => id);
      users = users.filter(user => availableUserIds.includes(user._id.toString()));
      console.log(`📅 Availability filtering applied: ${users.length} remain`);
    }

    return res.json({ users });
  } catch (err) {
    console.error("❌ listTatkalUsers server error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error in Tatkal discovery",
      error: err.message 
    });
  }
};

// ✅ PUBLIC: list tatkal-enabled society service users by pincode with availability and search
export const listTatkalUsersByPincode = async (req, res) => {
  try {
    const { pincode, serviceCategoryId, date, colonyId, search } = req.query;

    if (!pincode) {
      return res.status(400).json({
        message: "pincode is required",
      });
    }

    const filter = {
      tatkalEnabled: true,
      isBlocked: false,
      role: "society service",
      pincode: Number(pincode),
    };

    if (serviceCategoryId) {
      filter.serviceCategory = serviceCategoryId;
    }

    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "servicecategories",
          localField: "serviceCategory",
          foreignField: "_id",
          as: "serviceCategory"
        }
      },
      {
        $unwind: {
          path: "$serviceCategory",
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    // ✅ Search Filtering (Name, Address, Service Category)
    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { fullName: searchRegex },
            { address: searchRegex },
            { fullAddress: searchRegex },
            { "serviceCategory.name": searchRegex }
          ]
        }
      });
    }

    let users = await User.aggregate(pipeline);
    console.log(`📍 Pincode Search: Found ${users.length} workers in pincode ${pincode}`);

    // Hide sensitive data
    users = users.map(u => {
      const { password, otp, ...rest } = u;
      return rest;
    });

    // ✅ Filter by availability and location
    const { default: Availability } = await import("../models/Availability.js");
    const { default: Colony } = await import("../models/Colony.js");
    
    const availabilityFilter = { isAvailable: true };
    
    // Filter by colony or pincode-based colonies
    if (colonyId) {
      availabilityFilter.colonies = colonyId;
    } else {
      // Find colonies in this pincode
      const colonies = await Colony.find({ pincode: Number(pincode) }).lean();
      const colonyIds = colonies.map(c => c._id);
      if (colonyIds.length > 0) {
        availabilityFilter.colonies = { $in: colonyIds };
      }
    }
    
    if (date) availabilityFilter.date = new Date(date);

    const availableUsers = await Availability.find(availabilityFilter)
      .populate("user", "_id")
      .lean();
    
    const availableUserIds = availableUsers.map(av => av.user._id.toString());
    users = users.filter(user => availableUserIds.includes(user._id.toString()));

    return res.json({ users });
  } catch (err) {
    console.error("listTatkalUsersByPincode error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ Admin: list all users
export const listUsers = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const users = await User.find({}, "-password").lean();
    return res.json({ users });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: block / unblock user
export const setUserBlockStatus = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const { id } = req.params;
    const { isBlocked } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isBlocked: !!isBlocked },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: `User ${isBlocked ? "blocked" : "unblocked"} successfully`,
      user,
    });
  } catch (err) {
    console.error("setUserBlockStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: update any user (edit)
export const adminUpdateUser = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const { id } = req.params;
    const {
      fullName,
      mobileNumber,
      whatsappNumber,
      email,
      password,
      address,
      pincode,
      role,
      serviceCategory,
      experience,
      adharCard,
      serviceCharge,
      otherCharges, // ✅ Changed from perHourCharge to otherCharges
      isBlocked,
      tatkalEnabled,
    } = req.body;

    const updates = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (mobileNumber !== undefined) updates.mobileNumber = mobileNumber;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (pincode !== undefined) updates.pincode = pincode;
    if (role !== undefined) updates.role = role;
    if (serviceCategory !== undefined) updates.serviceCategory = serviceCategory;
    if (experience !== undefined) updates.experience = experience;
    if (adharCard !== undefined) updates.adharCard = adharCard;
    if (serviceCharge !== undefined) updates.serviceCharge = serviceCharge;
    if (otherCharges !== undefined) updates.otherCharges = otherCharges; // ✅ Changed
    if (isBlocked !== undefined) updates.isBlocked = !!isBlocked;
    if (tatkalEnabled !== undefined) updates.tatkalEnabled = !!tatkalEnabled;

    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      updates.password = hash;
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User updated successfully",
      user,
    });
  } catch (err) {
    console.error("adminUpdateUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: delete user (hard delete)
export const deleteUser = async (req, res) => {
  try {
    if (!req.user || !req.user.adminId) {
      return res.status(403).json({ message: "Admins only" });
    }

    const { id } = req.params;

    const user = await User.findByIdAndDelete(id).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User deleted successfully",
      user,
    });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ------------------------------------------------------------------ */
/* ✅ NEW: Get full user details by userId (public)
   - basic user detail
   - availability[]
   - holidays[]
   - templates[]
   - hasActiveHoliday (aaj chhutti pe hai ya nahi)
   - hasTemplates
   URL: GET /api/users/:id/details
/* ------------------------------------------------------------------ */

export const getUserDetailsById = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.query; // ✅ For distance calculation

    const user = await User.findById(id).populate("serviceCategory", "name").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let availabilityList = await Availability.find({ user: id })
        .populate("colonies", "name address city pincode")
        .sort({ date: 1, startTime: 1 })
        .lean();

    // ✅ Calculate distance for each availability if lat/lng is provided
    if (lat && lng) {
      const lat1 = parseFloat(lat);
      const lng1 = parseFloat(lng);

      availabilityList = availabilityList.map(av => {
        if (av.location && av.location.coordinates && 
            av.location.coordinates[0] !== 0 && av.location.coordinates[1] !== 0) {
          
          const lng2 = av.location.coordinates[0];
          const lat2 = av.location.coordinates[1];
          
          // Haversine formula for distance in KM
          const R = 6371; // Earth's radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c * 1000; // Distance in meters
          
          return { ...av, distance: distance };
        }
        return av;
      });
    }

    const [holidays, templates] = await Promise.all([
      Holiday.find({ user: id })
        .sort({ startDate: -1 })
        .lean(),
      ServiceTemplate.find({ user: id, isActive: true })
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

    return res.json({
      user,
      availability: availabilityList,
      holidays,
      templates,
      hasActiveHoliday,
      hasTemplates,
    });
  } catch (err) {
    console.error("getUserDetailsById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ PUBLIC: get all users (safe public data only)
export const getAllUsersPublic = async (req, res) => {
  try {
    const users = await User.find(
      { isBlocked: false }, // sirf non-blocked users
      `fullName mobileNumber whatsappNumber email registrationID 
       profileImage role serviceCategory experience tatkalEnabled 
       pincode address otherCharges serviceCharge` // ✅ Added otherCharges here
    )
      .populate("serviceCategory", "name description")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ users });
  } catch (err) {
    console.error("getAllUsersPublic error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ DEBUG: Get all society service users (for debugging)
export const getAllSocietyServiceUsers = async (req, res) => {
  try {
    const users = await User.find(
      { 
        role: "society service",
        isBlocked: false 
      },
      `fullName mobileNumber pincode role serviceCategory address`
    )
      .populate("serviceCategory", "name")
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📋 Found ${users.length} society service users in database`);
    
    return res.json({
      count: users.length,
      users: users.map(user => ({
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        pincode: user.pincode,
        role: user.role,
        serviceCategory: user.serviceCategory,
        address: user.address
      }))
    });
  } catch (err) {
    console.error("getAllSocietyServiceUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ PUBLIC: get society service users by location with availability filtering
export const getSocietyServiceUsersByLocation = async (req, res) => {
  try {
    const { pincode, serviceCategoryId } = req.query;

    if (!pincode) {
      return res.status(400).json({
        message: "pincode is required",
      });
    }

    const filter = {
      isBlocked: false,
      role: "society service",
      pincode: Number(pincode),
    };

    // Filter by service category ID (optional)
    if (serviceCategoryId) {
      filter.serviceCategory = serviceCategoryId;
    }

    console.log('🔍 Searching for users with filter:', filter);

    // Get users registered in this pincode
    const registeredUsers = await User.find(
      filter,
      `fullName mobileNumber whatsappNumber email registrationID
       profileImage role serviceCategory experience tatkalEnabled
       pincode address otherCharges serviceCharge`
    )
      .populate("serviceCategory", "name description")
      .sort({ createdAt: -1 })
      .lean();

    // Get users who have availability in this pincode's colonies
    const { default: Availability } = await import("../models/Availability.js");
    const { default: Colony } = await import("../models/Colony.js");
    
    const colonies = await Colony.find({ pincode: Number(pincode) }).lean();
    const colonyIds = colonies.map(c => c._id);
    
    let availableUsers = [];
    if (colonyIds.length > 0) {
      const availabilityFilter = {
        isAvailable: true,
        colonies: { $in: colonyIds }
      };
      
      const availabilities = await Availability.find(availabilityFilter)
        .populate({
          path: "user",
          match: { isBlocked: false, role: "society service" },
          select: `fullName mobileNumber whatsappNumber email registrationID
                   profileImage role serviceCategory experience tatkalEnabled
                   pincode address otherCharges serviceCharge`,
          populate: {
            path: "serviceCategory",
            select: "name description"
          }
        })
        .lean();
      
      availableUsers = availabilities
        .filter(av => av.user && (!serviceCategoryId || av.user.serviceCategory?._id?.toString() === serviceCategoryId))
        .map(av => av.user);
    }

    // Combine and deduplicate users
    const userMap = new Map();
    
    registeredUsers.forEach(user => {
      userMap.set(user._id.toString(), user);
    });
    
    availableUsers.forEach(user => {
      userMap.set(user._id.toString(), user);
    });
    
    const allUsers = Array.from(userMap.values());

    console.log(`✅ Found ${allUsers.length} users for pincode ${pincode}`);

    return res.json({
      count: allUsers.length,
      users: allUsers,
      filters: {
        pincode: Number(pincode),
        serviceCategoryId
      }
    });
  } catch (err) {
    console.error("getSocietyServiceUsersByLocation error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
