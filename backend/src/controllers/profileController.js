const {
  listKnowledgeMastery,
  getWeakPoints
} = require("../services/profileService");

async function listKnowledgeMasteryItems(req, res) {
  try {
    const data = await listKnowledgeMastery({
      studentId: getStudentId(req),
      subject: req.query.subject
    });

    return res.json({ data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "查询学习画像失败"
    });
  }
}

async function listWeakPointItems(req, res) {
  try {
    const data = await getWeakPoints({
      studentId: getStudentId(req),
      limit: req.query.limit
    });

    return res.json({ data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "查询薄弱知识点失败"
    });
  }
}

function getStudentId(req) {
  return req.user && req.user.id ? req.user.id : 1;
}

module.exports = {
  listKnowledgeMasteryItems,
  listWeakPointItems
};
