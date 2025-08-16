// backend/src/services/lotteryService.js
const db = require("../database");
const Unit = db.Unit;
const { checkPostAllocationCompliance } = require("./complianceService"); // Import for internal checks
const Candidate = db.Candidate;

// Helper to check typology caps for AAHDC's allocation
const checkTypologyCaps = (currentUnits, unitToAdd, totalResidentialArea) => {
  const typologyLimits = {
    Studio: 0.15,
    "1BR": 0.4,
    "2BR": 0.25,
    "3BR": 0.2,
  };

  // Calculate current distribution for residential units already allocated to AAHDC
  const currentResidentialUnits = currentUnits.filter(
    (u) => u.typology !== "Shop"
  );
  const currentResidentialArea = currentResidentialUnits.reduce(
    (acc, unit) => acc + unit.grossArea,
    0
  );

  const typologyAreaCurrent = {
    Studio: currentResidentialUnits
      .filter((u) => u.typology === "Studio")
      .reduce((sum, u) => sum + u.grossArea, 0),
    "1BR": currentResidentialUnits
      .filter((u) => u.typology === "1BR")
      .reduce((sum, u) => sum + u.grossArea, 0),
    "2BR": currentResidentialUnits
      .filter((u) => u.typology === "2BR")
      .reduce((sum, u) => sum + u.grossArea, 0),
    "3BR": currentResidentialUnits
      .filter((u) => u.typology === "3BR")
      .reduce((sum, u) => sum + u.grossArea, 0),
  };

  // Calculate if adding the new unit would exceed the cap for AAHDC
  if (typologyLimits[unitToAdd.typology]) {
    const projectedAreaForTypology =
      typologyAreaCurrent[unitToAdd.typology] + unitToAdd.grossArea;
    const projectedTotalResidentialArea =
      currentResidentialArea + unitToAdd.grossArea;

    // Avoid division by zero if no residential units yet
    if (
      projectedTotalResidentialArea > 0 &&
      projectedAreaForTypology / projectedTotalResidentialArea >
        typologyLimits[unitToAdd.typology]
    ) {
      return false; // Exceeds typology cap
    }
  }
  return true;
};

// Full Lottery Algorithm
exports.fullLottery = async (units) => {
  const totalGrossArea = units.reduce((sum, unit) => sum + unit.grossArea, 0);
  const targetAahdcArea = totalGrossArea * 0.3;
  let allocatedAahdcArea = 0;
  let aahdcUnits = [];
  let devUnits = [];

  // Create a mutable copy and shuffle
  let shuffledUnits = [...units].sort(() => 0.5 - Math.random());

  for (const unit of shuffledUnits) {
    if (unit.typology === "Shop") {
      if (allocatedAahdcArea + unit.grossArea <= targetAahdcArea) {
        aahdcUnits.push({ ...unit, unitId: unit.unitId });
        allocatedAahdcArea += unit.grossArea;
      } else {
        devUnits.push({
          ...unit,
          unitId: unit.unitId,
          owner: "Developer",
          allocated: true,
        });
      }
    } else {
      if (
        allocatedAahdcArea + unit.grossArea <= targetAahdcArea &&
        checkTypologyCaps(aahdcUnits, unit, totalGrossArea)
      ) {
        aahdcUnits.push({ ...unit, unitId: unit.unitId });
        allocatedAahdcArea += unit.grossArea;
      } else {
        devUnits.push({
          ...unit,
          unitId: unit.unitId,
          owner: "Developer",
          allocated: true,
        });
      }
    }
  }

  // If AAHDC hasn't met its target, try to swap units from devUnits if possible and compliant
  // This is a simplified balancing act. A real system might use more complex optimization.
  let remainingTarget = targetAahdcArea - allocatedAahdcArea;
  if (remainingTarget > 0) {
    // Try to take smaller units from devUnits to meet the target without overshooting too much
    devUnits.sort((a, b) => a.grossArea - b.grossArea); // Sort by size

    for (let i = 0; i < devUnits.length; i++) {
      const unit = devUnits[i];
      if (
        remainingTarget - unit.grossArea >= -0.01 &&
        checkTypologyCaps(aahdcUnits, unit, totalGrossArea)
      ) {
        aahdcUnits.push({ ...unit, unitId: unit.unitId });
        allocatedAahdcArea += unit.grossArea;
        devUnits.splice(i, 1); // Remove from devUnits
        i--; // Adjust index due to removal
        remainingTarget = targetAahdcArea - allocatedAahdcArea;
        if (remainingTarget <= 0.01) break; // Target met
      }
    }
  }

  return { aahdcUnits, devUnits, allocatedAahdcArea };
};

