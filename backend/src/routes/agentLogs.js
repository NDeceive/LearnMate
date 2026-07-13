const express = require("express");
const { listAgentLogItems } = require("../controllers/agentLogController");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, requireRole("STUDENT"), listAgentLogItems);

module.exports = router;
