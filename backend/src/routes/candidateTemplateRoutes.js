// backend/src/routes/candidateTemplateRoutes.js
const express = require("express");
const router = express.Router();
const candidateService = require("../services/candidateService");

const upload = require("./uploadMiddleware");

// Download candidate Excel template
router.get("/template", async (req, res) => {
  try {
    const buffer = await candidateService.downloadCandidateTemplate();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="candidate_template.xlsx"'
    );
    res.send(buffer);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error generating template", error: error.message });
  }
});

// Import candidates from Excel/CSV
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const result = await candidateService.importCandidatesFromExcel(
      req.file.buffer
    );
    res.status(200).json({ message: "Import completed.", ...result });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error importing candidates", error: error.message });
  }
});

module.exports = router;
