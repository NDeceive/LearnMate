const express = require("express");
const {
  listKnowledgeMasteryItems,
  listWeakPointItems,
  getMyProfile,
  startProfileDialogue,
  postProfileDialogueMessage,
  confirmProfileDialogue,
  patchMyProfile,
  getProfileHistory,
  getLearningEvents
} = require("../controllers/profileController");

const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.get("/profile/me", getMyProfile);
router.patch("/profile/me", patchMyProfile);
router.get("/profile/history", getProfileHistory);
router.get("/profile/events", getLearningEvents);
router.post("/profile/dialogue/start", startProfileDialogue);
router.post("/profile/dialogue/message", postProfileDialogueMessage);
router.post("/profile/dialogue/confirm", confirmProfileDialogue);

router.get("/profile/knowledge-mastery", listKnowledgeMasteryItems);
router.get("/profile/weak-points", listWeakPointItems);

module.exports = router;
