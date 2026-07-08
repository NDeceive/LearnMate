const express = require("express");
const {
  listKnowledgeMasteryItems,
  listWeakPointItems
} = require("../controllers/profileController");

const router = express.Router();

router.get("/profile/knowledge-mastery", listKnowledgeMasteryItems);
router.get("/profile/weak-points", listWeakPointItems);

module.exports = router;
