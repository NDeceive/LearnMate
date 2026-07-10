const {
  runQuestionGeneration,
  runQuizHint
} = require("../services/agentOrchestrator");
const {
  listQuestions,
  toPublicQuestion,
  toFrontendQuestion,
  normalizeSubject,
  normalizeDifficulty
} = require("../services/questionBankService");
const { logAgentRun } = require("../services/agentLogService");
const { submitQuiz } = require("../services/quizSubmissionService");

async function generateQuestion(req, res, next) {
  try {
    const { domain, knowledgePoint, difficulty } = req.body || {};
    const subject = normalizeSubject(domain);
    const normalizedDifficulty = normalizeDifficulty(difficulty);

    try {
      const bankQuestions = await listQuestions({
        subject,
        knowledgePoint,
        difficulty: normalizedDifficulty,
        limit: 1
      });

      if (bankQuestions.length > 0) {
        const question = toFrontendQuestion(bankQuestions[0]);
        await logAgentRun({
          agentName: "QuizAgent",
          taskType: "quiz_generation",
          inputText: {
            domain,
            knowledgePoint,
            difficulty
          },
          outputText: question,
          status: "success",
          durationMs: 0,
          source: "question_bank"
        });

        return res.json({ question });
      }
    } catch (error) {
      console.error(`题库查询失败，/api/generate-question 将回退到 QuizAgent：${error.message}`);
    }

    const question = await runQuestionGeneration({
      domain,
      knowledgePoint,
      difficulty
    });

    return res.json({ question });
  } catch (error) {
    return next(error);
  }
}

async function generateQuizHint(req, res, next) {
  try {
    const { question, code, options } = req.body || {};
    const hint = await runQuizHint({ question, code, options });

    return res.json({ hint });
  } catch (error) {
    return next(error);
  }
}

async function listQuizQuestions(req, res) {
  try {
    const subject = req.query.subject;
    const knowledgePoint = req.query.knowledge_point || req.query.knowledgePoint;
    const difficulty = req.query.difficulty;
    const limit = req.query.limit;

    if (!subject) {
      return res.status(400).json({ error: "subject is required" });
    }

    const questions = await listQuestions({
      subject,
      knowledgePoint,
      difficulty,
      limit
    });

    return res.json({
      data: questions.map(toPublicQuestion)
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "查询题库失败"
    });
  }
}

async function submitQuizAnswer(req, res) {
  try {
    const { idempotencyKey, quizId, courseId, subject, answers, startedAt, submittedAt } = req.body || {};
    const result = await submitQuiz({
      studentId: req.user.studentId,
      idempotencyKey: idempotencyKey || quizId,
      courseId,
      subject,
      answers,
      startedAt,
      submittedAt
    });
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "提交测验失败" });
  }
}

module.exports = {
  generateQuestion,
  generateQuizHint,
  listQuizQuestions,
  submitQuizAnswer
};
