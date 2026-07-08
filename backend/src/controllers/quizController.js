const {
  runQuestionGeneration,
  runQuizHint,
  analyzeWrongQuestion
} = require("../services/agentOrchestrator");
const {
  listQuestions,
  getQuestionById,
  toPublicQuestion,
  toFrontendQuestion,
  normalizeSubject,
  normalizeDifficulty
} = require("../services/questionBankService");
const { updateMasteryAfterAnswer } = require("../services/profileService");
const { recordWrongQuestion } = require("../services/wrongQuestionService");
const { logAgentRun } = require("../services/agentLogService");

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
    const { question_id: questionId, selected_answer: selectedAnswer } = req.body || {};

    if (!questionId || !selectedAnswer) {
      return res.status(400).json({ error: "question_id and selected_answer are required" });
    }

    const question = await getQuestionById(questionId);
    if (!question) {
      return res.status(404).json({ error: "question_id not found" });
    }

    const normalizedSelectedAnswer = String(selectedAnswer).trim().toUpperCase();
    const correctAnswer = String(question.answer || "").trim().toUpperCase();
    const isCorrect = normalizedSelectedAnswer === correctAnswer;
    const studentId = getStudentId(req);

    const profileStartTime = Date.now();
    let masteryRecord = null;

    try {
      masteryRecord = await updateMasteryAfterAnswer({
        studentId,
        subject: question.subject,
        knowledgePoint: question.knowledge_point,
        isCorrect
      });

      await logAgentRun({
        agentName: "ProfileAgent",
        taskType: "profile_update",
        inputText: {
          studentId,
          subject: question.subject,
          knowledgePoint: question.knowledge_point,
          isCorrect
        },
        outputText: masteryRecord,
        status: "success",
        durationMs: Date.now() - profileStartTime,
        source: "profile"
      });
    } catch (error) {
      await logAgentRun({
        agentName: "ProfileAgent",
        taskType: "profile_update",
        inputText: {
          studentId,
          subject: question.subject,
          knowledgePoint: question.knowledge_point,
          isCorrect
        },
        outputText: error.message,
        status: "failed",
        durationMs: Date.now() - profileStartTime,
        source: "profile"
      });

      throw error;
    }

    let feedback = null;
    let wrongRecorded = false;

    if (!isCorrect) {
      feedback = await analyzeWrongQuestion({
        studentId,
        question,
        subject: question.subject,
        knowledgePoint: question.knowledge_point,
        difficulty: question.difficulty,
        questionText: question.stem,
        selectedAnswer: normalizedSelectedAnswer,
        correctAnswer,
        analysis: question.analysis,
        abilityDimension: question.ability_dimension
      });

      await recordWrongQuestion({
        studentId,
        question,
        selectedAnswer: normalizedSelectedAnswer,
        feedback
      });

      wrongRecorded = true;
    }

    const result = {
      is_correct: isCorrect,
      correct_answer: correctAnswer,
      analysis: question.analysis || "",
      knowledge_point: question.knowledge_point || "",
      ability_dimension: question.ability_dimension || "",
      wrongRecorded,
      masteryUpdated: true
    };

    if (feedback) {
      result.feedback = feedback;
    }

    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "提交答案失败"
    });
  }
}

function getStudentId(req) {
  return req.user && req.user.id ? req.user.id : 1;
}

module.exports = {
  generateQuestion,
  generateQuizHint,
  listQuizQuestions,
  submitQuizAnswer
};
