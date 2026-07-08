const express = require("express");
const { generateResource } = require("../controllers/resourceController");

const router = express.Router();

router.post("/generate-resource", generateResource);

module.exports = router;
