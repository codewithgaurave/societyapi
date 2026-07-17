import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

const adminSchema = new mongoose.Schema(
  {
    adminId: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true, select: false },
    name: { type: String, default: "" },
    tokenVersion: { type: Number, default: 0, select: false },

    // IST timestamps
    createdAtIST: { type: String },
    updatedAtIST: { type: String },
  },
  { timestamps: true }
);

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const adminId = "societyhub";
    const password = "societyhub";
    const name = "societyhub";

    const exists = await Admin.findOne({ adminId });
    if (exists) {
        console.log("Admin already exists. Deleting it and recreating...");
        await Admin.deleteOne({ adminId });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await Admin.create({ adminId, password: hash, name });

    console.log("Admin created successfully!");
    console.log("ID:", adminId);
    console.log("Password:", password);

  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
