// backend/src/routes/unitRoutes.js
const express = require("express");
const router = express.Router();
const unitController = require("../controllers/unitController");

router.post("/", unitController.submitUnits);
router.get("/", unitController.getUnits);

module.exports = router;
