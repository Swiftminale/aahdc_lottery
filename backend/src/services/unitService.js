// backend/src/services/unitService.js
const XLSX = require("xlsx"); // Import xlsx library
const db = require("../database"); // Import database connection and models (e.g., db.Unit)

// We'll define the Unit model in the next step. For now, let's use a placeholder.
// You'll replace this with db.Unit when you create the actual model.
const Unit = db.sequelize.define("Unit", {}, { freezeTableName: true }); // Placeholder Unit model

// Input Requirements and Typological Caps for validation
const TYPOLOGY_CAPS = {
  Studio: 0.15, // max 15%
  "1BR": 0.4, // max 40%
  "2BR": 0.25, // max 25%
  "3BR": 0.2, // max 20%
  Shop: 0.3, // 30% of commercial area to AAHDC (this rule needs context, for now we just validate existence)
};

const REQUIRED_FIELDS = [
  "Unique ID",
  "Typology",
  "Net Area",
  "Gross Area",
  "Floor Number",
  "Block/Building Name",
  "Total Gross Area of Building",
  "Phone Number",
];

/**
 * Imports units from an Excel file, validates them, and saves to the database.
 * @param {Buffer} fileBuffer - The buffer of the uploaded Excel file.
 * @param {string} fileName - The name of the uploaded file.
 */
