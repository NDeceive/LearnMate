const { runResourceGeneration } = require("../services/agentOrchestrator");

async function generateResource(req, res, next) {
  try {
    const { subject, topic, resourceType, difficulty } = req.body || {};

    if (!subject || !topic || !resourceType) {
      return res.status(400).json({ error: "subject, topic and resourceType are required" });
    }

    const content = await runResourceGeneration({
      subject,
      topic,
      resourceType,
      difficulty
    });

    return res.json({ content });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  generateResource
};
