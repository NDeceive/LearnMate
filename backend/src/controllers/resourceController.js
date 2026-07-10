const { runResourceGeneration } = require("../services/agentOrchestrator");
const { getCompleteProfile } = require("../services/studentProfileService");

async function generateResource(req, res, next) {
  try {
    const { subject, topic, resourceType, difficulty, recommendationReason, errorType } = req.body || {};

    if (!subject || !topic || !resourceType) {
      return res.status(400).json({ error: "subject, topic and resourceType are required" });
    }

    const current = await getCompleteProfile(req.user.studentId);
    const content = await runResourceGeneration({
      subject,
      topic,
      resourceType,
      difficulty,
      personalization: {
        weakKnowledgePoint: topic,
        errorType: String(errorType || "").slice(0, 80),
        recommendationReason: String(recommendationReason || "").slice(0, 300),
        explanationPreference: current.profile.explanationPreference,
        resourcePreferences: current.profile.resourcePreferences,
        paceAndTimeBudget: current.profile.paceAndTimeBudget
      }
    });

    return res.json({ content });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  generateResource
};
