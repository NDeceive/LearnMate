const express = require("express");
const { listOpenQuestionItems } = require("../controllers/openQuestionController");

const router = express.Router();

router.get("/open-questions", listOpenQuestionItems);

module.exports = router;
