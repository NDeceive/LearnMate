const { runChat } = require("../services/agentOrchestrator");
const { generateAgentTaskDescriptions } = require("../services/agentTaskDescriptionService");

async function handleChat(req, res, next) {
  try {
    const { message, history = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const parts = await runChat({ message, history });
    return res.json({ parts });
  } catch (error) {
    return next(error);
  }
}

async function handleAgentTaskDescriptions(req, res) {
  const { question } = req.body || {};

  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }

  const descriptions = await generateAgentTaskDescriptions(question);
  return res.json(descriptions);
}

module.exports = {
  handleChat,
  handleAgentTaskDescriptions
};
