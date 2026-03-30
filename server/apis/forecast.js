const express = require("express");
const router = express.Router();
const controller = require("../controllers/forecastController");

router.get("/next-month", controller.getBatchForecast);

module.exports = router;