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

// --------------------------------------------
// ✅ USER PROFILE PHOTO
// --------------------------------------------
const userStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "society_users", // folder name tum apni marzi se rakh sakte ho
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
  },
});

const uploadUserFiles = multer({
  storage: userStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(
      new Error("Invalid file type. Only image files are allowed for profile photo."),
      false
    );
  },
});

// single: profilePhoto
const uploadUserFields = uploadUserFiles.single("profilePhoto");

// --------------------------------------------
// ✅ SLIDER IMAGE UPLOAD
// --------------------------------------------
const sliderStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "society_sliders",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
  },
});

const sliderMulter = multer({
  storage: sliderStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(
      new Error("Invalid file type. Only JPG, PNG, WEBP allowed for slider images."),
      false
    );
  },
});

// single: sliderImage
const uploadSliderImage = sliderMulter.single("sliderImage");

// --------------------------------------------
// EXPORTS
// --------------------------------------------
export { cloudinary, uploadUserFields, uploadSliderImage };
