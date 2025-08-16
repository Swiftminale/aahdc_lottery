// backend/src/controllers/allocationController.js
const db = require("../database");
const { Op } = require("sequelize");
const Unit = db.Unit;
const AllocatedUnit = db.AllocatedUnit;
const lotteryService = require("../services/lotteryService");
const complianceService = require("../services/complianceService");

exports.runAllocation = async (req, res) => {
  try {
    const { distributionMethod } = req.body;

    if (!distributionMethod) {
      return res
        .status(400)
        .json({ message: "Distribution method is required." });
    }

    const unitsToAllocate = await Unit.findAll({ where: { allocated: false } });

    if (unitsToAllocate.length === 0) {
      return res
        .status(400)
        .json({ message: "No unallocated units available for distribution." });
    }

    // Pre-allocation compliance checks
    const preCompliance = await complianceService.checkPreAllocationCompliance(
      unitsToAllocate
    );
    if (!preCompliance.isCompliant) {
      return res.status(403).json({
        message: "Pre-allocation compliance failed.",
        issues: preCompliance.issues,
      });
    }

    let allocationResult;

    switch (distributionMethod) {
      case "Full Lottery":
        allocationResult = await lotteryService.fullLottery(unitsToAllocate);
        break;
      case "Hybrid Lottery":
        allocationResult = await lotteryService.hybridLottery(unitsToAllocate);
        break;
      case "Block-by-Block Assignment":
        allocationResult = await lotteryService.blockByBlockAssignment(
          unitsToAllocate
        );
        break;
      case "Lottery Based on Floor Number":
        allocationResult = await lotteryService.floorBasedLottery(
          unitsToAllocate
        );
        break;
      case "Assign Candidates by Typology":
        // Assign candidates to units, return details and also mirror into AllocatedUnit table
        const assignRes =
          await lotteryService.assignCandidatesToUnitsByTypology();
        // Build aahdcUnits-like structure from assigned units for downstream updates
        const assignedUnitIds = assignRes.details.map((d) => d.unitId);
        const assignedUnits = await Unit.findAll({
          where: { unitId: assignedUnitIds },
        });
        allocationResult = {
          aahdcUnits: assignedUnits,
          devUnits: [],
          assignedDetails: assignRes.details,
        };
        break;
      default:
        return res
          .status(400)
          .json({ message: "Invalid distribution method specified." });
    }

    const {
      aahdcUnits: aahdcAllocatedUnits = [],
      devUnits: devAllocatedUnits = [],
    } = allocationResult;

    console.log("AAHDC Allocated Units:", aahdcAllocatedUnits);

    // Post-allocation compliance checks
    const postCompliance =
      await complianceService.checkPostAllocationCompliance(
        aahdcAllocatedUnits,
        devAllocatedUnits
      );

    // Always update DB after allocation, regardless of compliance result
    const transaction = await db.sequelize.transaction();
    try {
      // Combine all allocated unit IDs and owners
      const allAllocatedUnits = [
        ...aahdcAllocatedUnits.map((u) => ({
          unitId: u.unitId,
          owner: u.owner || "AAHDC",
        })),
        ...devAllocatedUnits.map((u) => ({
          unitId: u.unitId,
          owner: u.owner || "AAHDC",
        })),
      ];

      // Fetch full unit details from Unit table
      const unitIds = allAllocatedUnits.map((u) => u.unitId);
      const fullUnits = await Unit.findAll({
        where: { unitId: unitIds },
        transaction,
      });
      // Map for quick lookup
      const unitMap = {};
      for (const u of fullUnits) {
        unitMap[u.unitId] = u;
      }

      // Insert into AllocatedUnit table and update Unit table
      for (const alloc of allAllocatedUnits) {
        const unit = unitMap[alloc.unitId];
        if (!unit) continue; // skip if not found
        // If this run was an Assign Candidates by Typology, include candidate info
        const candidateInfo = (allocationResult.assignedDetails || []).find(
          (d) => d.unitId === unit.unitId
        );
        await AllocatedUnit.upsert(
          {
            unitId: unit.unitId,
            candidateId: candidateInfo ? candidateInfo.candidateId : null,
            candidateName: candidateInfo ? candidateInfo.candidateName : null,
            candidatePhone: candidateInfo ? candidateInfo.candidatePhone : null,
            typology: unit.typology,
            netArea: unit.netArea,
            grossArea: unit.grossArea,
            floorNumber: unit.floorNumber,
            blockName: unit.blockName,
            totalBuildingGrossArea: unit.totalBuildingGrossArea,
            owner: alloc.owner,
            allocatedAt: new Date(),
          },
          { transaction }
        );
        // Update the unit in the units table
        await Unit.update(
          { owner: alloc.owner, allocated: true },
          { where: { unitId: unit.unitId }, transaction }
        );
      }

      await transaction.commit();
    } catch (updateError) {
      await transaction.rollback();
      console.error("Error updating units after allocation:", updateError);
      return res.status(500).json({
        message: "Error updating units after allocation",
        error: updateError.message,
      });
    }

    return res.status(200).json({
      message: `${distributionMethod} executed successfully.`,
      aahdcUnits: aahdcAllocatedUnits,
      developerUnits: devAllocatedUnits,
      complianceIssues: postCompliance.issues,
    });
  } catch (error) {
    console.error("Error during allocation:", error);
    return res.status(500).json({
      message: "Server error during allocation process",
      error: error.message,
    });
  }
};

exports.getAllocatedUnits = async (req, res) => {
  try {
    const allocatedUnits = await AllocatedUnit.findAll();
    // If candidate info is missing in snapshot, try to enrich from Candidate table
    const rows = allocatedUnits.map((r) =>
      typeof r.toJSON === "function" ? r.toJSON() : r
    );
    const needEnrichment = rows.filter(
      (r) => !r.candidatePhone || !r.candidateName
    );
    if (needEnrichment.length > 0) {
      const unitIds = [...new Set(needEnrichment.map((r) => r.unitId))];
      const candidates = await db.Candidate.findAll({
        where: { assignedUnitId: { [Op.in]: unitIds } },
      });
      const byUnit = new Map();
      candidates.forEach((c) => byUnit.set(c.assignedUnitId, c));
      rows.forEach((r) => {
        const c = byUnit.get(r.unitId);
        if (c) {
          r.candidateId = r.candidateId || c.candidateId;
          r.candidateName = r.candidateName || c.name;
          r.candidatePhone = r.candidatePhone || c.phone || null;
          // If owner is still generic, update to candidate name for display consistency
          if (r.owner === "AAHDC" && r.candidateName) {
            r.owner = r.candidateName;
          }
        }
      });
    }
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching allocated units:", error);
    res.status(500).json({
      message: "Server error fetching allocated units",
      error: error.message,
    });
  }
};

exports.getUnallocatedUnits = async (req, res) => {
  try {
    const unallocatedUnits = await Unit.findAll({
      where: { allocated: false, owner: "Developer" },
    });
    res.status(200).json(unallocatedUnits);
  } catch (error) {
    console.error("Error fetching unallocated units:", error);
    res.status(500).json({
      message: "Server error fetching unallocated units",
      error: error.message,
    });
  }
};
