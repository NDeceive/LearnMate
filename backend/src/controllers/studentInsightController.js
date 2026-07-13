const { getStudentOverview, getStudentAssessment } = require("../services/studentInsightService");

async function overview(req, res) {
  return respond(res, () => getStudentOverview(req.user.studentId), "读取学生首页数据失败");
}

async function assessment(req, res) {
  return respond(res, () => getStudentAssessment(req.user.studentId), "读取学习评估报告失败");
}

async function respond(res, action, fallback) {
  try { return res.json(await action()); }
  catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: status >= 500 ? fallback : error.message });
  }
}

module.exports = { overview, assessment };
