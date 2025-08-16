// backend/src/services/complianceService.js
const db = require("../database");
const Unit = db.Unit;

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

exports.checkPreAllocationCompliance = async (units) => {
  const complianceIssues = [];

  // This check is more about the *outcome* of the lottery, not an input validation
  // However, we can check if the total gross area of *all* units is sufficient for 30%.
  const totalGrossArea = units.reduce((sum, unit) => sum + unit.grossArea, 0);
  if (totalGrossArea === 0) {
    complianceIssues.push("No units submitted for allocation.");
  }

  // Typological caps respected (pre-check, the lottery engine will also enforce this)
  // This is a check on the *overall* submitted units, not just AAHDC's share.
  const residentialUnits = units.filter((u) => u.typology !== "Shop");
  const totalResidentialArea = residentialUnits.reduce(
    (sum, u) => sum + u.grossArea,
    0
  );

  const typologyArea = {
    Studio: residentialUnits
      .filter((u) => u.typology === "Studio")
      .reduce((sum, u) => sum + u.grossArea, 0),
    "1BR": residentialUnits
      .filter((u) => u.typology === "1BR")
      .reduce((sum, u) => sum + u.grossArea, 0),
    "2BR": residentialUnits
      .filter((u) => u.typology === "2BR")
      .reduce((sum, u) => sum + u.grossArea, 0),
    "3BR": residentialUnits
      .filter((u) => u.typology === "3BR")
      .reduce((sum, u) => sum + u.grossArea, 0),
  };

  if (totalResidentialArea > 0) {
    if ((typologyArea.Studio / totalResidentialArea) * 100 > 15.1) {
      // Allow slight tolerance
      complianceIssues.push(
        "Overall Studio typology exceeds 15% of residential gross area."
      );
    }
    if ((typologyArea["1BR"] / totalResidentialArea) * 100 > 40.1) {
      complianceIssues.push(
        "Overall 1BR typology exceeds 40% of residential gross area."
      );
    }
    if ((typologyArea["2BR"] / totalResidentialArea) * 100 > 25.1) {
      complianceIssues.push(
        "Overall 2BR typology exceeds 25% of residential gross area."
      );
    }
    if ((typologyArea["3BR"] / totalResidentialArea) * 100 > 20.1) {
      complianceIssues.push(
        "Overall 3BR typology exceeds 20% of residential gross area."
      );
    }
  }

  // Shops: 30% of commercial area to AAHDC (This is checked *after* allocation)
  // We can validate if there are any shops submitted, that there is at least a theoretical 30% to allocate.
  const commercialUnits = units.filter((u) => u.typology === "Shop");
  const totalCommercialArea = commercialUnits.reduce(
    (sum, u) => sum + u.grossArea,
    0
  );
  if (commercialUnits.length > 0 && totalCommercialArea * 0.3 === 0) {
    complianceIssues.push(
      "Commercial units submitted but impossible to meet 30% AAHDC share for shops (area too small)."
    );
  }

  // Clauses 5.6, 7.9, Schedule 7 - these are largely external checks that the platform enforces *before* running lottery,
  // but don't depend on the submitted *unit data* itself for validation, but rather on system status/approvals.
  // For example, "30% physical construction complete" would be a flag set in an admin panel, not derived from unit data.
  // "Distribution agreement signed" would also be an external flag.

  // Placeholder for external compliance flags (in a real app, these would come from a DB or config)
  const isConstructionComplete = true; // Assume true for demo
  const isDistributionAgreementSigned = true; // Assume true for demo

  if (!isConstructionComplete) {
    complianceIssues.push(
      "Clause 7.9 violation: 30% physical construction is not yet complete."
    );
  }
  if (!isDistributionAgreementSigned) {
    complianceIssues.push(
      "Schedule 7 violation: Distribution agreement has not been signed."
    );
  }

  return {
    isCompliant: complianceIssues.length === 0,
    issues: complianceIssues,
  };
};

