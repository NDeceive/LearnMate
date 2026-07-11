const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getMyLearningPath,
  generateMyLearningPath,
  getMyLearningPathVersions
} = require("../controllers/learningPathController");

const router = express.Router();
router.use(authMiddleware);
router.get("/path/me", getMyLearningPath);
router.post("/path/generate", generateMyLearningPath);
router.get("/path/versions", getMyLearningPathVersions);

module.exports = router;
