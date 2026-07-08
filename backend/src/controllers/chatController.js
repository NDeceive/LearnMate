const { runChat } = require("../services/agentOrchestrator");

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

module.exports = {
  handleChat
};