exports.checkPostAllocationCompliance = async (aahdcUnits, developerUnits) => {
  const complianceIssues = [];

  const allUnits = [...aahdcUnits, ...developerUnits];
  const totalGrossArea = allUnits.reduce(
    (sum, unit) => sum + unit.grossArea,
    0
  );
  const aahdcGrossArea = aahdcUnits.reduce(
    (sum, unit) => sum + unit.grossArea,
    0
  );

  // Clause 5.6: 30% gross area must be transferred
  if (totalGrossArea > 0 && (aahdcGrossArea / totalGrossArea) * 100 < 29.9) {
    // Using 29.9 to allow for floating point inaccuracies
    complianceIssues.push(
      `Clause 5.6 violation: AAHDC's allocated gross area is less than 30%. Current: ${(
        (aahdcGrossArea / totalGrossArea) *
        100
      ).toFixed(2)}%`
    );
  }

  // Typological caps respected for AAHDC's allocation
  const aahdcResidentialUnits = aahdcUnits.filter((u) => u.typology !== "Shop");
  const aahdcTotalResidentialArea = aahdcResidentialUnits.reduce(
    (sum, u) => sum + u.grossArea,
    0
  );

  const aahdcTypologyArea = {
    Studio: aahdcResidentialUnits
      .filter((u) => u.typology === "Studio")
      .reduce((sum, u) => sum + u.grossArea, 0),
    "1BR": aahdcResidentialUnits
      .filter((u) => u.typology === "1BR")
      .reduce((sum, u) => sum + u.grossArea, 0),
    "2BR": aahdcResidentialUnits
      .filter((u) => u.typology === "2BR")
      .reduce((sum, u) => sum + u.grossArea, 0),
    "3BR": aahdcResidentialUnits
      .filter((u) => u.typology === "3BR")
      .reduce((sum, u) => sum + u.grossArea, 0),
  };

  if (aahdcTotalResidentialArea > 0) {
    if ((aahdcTypologyArea.Studio / aahdcTotalResidentialArea) * 100 > 15.1) {
      complianceIssues.push(
        `AAHDC Studio typology allocation exceeds 15% of residential gross area: ${(
          (aahdcTypologyArea.Studio / aahdcTotalResidentialArea) *
          100
        ).toFixed(2)}%`
      );
    }
    if ((aahdcTypologyArea["1BR"] / aahdcTotalResidentialArea) * 100 > 40.1) {
      complianceIssues.push(
        `AAHDC 1BR typology allocation exceeds 40% of residential gross area: ${(
          (aahdcTypologyArea["1BR"] / aahdcTotalResidentialArea) *
          100
        ).toFixed(2)}%`
      );
    }
    if ((aahdcTypologyArea["2BR"] / aahdcTotalResidentialArea) * 100 > 25.1) {
      complianceIssues.push(
        `AAHDC 2BR typology allocation exceeds 25% of residential gross area: ${(
          (aahdcTypologyArea["2BR"] / aahdcTotalResidentialArea) *
          100
        ).toFixed(2)}%`
      );
    }
    if ((aahdcTypologyArea["3BR"] / aahdcTotalResidentialArea) * 100 > 20.1) {
      complianceIssues.push(
        `AAHDC 3BR typology allocation exceeds 20% of residential gross area: ${(
          (aahdcTypologyArea["3BR"] / aahdcTotalResidentialArea) *
          100
        ).toFixed(2)}%`
      );
    }
  }

  // Shops: 30% of commercial area to AAHDC
  const aahdcCommercialUnits = aahdcUnits.filter((u) => u.typology === "Shop");
  const totalCommercialUnits = allUnits.filter((u) => u.typology === "Shop");
  const aahdcCommercialArea = aahdcCommercialUnits.reduce(
    (sum, u) => sum + u.grossArea,
    0
  );
  const totalProjectCommercialArea = totalCommercialUnits.reduce(
    (sum, u) => sum + u.grossArea,
    0
  );

  if (
    totalProjectCommercialArea > 0 &&
    (aahdcCommercialArea / totalProjectCommercialArea) * 100 < 29.9
  ) {
    complianceIssues.push(
      `AAHDC Shop allocation is less than 30% of total commercial area. Current: ${(
        (aahdcCommercialArea / totalProjectCommercialArea) *
        100
      ).toFixed(2)}%`
    );
  }

  return {
    isCompliant: complianceIssues.length === 0,
    issues: complianceIssues,
  };
};
