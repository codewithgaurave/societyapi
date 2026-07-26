// config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads/category-icons directory exists
const categoryIconsDir = path.join(__dirname, "../uploads/category-icons");
if (!fs.existsSync(categoryIconsDir)) {
  fs.mkdirSync(categoryIconsDir, { recursive: true });
}

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
// ✅ CATEGORY ICON UPLOAD — LOCAL DISK STORAGE
// -----------------------------------------------------
const categoryIconStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, categoryIconsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

const categoryIconMulter = multer({
  storage: categoryIconStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

const uploadCategoryIcon = categoryIconMulter.single("icon");

// -----------------------------------------------------
// EXPORTS
// -----------------------------------------------------
export {
  cloudinary,
  uploadUserFields,
  uploadSliderImage,
  uploadTemplateImage,
  uploadCategoryIcon,
};