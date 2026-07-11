const express = require("express");
const { generateResource } = require("../controllers/resourceController");

const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/generate-resource", generateResource);

module.exports = router;
