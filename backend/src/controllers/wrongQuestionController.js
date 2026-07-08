const {
  VALID_WRONG_QUESTION_STATUSES,
  listWrongQuestions,
  updateWrongQuestionStatus
} = require("../services/wrongQuestionService");

async function listWrongQuestionItems(req, res) {
  try {
    const { status, subject } = req.query || {};

    if (status && !VALID_WRONG_QUESTION_STATUSES.includes(status)) {
      return res.status(400).json({ error: "status must be 待复习 or 已掌握" });
    }

    const data = await listWrongQuestions({
      studentId: getStudentId(req),
      status,
      subject
    });

    return res.json({ data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "查询错题本失败"
    });
  }
}

async function patchWrongQuestionStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "valid wrong question id is required" });
    }

    if (!VALID_WRONG_QUESTION_STATUSES.includes(status)) {
      return res.status(400).json({ error: "status must be 待复习 or 已掌握" });
    }

    const updated = await updateWrongQuestionStatus({
      studentId: getStudentId(req),
      id,
      status
    });

    if (!updated) {
      return res.status(404).json({ error: "wrong question not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "更新错题状态失败"
    });
  }
}

function getStudentId(req) {
  return req.user && req.user.id ? req.user.id : 1;
}

module.exports = {
  listWrongQuestionItems,
  patchWrongQuestionStatus
};