// Hybrid Lottery Algorithm
exports.hybridLottery = async (units) => {
  const residentialUnits = units.filter((unit) => unit.typology !== "Shop");
  const commercialUnits = units.filter((unit) => unit.typology === "Shop");

  // Lottery for residential units (similar to full lottery, but only for houses)
  const totalResidentialGrossArea = residentialUnits.reduce(
    (sum, unit) => sum + unit.grossArea,
    0
  );
  const targetAahdcResidentialArea = totalResidentialGrossArea * 0.3; // 30% of residential goes to AAHDC
  let allocatedAahdcResidentialArea = 0;
  let aahdcResidentialUnits = [];
  let devResidentialUnits = [];

  let shuffledResidentialUnits = [...residentialUnits].sort(
    () => 0.5 - Math.random()
  );

  for (const unit of shuffledResidentialUnits) {
    if (
      allocatedAahdcResidentialArea + unit.grossArea <=
        targetAahdcResidentialArea &&
      checkTypologyCaps(aahdcResidentialUnits, unit, totalResidentialGrossArea)
    ) {
      aahdcResidentialUnits.push({ ...unit, unitId: unit.unitId });
      allocatedAahdcResidentialArea += unit.grossArea;
    } else {
      devResidentialUnits.push({
        ...unit,
        unitId: unit.unitId,
        owner: "Developer",
        allocated: true,
      });
    }
  }

  // Shops are "negotiated" - for this simulation, we'll assume a 30% split for AAHDC
  const totalCommercialGrossArea = commercialUnits.reduce(
    (sum, unit) => sum + unit.grossArea,
    0
  );
  const targetAahdcCommercialArea = totalCommercialGrossArea * 0.3;
  let allocatedAahdcCommercialArea = 0;
  let aahdcCommercialUnits = [];
  let devCommercialUnits = [];

  // Simple distribution for shops (e.g., take first 30% by area after sorting)
  commercialUnits.sort((a, b) => a.grossArea - b.grossArea); // Sort by size to try and hit target precisely

  for (const unit of commercialUnits) {
    if (
      allocatedAahdcCommercialArea + unit.grossArea <=
      targetAahdcCommercialArea
    ) {
      aahdcCommercialUnits.push({ ...unit, unitId: unit.unitId });
      allocatedAahdcCommercialArea += unit.grossArea;
    } else {
      devCommercialUnits.push({
        ...unit,
        unitId: unit.unitId,
        owner: "Developer",
        allocated: true,
      });
    }
  }

  return {
    aahdcUnits: [...aahdcResidentialUnits, ...aahdcCommercialUnits],
    devUnits: [...devResidentialUnits, ...devCommercialUnits],
    allocatedAahdcResidentialArea,
    allocatedAahdcCommercialArea,
  };
};

// Block-by-Block Assignment (simplified)
exports.blockByBlockAssignment = async (units) => {
  // This method would require explicit input from AAHDC on which blocks/floors they want.
  // For demonstration, let's say AAHDC gets blocks based on their gross area until 30% is met.
  // Blocks are sorted by name for consistent, but arbitrary, selection.
  const blocks = {};
  units.forEach((unit) => {
    if (!blocks[unit.blockName]) {
      blocks[unit.blockName] = [];
    }
    blocks[unit.blockName].push(unit);
  });

  const blockNames = Object.keys(blocks).sort(); // Sort block names alphabetically for deterministic demo
  let aahdcUnits = [];
  let devUnits = [];
  let allocatedAahdcArea = 0;
  const totalGrossArea = units.reduce((sum, unit) => sum + unit.grossArea, 0);
  const targetAahdcArea = totalGrossArea * 0.3;

  for (const blockName of blockNames) {
    const blockUnits = blocks[blockName];
    const blockGrossArea = blockUnits.reduce(
      (sum, unit) => sum + unit.grossArea,
      0
    );

    // If adding this entire block doesn't overshoot AAHDC's target too much, assign to AAHDC
    // This is a greedy approach. In a real system, AAHDC would select blocks.
    if (allocatedAahdcArea + blockGrossArea <= targetAahdcArea * 1.05) {
      // Allow 5% overshoot for full blocks
      // Check if adding this block's residential units would violate typology caps for AAHDC
      let canAllocateBlock = true;
      for (const unit of blockUnits.filter((u) => u.typology !== "Shop")) {
        if (!checkTypologyCaps(aahdcUnits, unit, totalGrossArea)) {
          canAllocateBlock = false;
          break;
        }
      }

      if (canAllocateBlock) {
        aahdcUnits.push(
          ...blockUnits.map((unit) => ({
            ...unit,
            unitId: unit.unitId,
            owner: "AAHDC",
            allocated: true,
          }))
        );
        allocatedAahdcArea += blockGrossArea;
      } else {
        devUnits.push(
          ...blockUnits.map((unit) => ({
            ...unit,
            unitId: unit.unitId,
            owner: "Developer",
            allocated: true,
          }))
        );
      }
    } else {
      devUnits.push(
        ...blockUnits.map((unit) => ({
          ...unit,
          unitId: unit.unitId,
          owner: "Developer",
          allocated: true,
        }))
      );
    }
  }
  // Re-distribute any units if AAHDC is significantly under target and dev has many small units
  // This logic can be complex and depends on strictness of 30% rule vs. block integrity.
  return { aahdcUnits, devUnits, allocatedAahdcArea };
};

