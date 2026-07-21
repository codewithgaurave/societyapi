// controllers/employeeController.js
import Employee from "../models/Employee.js";
import User from "../models/User.js";

// Helper to generate employee code if not provided
const generateEmpCode = async () => {
  let unique = false;
  let empCode = "";
  while (!unique) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    empCode = `EMP${randomNum}`;
    const exists = await Employee.findOne({ empCode }).lean();
    if (!exists) unique = true;
  }
  return empCode;
};

// Create a new employee
export const createEmployee = async (req, res) => {
  try {
    let { empCode, name, mobileNumber, email, designation } = req.body;

    if (!name || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and Mobile Number are required",
      });
    }

    if (!empCode || !empCode.trim()) {
      empCode = await generateEmpCode();
    } else {
      empCode = empCode.trim().toUpperCase();
    }

    const existingCode = await Employee.findOne({ empCode }).lean();
    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: `Employee Code '${empCode}' already exists. Please choose a different code.`,
      });
    }

    const existingMobile = await Employee.findOne({ mobileNumber }).lean();
    if (existingMobile) {
      return res.status(409).json({
        success: false,
        message: `Employee with mobile number '${mobileNumber}' already exists.`,
      });
    }

    const employee = await Employee.create({
      empCode,
      name,
      mobileNumber,
      email: email || "",
      designation: designation || "Sales Executive",
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Error creating employee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create employee",
    });
  }
};

// Get all employees with onboarded user count
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 }).lean();

    // Aggregate user counts per employee code
    const counts = await User.aggregate([
      {
        $match: {
          empCode: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$empCode",
          totalOnboarded: { $sum: 1 },
          membersCount: {
            $sum: { $cond: [{ $eq: ["$role", "society member"] }, 1, 0] },
          },
          serviceProvidersCount: {
            $sum: { $cond: [{ $eq: ["$role", "society service"] }, 1, 0] },
          },
        },
      },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      if (c._id) {
        countMap[c._id.toUpperCase()] = c;
      }
    });

    const enrichedEmployees = employees.map((emp) => {
      const stats = countMap[emp.empCode.toUpperCase()] || {
        totalOnboarded: 0,
        membersCount: 0,
        serviceProvidersCount: 0,
      };
      return {
        ...emp,
        totalOnboarded: stats.totalOnboarded,
        membersCount: stats.membersCount,
        serviceProvidersCount: stats.serviceProvidersCount,
      };
    });

    return res.status(200).json({
      success: true,
      data: enrichedEmployees,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch employees",
    });
  }
};

// Get single employee and list of users onboarded by them
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id).lean();
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const onboardedUsers = await User.find({
      $or: [{ onboardedBy: employee._id }, { empCode: employee.empCode }],
    })
      .select(
        "fullName mobileNumber whatsappNumber email registrationID role profileImage address city state pincode createdAtIST tatkalEnabled"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        ...employee,
        onboardedUsers,
        totalOnboarded: onboardedUsers.length,
      },
    });
  } catch (error) {
    console.error("Error fetching employee details:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch employee details",
    });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobileNumber, email, designation, isActive, empCode } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (empCode && empCode.trim().toUpperCase() !== employee.empCode) {
      const formattedCode = empCode.trim().toUpperCase();
      const codeExists = await Employee.findOne({ empCode: formattedCode, _id: { $ne: id } });
      if (codeExists) {
        return res.status(409).json({
          success: false,
          message: `Employee code '${formattedCode}' is already assigned to another employee.`,
        });
      }
      // Update empCode in users if changed
      await User.updateMany(
        { onboardedBy: employee._id },
        { $set: { empCode: formattedCode } }
      );
      employee.empCode = formattedCode;
    }

    if (name !== undefined) employee.name = name.trim();
    if (mobileNumber !== undefined) employee.mobileNumber = mobileNumber.trim();
    if (email !== undefined) employee.email = email.trim();
    if (designation !== undefined) employee.designation = designation.trim();
    if (isActive !== undefined) employee.isActive = Boolean(isActive);

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update employee",
    });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findByIdAndDelete(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete employee",
    });
  }
};

// Verify Employee Code (public/auth endpoint for app validation)
export const verifyEmpCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Employee code is required",
      });
    }

    const employee = await Employee.findOne({
      empCode: code.trim().toUpperCase(),
      isActive: true,
    })
      .select("empCode name designation")
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Invalid or inactive Employee Code",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee code verified",
      data: employee,
    });
  } catch (error) {
    console.error("Error verifying employee code:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify employee code",
    });
  }
};

// Get Employee Onboarding Report (employee-wise users list)
export const getEmployeeOnboardingsReport = async (req, res) => {
  try {
    const { empCode } = req.query;

    let filter = { empCode: { $ne: null } };
    if (empCode) {
      filter.empCode = empCode.trim().toUpperCase();
    }

    const users = await User.find(filter)
      .populate("onboardedBy", "empCode name mobileNumber designation")
      .select(
        "fullName mobileNumber whatsappNumber email registrationID role profileImage address city state pincode empCode onboardedBy createdAtIST"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching onboarding report:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch onboarding report",
    });
  }
};
