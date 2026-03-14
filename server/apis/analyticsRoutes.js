const express = require("express");
const router = express.Router();

const analyticsController = require("../controllers/analyticsController");

router.get("/age-summary", analyticsController.ageSummary);
router.get("/age-details/:range", analyticsController.ageDetails);

router.get("/designation-summary", analyticsController.designationSummary);
router.get("/designation-details/:designation", analyticsController.designationDetails);
router.get("/risk-hotspots", analyticsController.riskHotspots);

module.exports = router;