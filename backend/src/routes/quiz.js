const express = require("express");
const {
  generateQuestion,
  generateQuizHint,
  listQuizQuestions,
  submitQuizAnswer
} = require("../controllers/quizController");

const router = express.Router();

router.get("/quiz/questions", listQuizQuestions);
router.post("/quiz/submit", submitQuizAnswer);
router.post("/generate-question", generateQuestion);
router.post("/quiz-hint", generateQuizHint);

module.exports = router;
