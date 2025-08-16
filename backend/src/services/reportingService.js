// backend/src/services/reportingService.js
const db = require("../database");
const AllocatedUnit = db.AllocatedUnit;
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

exports.generateAllocationReport = async () => {
  let units = await AllocatedUnit.findAll({ raw: true }); // Only allocated units

  // Enrich with candidate info if missing (older allocations or other methods)
  try {
    const needs = units.filter((u) => !u.candidatePhone || !u.candidateName);
    if (needs.length > 0) {
      const { Op } = require("sequelize");
      const unitIds = [...new Set(needs.map((u) => u.unitId))];
      const Candidate = db.Candidate;
      const candidates = await Candidate.findAll({
        where: { assignedUnitId: { [Op.in]: unitIds } },
        raw: true,
      });
      const byUnit = new Map();
      candidates.forEach((c) => byUnit.set(c.assignedUnitId, c));
      units = units.map((u) => {
        const c = byUnit.get(u.unitId);
        if (c) {
          return {
            ...u,
            candidateId: u.candidateId || c.candidateId,
            candidateName: u.candidateName || c.name,
            candidatePhone: u.candidatePhone || c.phone || null,
            owner: u.owner === "AAHDC" && c.name ? c.name : u.owner,
          };
        }
        return u;
      });
    }
  } catch (_) {
    // Best-effort enrichment; proceed without if it fails
  }

  const aahdcUnits = units.filter((unit) => unit.owner === "AAHDC");
  const developerUnits = units.filter((unit) => unit.owner === "Developer");

  const totalGrossArea = units.reduce((sum, unit) => sum + unit.grossArea, 0);
  const aahdcGrossArea = aahdcUnits.reduce(
    (sum, unit) => sum + unit.grossArea,
    0
  );
  const developerGrossArea = developerUnits.reduce(
    (sum, unit) => sum + unit.grossArea,
    0
  );

  const aahdcResidentialUnits = aahdcUnits.filter((u) => u.typology !== "Shop");
  const aahdcTotalResidentialArea = aahdcResidentialUnits.reduce(
    (sum, u) => sum + u.grossArea,
    0
  );

  const aahdcTypologyCounts = aahdcResidentialUnits.reduce((acc, unit) => {
    acc[unit.typology] = (acc[unit.typology] || 0) + 1;
    return acc;
  }, {});

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

  // Helper for Excel
  const generateExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Allocation Summary");

    // Headers
    worksheet.columns = [
      { header: "Unit ID", key: "unitId", width: 15 },
      { header: "Typology", key: "typology", width: 10 },
      { header: "Net Area", key: "netArea", width: 10 },
      { header: "Gross Area", key: "grossArea", width: 12 },
      { header: "Floor No.", key: "floorNumber", width: 10 },
      { header: "Block Name", key: "blockName", width: 15 },
      { header: "Owner", key: "owner", width: 10 },
      { header: "Candidate Phone", key: "candidatePhone", width: 18 },
    ];

    // Add data
    worksheet.addRows(units);

    // Add summaries
    worksheet.addRow([]);
    worksheet.addRow([
      "Total Gross Area (All Units):",
      "",
      "",
      totalGrossArea.toFixed(2),
    ]);
    worksheet.addRow(["AAHDC Gross Area:", "", "", aahdcGrossArea.toFixed(2)]);
    worksheet.addRow([
      "Developer Gross Area:",
      "",
      "",
      developerGrossArea.toFixed(2),
    ]);
    worksheet.addRow([]);
    worksheet.addRow(["AAHDC Typology Mix (Gross Area % of residential):"]);
    if (aahdcTotalResidentialArea > 0) {
      worksheet.addRow([
        "Studio:",
        "",
        "",
        ((aahdcTypologyArea.Studio / aahdcTotalResidentialArea) * 100).toFixed(
          2
        ) + "%",
      ]);
      worksheet.addRow([
        "1BR:",
        "",
        "",
        ((aahdcTypologyArea["1BR"] / aahdcTotalResidentialArea) * 100).toFixed(
          2
        ) + "%",
      ]);
      worksheet.addRow([
        "2BR:",
        "",
        "",
        ((aahdcTypologyArea["2BR"] / aahdcTotalResidentialArea) * 100).toFixed(
          2
        ) + "%",
      ]);
      worksheet.addRow([
        "3BR:",
        "",
        "",
        ((aahdcTypologyArea["3BR"] / aahdcTotalResidentialArea) * 100).toFixed(
          2
        ) + "%",
      ]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  };

  // Helper for PDF
  const generatePdf = async () => {
    const doc = new PDFDocument();
    const outputFileName = `allocation_report_${Date.now()}.pdf`; // Unique file name
    const outputPath = path.join(
      __dirname,
      "../../temp_reports",
      outputFileName
    ); // Save to a temp folder

    // Ensure temp_reports directory exists
    if (!fs.existsSync(path.join(__dirname, "../../temp_reports"))) {
      fs.mkdirSync(path.join(__dirname, "../../temp_reports"));
    }

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.fontSize(16).text("AAHDC Unit Allocation Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text("Allocation Summary:", { underline: true });
    doc.text(`Total Project Gross Area: ${totalGrossArea.toFixed(2)} sqm`);
    doc.text(
      `AAHDC Allocated Gross Area: ${aahdcGrossArea.toFixed(2)} sqm (${(
        (aahdcGrossArea / totalGrossArea) *
        100
      ).toFixed(2)}%)`
    );
    doc.text(
      `Developer Allocated Gross Area: ${developerGrossArea.toFixed(2)} sqm (${(
        (developerGrossArea / totalGrossArea) *
        100
      ).toFixed(2)}%)`
    );
    doc.moveDown();

    doc.text("AAHDC Typology Mix (Residential Gross Area %):");
    if (aahdcTotalResidentialArea > 0) {
      doc.text(
        `  Studio: ${
          aahdcTypologyCounts.Studio || 0
        } units - ${aahdcTypologyArea.Studio.toFixed(2)} sqm (${(
          (aahdcTypologyArea.Studio / aahdcTotalResidentialArea) *
          100
        ).toFixed(2)}%)`
      );
      doc.text(
        `  1BR: ${aahdcTypologyCounts["1BR"] || 0} units - ${aahdcTypologyArea[
          "1BR"
        ].toFixed(2)} sqm (${(
          (aahdcTypologyArea["1BR"] / aahdcTotalResidentialArea) *
          100
        ).toFixed(2)}%)`
      );
      doc.text(
        `  2BR: ${aahdcTypologyCounts["2BR"] || 0} units - ${aahdcTypologyArea[
          "2BR"
        ].toFixed(2)} sqm (${(
          (aahdcTypologyArea["2BR"] / aahdcTotalResidentialArea) *
          100
        ).toFixed(2)}%)`
      );
      doc.text(
        `  3BR: ${aahdcTypologyCounts["3BR"] || 0} units - ${aahdcTypologyArea[
          "3BR"
        ].toFixed(2)} sqm (${(
          (aahdcTypologyArea["3BR"] / aahdcTotalResidentialArea) *
          100
        ).toFixed(2)}%)`
      );
    }
    doc.moveDown();

    doc.text("Detailed Unit Allocation:");
    doc.moveDown();

    // Table for units (simplified)
    const tableHeaders = [
      "Unit ID",
      "Typology",
      "Gross Area",
      "Floor",
      "Block",
      "Owner",
      "Candidate Phone",
    ];
    const tableRows = units.map((u) => [
      u.unitId,
      u.typology,
      (Number(u.grossArea) || 0).toFixed(2),
      u.floorNumber,
      u.blockName,
      u.owner || "Unallocated",
      u.candidatePhone || "-",
    ]);

    // Simple table layout (can be improved with more advanced PDF libraries or manual positioning)
    let y = doc.y;
    doc.font("Helvetica-Bold").fontSize(10);
    tableHeaders.forEach((header, i) => {
      doc.text(header, 50 + i * 90, y);
    });
    doc.font("Helvetica").fontSize(10);
    y += 20;

    tableRows.forEach((row) => {
      row.forEach((cell, i) => {
        doc.text(String(cell), 50 + i * 90, y);
      });
      y += 15;
      if (y > doc.page.height - 50) {
        // New page if content too long
        doc.addPage();
        y = 50;
        doc.font("Helvetica-Bold").fontSize(10);
        tableHeaders.forEach((header, i) => {
          doc.text(header, 50 + i * 90, y);
        });
        doc.font("Helvetica").fontSize(10);
        y += 20;
      }
    });

    doc.end();
    return new Promise((resolve, reject) => {
      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    });
  };

  return { generateExcel, generatePdf };
};