async function importUnitsFromExcel(fileBuffer, fileName) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0]; // Get the first sheet
  const worksheet = workbook.Sheets[sheetName];

  // Convert sheet to JSON, header field names will be inferred from the first row
  const unitsData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!unitsData || unitsData.length < 2) {
    throw new Error("Excel file is empty or contains no data rows.");
  }

  const headers = unitsData[0]; // First row is headers
  const rows = unitsData.slice(1); // Remaining rows are data

  const errors = [];
  const importedUnits = [];
  let importedCount = 0;

  // --- Start Validation ---
  // 1. Check for required headers
  const missingHeaders = REQUIRED_FIELDS.filter(
    (field) => !headers.includes(field)
  );
  if (missingHeaders.length > 0) {
    errors.push(
      `Missing required headers in Excel: ${missingHeaders.join(", ")}`
    );
    // If headers are missing, we cannot proceed meaningfully
    return { importedCount: 0, errors: errors };
  }

  const uniqueUnitIds = new Set();
  let totalGrossAreaInSubmission = 0; // Sum of gross areas from THIS submission
  const typologyCounts = {}; // { Studio: 5, '1BR': 10 }
  const typologyGrossAreas = {}; // { Studio: 1500, '1BR': 4000 }
  const blockTotalGrossAreas = {}; // { BlockA: 10000 }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const unit = {};
    let isValidRow = true;
    const rowErrors = [];

    // Map row data to unit object using headers
    headers.forEach((header, index) => {
      unit[header] = row[index];
    });

    // Basic Data Presence & Type Validation
    REQUIRED_FIELDS.forEach((field) => {
      if (!unit[field] && unit[field] !== 0) {
        // Allow 0 for numeric fields
        rowErrors.push(`${field} is missing.`);
        isValidRow = false;
      }
    });

    // Type checking for numeric fields
    const numericFields = [
      "Net Area",
      "Gross Area",
      "Floor Number",
      "Total Gross Area of Building",
    ];
    numericFields.forEach((field) => {
      if (unit[field] !== undefined && typeof unit[field] !== "number") {
        // Attempt to convert if it's a string that looks like a number
        const numValue = parseFloat(unit[field]);
        if (isNaN(numValue)) {
          rowErrors.push(`${field} must be a number.`);
          isValidRow = false;
        } else {
          unit[field] = numValue; // Convert to number if successful
        }
      }
    });

    // Specific field validations
    if (unit["Unique ID"] && uniqueUnitIds.has(unit["Unique ID"])) {
      rowErrors.push(`Duplicate Unit ID: ${unit["Unique ID"]}.`);
      isValidRow = false;
    } else if (unit["Unique ID"]) {
      uniqueUnitIds.add(unit["Unique ID"]);
    }

    if (!Object.keys(TYPOLOGY_CAPS).includes(unit["Typology"])) {
      rowErrors.push(
        `Invalid Typology: ${unit["Typology"]}. Must be one of: ${Object.keys(
          TYPOLOGY_CAPS
        ).join(", ")}.`
      );
      isValidRow = false;
    }

    if (unit["Gross Area"] <= 0) {
      rowErrors.push("Gross Area must be positive.");
      isValidRow = false;
    }
    if (unit["Net Area"] <= 0) {
      rowErrors.push("Net Area must be positive.");
      isValidRow = false;
    }
    if (unit["Floor Number"] < 0) {
      rowErrors.push("Floor Number cannot be negative.");
      isValidRow = false;
    }
    if (unit["Total Gross Area of Building"] <= 0) {
      rowErrors.push("Total Gross Area of Building must be positive.");
      isValidRow = false;
    }

    if (!isValidRow) {
      errors.push(`Row ${i + 2}: ${rowErrors.join("; ")}`); // +2 because 0-indexed and header row
      continue; // Skip invalid row
    }

    // Accumulate for aggregate validations
    totalGrossAreaInSubmission += unit["Gross Area"];
    typologyCounts[unit["Typology"]] =
      (typologyCounts[unit["Typology"]] || 0) + 1;
    typologyGrossAreas[unit["Typology"]] =
      (typologyGrossAreas[unit["Typology"]] || 0) + unit["Gross Area"];
    blockTotalGrossAreas[unit["Block/Building Name"]] =
      unit["Total Gross Area of Building"]; // Assume this is consistent per block

    // If row is valid, add to list for import
    importedUnits.push(unit);
  }

  // Aggregate Validations (after processing all rows)
  const totalBuildingsGrossArea = Object.values(blockTotalGrossAreas).reduce(
    (sum, area) => sum + area,
    0
  );

  // Note: Typology caps (Studio: max 15%, 1BR: max 40%, etc.) are usually enforced
  // relative to the total number of units or total residential gross area.
  // This needs the full context of the project to validate correctly (e.g., if you
  // import a small batch, it might individually comply, but not with the whole project).
  // For now, we'll just check if the types are valid. Full compliance check during lottery run.

  // 3. Minimum public share of 30% gross area (this is usually a compliance check for the *entire* project,
  // not per developer submission. It will be checked by the Compliance Module before lottery execution).
  // 4. Typological caps respected (this is also an overall project compliance, not per submission).

  // --- End Validation ---

  // If there were any errors during row processing, return early with errors
  if (errors.length > 0) {
    return { importedCount: 0, errors: errors };
  }

  // --- Save to Database ---
  let successfullyImported = 0;
  const transactionErrors = []; // Track errors during DB transaction

  try {
    // Start a database transaction for atomicity
    await db.sequelize.transaction(async (t) => {
      for (const unitData of importedUnits) {
        // Map Excel headers to your database model's field names
        const unitToCreate = {
          uniqueId: unitData["Unique ID"],
          typology: unitData["Typology"],
          netArea: unitData["Net Area"],
          grossArea: unitData["Gross Area"],
          floorNumber: unitData["Floor Number"],
          blockBuildingName: unitData["Block/Building Name"],
          totalBuildingGrossArea: unitData["Total Gross Area of Building"],
          phoneNumber: unitData["Phone Number"],
          // Add other fields as per your Unit model schema
          // For now, these are the ones from the Excel.
          // Add default status, developerId etc., here
          status: "submitted", // Default status for newly imported units
          // developerId: A developer ID should be associated, either fixed or passed from FE
        };

        // Create the unit in the database
        await Unit.create(unitToCreate, { transaction: t });
        successfullyImported++;
      }
    });
  } catch (dbError) {
    console.error("Database transaction failed during import:", dbError);
    transactionErrors.push(`Database error during import: ${dbError.message}`);
  }

  return {
    importedCount: successfullyImported,
    errors: errors.concat(transactionErrors), // Combine validation and transaction errors
    details: {
      totalRowsProcessed: rows.length,
      // Add other aggregate data for reporting if needed
    },
  };
}

module.exports = {
  importUnitsFromExcel,
};