// Lottery Based on Floor Number (simplified)
exports.floorBasedLottery = async (units) => {
  // This would typically involve AAHDC specifying which floors they prefer (e.g., lower, middle, higher)
  // For demonstration, let's assume AAHDC gets units from a mix of floors, prioritizing lower floors.
  const unitsByFloor = {};
  units.forEach((unit) => {
    if (!unitsByFloor[unit.floorNumber]) {
      unitsByFloor[unit.floorNumber] = [];
    }
    unitsByFloor[unit.floorNumber].push(unit);
  });

  const sortedFloorNumbers = Object.keys(unitsByFloor)
    .map(Number)
    .sort((a, b) => a - b); // Prioritize lower floors

  let aahdcUnits = [];
  let devUnits = [];
  let allocatedAahdcArea = 0;
  const totalGrossArea = units.reduce((sum, unit) => sum + unit.grossArea, 0);
  const targetAahdcArea = totalGrossArea * 0.3;

  for (const floorNum of sortedFloorNumbers) {
    const floorUnits = unitsByFloor[floorNum];
    // Randomize units within the floor
    let shuffledFloorUnits = [...floorUnits].sort(() => 0.5 - Math.random());

    for (const unit of shuffledFloorUnits) {
      if (
        allocatedAahdcArea + unit.grossArea <= targetAahdcArea &&
        checkTypologyCaps(aahdcUnits, unit, totalGrossArea)
      ) {
        aahdcUnits.push({ ...unit, unitId: unit.unitId });
        allocatedAahdcArea += unit.grossArea;
      } else {
        devUnits.push({
          ...unit,
          unitId: unit.unitId,
          owner: "Developer",
          allocated: true,
        });
      }
    }
  }
  // Similar to block-by-block, this needs more precise rules from AAHDC
  return { aahdcUnits, devUnits, allocatedAahdcArea };
};

// Candidate Assignment by Typology: randomly match available units to candidates of the same typology
exports.assignCandidatesToUnitsByTypology = async () => {
  // Fetch unallocated units and unassigned candidates grouped by typology
  const units = await Unit.findAll({ where: { allocated: false } });
  const candidates = await Candidate.findAll({
    where: { assignedUnitId: null },
  });

  // Normalize candidate typology to match Unit typology keys
  const normalize = (t) => {
    if (!t) return "";
    const upper = String(t).toUpperCase();
    if (["1BR", "2BR", "3BR"].includes(upper)) return upper;
    const lower = String(t).toLowerCase();
    if (lower === "studio") return "Studio";
    if (lower === "shop") return "Shop";
    return t;
  };

  const unitsByTyp = units.reduce((acc, u) => {
    const key = u.typology;
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
    return acc;
  }, {});
  const candidatesByTyp = candidates.reduce((acc, c) => {
    const key = normalize(c.typology);
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const assignments = [];
  for (const typ of Object.keys(candidatesByTyp)) {
    const poolUnits = [...(unitsByTyp[typ] || [])];
    const poolCandidates = [...candidatesByTyp[typ]];
    // Shuffle for randomness
    poolUnits.sort(() => 0.5 - Math.random());
    poolCandidates.sort(() => 0.5 - Math.random());
    const count = Math.min(poolUnits.length, poolCandidates.length);
    for (let i = 0; i < count; i++) {
      assignments.push({ unit: poolUnits[i], candidate: poolCandidates[i] });
    }
  }

  // Apply assignments in transaction
  const transaction = await db.sequelize.transaction();
  try {
    for (const { unit, candidate } of assignments) {
      await unit.update(
        { owner: candidate.name, allocated: true },
        { transaction }
      );
      await Candidate.update(
        { assignedUnitId: unit.unitId },
        { where: { candidateId: candidate.candidateId }, transaction }
      );
    }
    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }

  return {
    assignedCount: assignments.length,
    details: assignments.map(({ unit, candidate }) => ({
      unitId: unit.unitId,
      typology: unit.typology,
      candidateId: candidate.candidateId,
      candidateName: candidate.name,
      candidatePhone: candidate.phone || null,
    })),
  };
};
