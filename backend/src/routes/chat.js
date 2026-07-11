const express = require("express");
const { handleChat, handleAgentTaskDescriptions } = require("../controllers/chatController");

const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/chat", handleChat);
router.post("/agent-task-descriptions", handleAgentTaskDescriptions);

module.exports = router;
