// backend/src/routes/reportRoutes.js
const express = require("express");
const router = express.Router();
const reportingService = require("../services/reportingService");
const path = require("path");
const fs = require("fs");

router.get("/excel", async (req, res) => {
  try {
    const { generateExcel } = await reportingService.generateAllocationReport();
    const excelBuffer = await generateExcel();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="allocation_report.xlsx"'
    );
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error generating Excel report:", error);
    res
      .status(500)
      .json({ message: "Error generating Excel report", error: error.message });
  }
});

router.get("/pdf", async (req, res) => {
  try {
    const { generatePdf } = await reportingService.generateAllocationReport();
    const filePath = await generatePdf(); // This creates a file on the server
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(filePath)}"`
    );
    res.sendFile(filePath, (err) => {
      if (err) console.error("Error sending PDF file:", err);
      // Clean up the created file after sending
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("Error deleting PDF file:", unlinkErr);
      });
    });
  } catch (error) {
    console.error("Error generating PDF report:", error);
    res
      .status(500)
      .json({ message: "Error generating PDF report", error: error.message });
  }
});

module.exports = router;
