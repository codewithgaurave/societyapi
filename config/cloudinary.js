// config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Cloudinary env check
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error("❌ Cloudinary environment variables are missing!");
}

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// -----------------------------------------------------
// ✅ USER PROFILE PHOTO UPLOAD - ALL FILE TYPES ALLOWED
// -----------------------------------------------------
const userStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "society_users",
    resource_type: "auto", // ✅ Allows ALL file types
  },
});

const uploadUserFiles = multer({
  storage: userStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    // ✅ Allow ANY file type
    cb(null, true);
  },
});

// single: profilePhoto
const uploadUserFields = uploadUserFiles.single("profilePhoto");

// -----------------------------------------------------
// ✅ SLIDER IMAGE UPLOAD - ALL FILE TYPES ALLOWED
// -----------------------------------------------------
const sliderStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "society_sliders",
    resource_type: "auto", // ✅ Allows ALL file types
  },
});

const sliderMulter = multer({
  storage: sliderStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    // ✅ Allow ANY file type
    cb(null, true);
  },
});

// single: sliderImage
const uploadSliderImage = sliderMulter.single("sliderImage");

// -----------------------------------------------------
// ✅ SERVICE TEMPLATE UPLOAD (ALLOW ALL FILE TYPES)
// -----------------------------------------------------
const templateStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "society_service_templates",
    resource_type: "auto", // allows ALL file types
  },
});

const templateMulter = multer({
  storage: templateStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB allowed
  fileFilter: (req, file, cb) => {
    // Allow ANY file type
    cb(null, true);
  },
});

// single: templateImage
const uploadTemplateImage = templateMulter.single("templateImage");

// -----------------------------------------------------
// EXPORTS
// -----------------------------------------------------
export {
  cloudinary,
  uploadUserFields,
  uploadSliderImage,
  uploadTemplateImage,
};