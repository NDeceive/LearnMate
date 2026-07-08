const express = require("express");
const { listAgentLogItems } = require("../controllers/agentLogController");

const router = express.Router();

router.get("/", listAgentLogItems);

module.exports = router;
