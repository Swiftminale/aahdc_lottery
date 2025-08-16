// backend/src/routes/candidateRoutes.js
const express = require("express");
const router = express.Router();
const candidateController = require("../controllers/candidateController");

const db = require("../database");
const Candidate = db.Candidate;

// POST /api/candidates (batch or single)
router.post("/", async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      // Batch create
      const created = await Candidate.bulkCreate(req.body, { validate: true });
      res.status(201).json(created);
    } else {
      // Single create
      const created = await Candidate.create(req.body);
      res.status(201).json(created);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
router.get("/", candidateController.getCandidates);

module.exports = router;
