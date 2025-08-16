const { Router } = require("express");
const router = Router();

const {
  runAllocation,
  getAllocatedUnits,
  getUnallocatedUnits,
} = require("../controllers/allocationController");

router.post("/run", runAllocation);
router.get("/allocated", getAllocatedUnits);
router.get("/unallocated", getUnallocatedUnits);

module.exports = router;