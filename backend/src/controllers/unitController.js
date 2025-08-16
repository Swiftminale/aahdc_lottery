// backend/src/controllers/unitController.js
const db = require("../database");
const { Op } = require("sequelize");
const Unit = db.Unit;

exports.submitUnits = async (req, res) => {
  try {
    const units = req.body; // Array of unit objects
    if (!Array.isArray(units) || units.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or empty unit submission." });
    }

    // Basic Validations (more complex ones in compliance module)
    const unitIds = new Set();
    const buildingGrossAreas = {}; // To group units by building for total gross area validation

    for (const unit of units) {
      if (
        !unit.unitId ||
        !unit.typology ||
        unit.netArea == null ||
        unit.grossArea == null ||
        unit.floorNumber == null ||
        !unit.blockName ||
        unit.totalBuildingGrossArea == null
      ) {
        return res
          .status(400)
          .json({
            message: `Missing required fields for unit: ${JSON.stringify(
              unit
            )}`,
          });
      }
      if (unitIds.has(unit.unitId)) {
        return res
          .status(400)
          .json({ message: `Duplicate Unit ID found: ${unit.unitId}` });
      }
      unitIds.add(unit.unitId);

      if (!buildingGrossAreas[unit.blockName]) {
        buildingGrossAreas[unit.blockName] = {
          declaredTotal: unit.totalBuildingGrossArea,
          calculatedTotal: 0,
        };
      }
      buildingGrossAreas[unit.blockName].calculatedTotal += parseFloat(
        unit.grossArea
      ); // Ensure number conversion
    }

    // Validate total gross area per building
    for (const blockName in buildingGrossAreas) {
      const { declaredTotal, calculatedTotal } = buildingGrossAreas[blockName];
      // Allow for minor floating point discrepancies
      if (Math.abs(declaredTotal - calculatedTotal) > 0.01) {
        return res
          .status(400)
          .json({
            message: `Gross area mismatch for block ${blockName}: Declared total ${declaredTotal}, Calculated sum of units ${calculatedTotal}.`,
          });
      }
    }

    // Check existing units to ensure no duplicate IDs are stored
    const existingUnits = await Unit.findAll({
      where: {
        unitId: {
          [Op.in]: Array.from(unitIds),
        },
      },
    });

    if (existingUnits.length > 0) {
      const existingIds = existingUnits.map((u) => u.unitId);
      return res
        .status(409)
        .json({
          message: `One or more units already exist in the database: ${existingIds.join(
            ", "
          )}`,
        });
    }

    const createdUnits = await Unit.bulkCreate(units);
    res
      .status(201)
      .json({ message: "Units submitted successfully", units: createdUnits });
  } catch (error) {
    console.error("Error submitting units:", error);
    res
      .status(500)
      .json({
        message: "Server error during unit submission",
        error: error.message,
      });
  }
};

exports.getUnits = async (req, res) => {
  try {
    const units = await Unit.findAll();
    res.status(200).json(units);
  } catch (error) {
    console.error("Error fetching units:", error);
    res
      .status(500)
      .json({ message: "Server error fetching units", error: error.message });
  }
};
