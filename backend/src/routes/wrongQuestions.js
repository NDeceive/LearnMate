const express = require("express");
const {
  listWrongQuestionItems,
  patchWrongQuestionStatus
} = require("../controllers/wrongQuestionController");

const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/wrong-questions", listWrongQuestionItems);
router.patch("/wrong-questions/:id/status", patchWrongQuestionStatus);

module.exports = router;
