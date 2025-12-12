import Colony from "../models/Colony.js";
import xlsx from "xlsx";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

// Multer configuration for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv"
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel files are allowed."));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Export upload middleware for use in routes
export const uploadExcel = upload.single("file");

// Admin: Add colony
export const addColony = async (req, res) => {
  try {
    const { name, address, city, pincode, landmark, description } = req.body;

    if (!name || !pincode) {
      return res.status(400).json({ message: "name and pincode are required" });
    }

    const colony = await Colony.create({
      name,
      address,
      city,
      pincode,
      landmark,
      description,
    });

    return res.status(201).json({
      message: "Colony added successfully",
      colony,
    });
  } catch (err) {
    console.error("addColony error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all colonies (public)
export const getColonies = async (req, res) => {
  try {
    const colonies = await Colony.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    return res.json({ colonies });
  } catch (err) {
    console.error("getColonies error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: update colony
export const updateColony = async (req, res) => {
  try {
    const { id } = req.params;

    const colony = await Colony.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!colony) {
      return res.status(404).json({ message: "Colony not found" });
    }

    return res.json({ message: "Colony updated successfully", colony });
  } catch (err) {
    console.error("updateColony error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: delete colony
export const deleteColony = async (req, res) => {
  try {
    const { id } = req.params;

    const colony = await Colony.findByIdAndDelete(id).lean();

    if (!colony) {
      return res.status(404).json({ message: "Colony not found" });
    }

    return res.json({ message: "Colony deleted successfully", colony });
  } catch (err) {
    console.error("deleteColony error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Import colonies from Excel
export const importFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an Excel file" });
    }

    // Read Excel file
    let workbook;
    try {
      workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    } catch (error) {
      return res.status(400).json({ 
        message: "Invalid Excel file format" 
      });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ message: "Excel file has no sheets" });
    }

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

    if (data.length > 1000) {
      return res.status(400).json({ 
        message: "Maximum 1000 records allowed per import" 
      });
    }

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: []
    };

    const importedColonies = [];

    // Generate batch ID for this import
    const batchId = `batch_${uuidv4().substring(0, 8)}_${Date.now()}`;

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because Excel starts at 1 and header is row 1

      try {
        // Extract and normalize column names (case-insensitive, space-insensitive)
        const normalizeKey = (obj, possibleKeys) => {
          const lowerPossibleKeys = possibleKeys.map(k => k.toLowerCase().replace(/\s+/g, ''));
          for (const key in obj) {
            const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
            if (lowerPossibleKeys.includes(normalizedKey)) {
              return obj[key];
            }
          }
          return null;
        };

        const name = normalizeKey(row, ["Name", "Colony Name", "COLONY NAME", "Colony"]);
        const pincode = normalizeKey(row, ["Pincode", "PINCODE", "PIN", "Pincode Number"]);
        const address = normalizeKey(row, ["Address", "ADDRESS", "Full Address"]);
        const city = normalizeKey(row, ["City", "CITY", "City Name"]);
        const landmark = normalizeKey(row, ["Landmark", "LANDMARK", "Land Mark"]);
        const description = normalizeKey(row, ["Description", "DESCRIPTION", "Remarks", "Details"]);

        // Validate required fields
        if (!name) {
          throw new Error("Colony name is required");
        }

        if (!pincode) {
          throw new Error("Pincode is required");
        }

        // Validate pincode is a number
        const pincodeNum = Number(pincode);
        if (isNaN(pincodeNum)) {
          throw new Error("Pincode must be a number");
        }

        if (pincodeNum.toString().length !== 6) {
          throw new Error("Pincode must be 6 digits");
        }

        // Check for duplicate (name + pincode) - case insensitive
        const existingColony = await Colony.findOne({
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          pincode: pincodeNum
        });

        if (existingColony) {
          results.duplicates++;
          results.errors.push(`Row ${rowNumber}: Colony "${name}" with pincode ${pincode} already exists`);
          continue;
        }

        // Create new colony
        const colony = await Colony.create({
          name: name.toString().trim(),
          pincode: pincodeNum,
          address: address ? address.toString().trim() : "",
          city: city ? city.toString().trim() : "",
          landmark: landmark ? landmark.toString().trim() : "",
          description: description ? description.toString().trim() : "",
        });

        importedColonies.push({
          id: colony._id,
          name: colony.name,
          pincode: colony.pincode,
          city: colony.city
        });

        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${rowNumber}: ${error.message}`);
      }
    }

    return res.status(200).json({
      message: "Excel import completed",
      summary: {
        totalRecords: results.total,
        imported: results.success,
        failed: results.failed,
        duplicates: results.duplicates
      },
      importedColonies: importedColonies,
      errors: results.errors.length > 0 ? results.errors.slice(0, 50) : undefined, // Limit to 50 errors
      batchId: batchId
    });

  } catch (err) {
    console.error("importFromExcel error:", err);
    
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ 
        message: "File size too large. Maximum 5MB allowed." 
      });
    }
    
    return res.status(500).json({ 
      message: "Error processing Excel file", 
      error: err.message 
    });
  }
};

// Download sample Excel template
export const downloadSampleTemplate = async (req, res) => {
  try {
    const sampleData = [
      {
        "Name": "Green Park Colony",
        "Pincode": 110016,
        "Address": "123 Green Park",
        "City": "New Delhi",
        "Landmark": "Near AIIMS",
        "Description": "Well maintained colony"
      },
      {
        "Name": "Saket Residency",
        "Pincode": 110017,
        "Address": "456 Saket Road",
        "City": "Delhi",
        "Landmark": "Opposite Select Citywalk",
        "Description": "Gated community"
      },
      {
        "Name": "Vasant Kunj",
        "Pincode": 110070,
        "Address": "Sector C, Vasant Kunj",
        "City": "Delhi",
        "Landmark": "Near DPS School",
        "Description": ""
      }
    ];

    // Create worksheet
    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    
    // Set column widths
    const colWidths = [
      { wch: 25 }, // Name
      { wch: 10 }, // Pincode
      { wch: 30 }, // Address
      { wch: 15 }, // City
      { wch: 20 }, // Landmark
      { wch: 30 }  // Description
    ];
    worksheet['!cols'] = colWidths;

    // Create workbook
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Colonies Template");

    // Add instructions sheet
    const instructions = [
      ["IMPORTANT INSTRUCTIONS:"],
      [""],
      ["1. Do not change the column names"],
      ["2. 'Name' and 'Pincode' are REQUIRED fields"],
      ["3. Pincode must be exactly 6 digits"],
      ["4. Maximum 1000 rows per import"],
      ["5. Supported formats: .xlsx, .xls, .csv"],
      ["6. Remove this instructions sheet before uploading"],
      [""],
      ["Column Descriptions:"],
      ["Name: Colony name (required)"],
      ["Pincode: 6-digit pincode (required)"],
      ["Address: Full address"],
      ["City: City name"],
      ["Landmark: Nearby landmark"],
      ["Description: Additional details"]
    ];
    
    const instructionSheet = xlsx.utils.aoa_to_sheet(instructions);
    xlsx.utils.book_append_sheet(workbook, instructionSheet, "Instructions");

    // Set headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="colony_import_template_${Date.now()}.xlsx"`
    );

    // Write to buffer and send
    const buffer = xlsx.write(workbook, { 
      type: "buffer", 
      bookType: "xlsx" 
    });
    
    res.send(buffer);

  } catch (err) {
    console.error("downloadSampleTemplate error:", err);
    return res.status(500).json({ 
      message: "Error generating template file" 
    });
  }
};

// Bulk delete colonies by IDs
export const bulkDeleteColonies = async (req, res) => {
  try {
    const { colonyIds } = req.body;

    if (!colonyIds || !Array.isArray(colonyIds) || colonyIds.length === 0) {
      return res.status(400).json({ 
        message: "Please provide an array of colony IDs to delete" 
      });
    }

    const result = await Colony.deleteMany({
      _id: { $in: colonyIds }
    });

    return res.json({
      message: "Bulk delete completed",
      deletedCount: result.deletedCount
    });

  } catch (err) {
    console.error("bulkDeleteColonies error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};