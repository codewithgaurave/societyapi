// middleware/adminAuth.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin from "../models/Admin.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticateAdmin = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Admin token missing" });

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Some JWTs use .id, some use .sub
    const adminIdToFind = decoded.sub || decoded.id;

    const admin = await Admin.findOne({ _id: adminIdToFind, adminId: decoded.adminId }).select("+tokenVersion");
    if (!admin) {
      console.log("Admin not found in DB for ID:", adminIdToFind);
      return res.status(401).json({ message: "Invalid admin token (not found)" });
    }
    
    // Check tokenVersion if we're using that strategy
    if (decoded.tv !== undefined && admin.tokenVersion !== decoded.tv) {
      console.log("Admin token version mismatch! DB:", admin.tokenVersion, "Req:", decoded.tv);
      return res.status(401).json({ message: "Invalid admin token (version mismatch)" });
    }

    req.admin = { id: admin._id.toString(), adminId: admin.adminId, name: admin.name };
    next();
  } catch (err) {
    console.log("Admin auth error:", err.message);
    return res.status(401).json({ message: "Unauthorized (admin)", error: err.message });
  }
};
