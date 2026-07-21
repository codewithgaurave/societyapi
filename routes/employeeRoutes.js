// routes/employeeRoutes.js
import express from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  verifyEmpCode,
  getEmployeeOnboardingsReport,
} from "../controllers/employeeController.js";

const router = express.Router();

// Verification endpoint (public for signup verification)
router.get("/verify/:code", verifyEmpCode);

// Onboarding report endpoint
router.get("/onboardings/report", getEmployeeOnboardingsReport);

// CRUD routes
router.post("/", createEmployee);
router.get("/", getAllEmployees);
router.get("/:id", getEmployeeById);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;
