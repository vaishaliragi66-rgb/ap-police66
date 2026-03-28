const express = require("express");
const router = express.Router();
const controller = require("../controllers/predictController");

router.post("/predict", controller.predictDisease);

module.exports = router;