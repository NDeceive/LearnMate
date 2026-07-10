const express = require("express");
const {
  listCodeExercises,
  getCodeExercise,
  runCode,
  explainCodeRun
} = require("../controllers/codeController");

const router = express.Router();

router.get("/exercises", listCodeExercises);
router.get("/exercises/:id", getCodeExercise);
router.post("/run", runCode);
router.post("/explain", explainCodeRun);

module.exports = router;
