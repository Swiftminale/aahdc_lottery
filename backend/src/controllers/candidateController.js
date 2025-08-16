// backend/src/controllers/candidateController.js
const db = require("../database");
const Candidate = db.Candidate;

// If you want to move Excel import logic here in the future, import candidateService and add a controller method.

exports.addCandidate = async (req, res) => {
  try {
    const { name, email, phoneNumber, typology } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }
    const candidate = await Candidate.create({
      name,
      email,
      phone: phoneNumber,
      typology,
    });
    res
      .status(201)
      .json({ message: "Candidate added successfully.", candidate });
  } catch (error) {
    console.error("Error adding candidate:", error);
    res
      .status(500)
      .json({ message: "Server error adding candidate", error: error.message });
  }
};

exports.getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.findAll();
    res.status(200).json(candidates);
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({
      message: "Server error fetching candidates",
      error: error.message,
    });
  }
};

// exports.importCandidatesFromExcel = ... (see candidateService for implementation)
