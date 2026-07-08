const {
  listOpenQuestions,
  toPublicOpenQuestion
} = require("../services/openQuestionService");

async function listOpenQuestionItems(req, res) {
  const subject = req.query.subject;
  const knowledgePoint = req.query.knowledge_point || req.query.knowledgePoint;
  const difficulty = req.query.difficulty;
  const limit = req.query.limit;

  const questions = await listOpenQuestions({
    subject,
    knowledgePoint,
    difficulty,
    limit
  });

  return res.json({
    data: questions.map(toPublicOpenQuestion)
  });
}

module.exports = {
  listOpenQuestionItems
};
