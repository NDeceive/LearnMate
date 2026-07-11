const {
  createOrAdjustLearningPath,
  getCurrentLearningPath,
  listLearningPathVersions
} = require("../services/learningPathService");

async function getMyLearningPath(req, res) {
  try {
    const path = await getCurrentLearningPath(req.user.studentId);
    if (!path) return res.status(404).json({ error: "learning path not generated", code: "PATH_NOT_FOUND" });
    return res.json(path);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "failed to read learning path" });
  }
}

async function generateMyLearningPath(req, res) {
  try {
    const path = await createOrAdjustLearningPath({
      studentId: req.user.studentId,
      reason: "学生主动生成个性化学习路径",
      sourceType: "manual"
    });
    return res.json(path);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "failed to generate learning path" });
  }
}

async function getMyLearningPathVersions(req, res) {
  try {
    return res.json({ data: await listLearningPathVersions(req.user.studentId) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "failed to read learning path versions" });
  }
}

module.exports = { getMyLearningPath, generateMyLearningPath, getMyLearningPathVersions };
